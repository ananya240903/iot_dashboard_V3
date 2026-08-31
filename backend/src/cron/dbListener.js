const { query, pool } = require('../config/db');
const { getIo } = require('../socket');

let lastSeenDataId = null;
let isFetching = false;
let pendingFetch = false;

// Helper to fetch the latest data_id on startup
const initLastSeenDataId = async () => {
    try {
        const res = await query('SELECT MAX(data_id) as max_id FROM iotms.sensor_data');
        if (res.rows.length > 0 && res.rows[0].max_id) {
            lastSeenDataId = res.rows[0].max_id;
            console.log(`[DB Listener] Initialized with last_seen_data_id: ${lastSeenDataId}`);
        }
    } catch (err) {
        console.error('[DB Listener] Failed to initialize last_seen_data_id:', err.message);
    }
};

const pollForNewData = async () => {
    if (!lastSeenDataId) return;

    try {
        // Find if there's any new data
        const maxRes = await query('SELECT MAX(data_id) as max_id FROM iotms.sensor_data');
        const currentMaxId = maxRes.rows[0]?.max_id;

        if (currentMaxId && currentMaxId > lastSeenDataId) {
            console.log(`[DB Listener] New data detected. Fetching records from ${lastSeenDataId} to ${currentMaxId}`);

            // Re-using the logic from liveAlertsService to format the new rows properly
            const sql = `
WITH pre_filtered AS (
    SELECT 
        sd.data_id,
        sd.device_id,
        sd.reading_timestamp,
        sd.highest_severity,
        sd.payload,
        dm.device_type_id,
        dtm.device_type_name,
        dm.zone,
        dm.division,
        dm.next_txr_point,
        vm.vendor_name
    FROM iotms.sensor_data sd
    LEFT JOIN iotms.device_master dm ON sd.device_id = dm.device_id
    LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
    LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
    WHERE sd.has_alert = true
      AND sd.data_id > $1
      AND sd.data_id <= $2
),
unflattened_vehicles AS (
    SELECT 
        pf.*,
        v.v_item AS vehicle
    FROM pre_filtered pf
    LEFT JOIN LATERAL jsonb_path_query(
        COALESCE(pf.payload->'rsDetails', '[]'::jsonb) || COALESCE(pf.payload->'rollingStock', '[]'::jsonb),
        '$[*] ? (exists(@.vehicleCategory) || exists(@.axles[*].wheels[*] ? (@.hasAlert == true)) || exists(@.assemblies[*] ? (@.hasAlert == true)))'
    ) AS v(v_item) ON true
),
-- ADDED: Step 3.5 - recompute severity from THIS vehicle's own wheels/assemblies,
-- instead of reusing the record-level highest_severity across every exploded row.
-- SCOPED TO WILD ONLY: same reasoning as liveAlertsService.js. HABD and other
-- device types keep their original record-level highest_severity untouched.
vehicle_severity AS (
    SELECT
        uv.*,
        CASE
            WHEN uv.device_type_name = 'WILD' THEN
                COALESCE((
                    SELECT sub.status_label
                    FROM (
                        SELECT
                            CASE UPPER(TRIM(COALESCE(pos->>'status','')))
                                WHEN 'CRITICAL' THEN 3
                                WHEN 'BAD' THEN 2
                                WHEN 'MAINT' THEN 2
                                WHEN 'MAINTENANCE' THEN 2
                                WHEN 'GOOD' THEN 1
                                ELSE 0
                            END AS rank_weight,
                            CASE UPPER(TRIM(COALESCE(pos->>'status','')))
                                WHEN 'CRITICAL' THEN 'Critical'
                                WHEN 'BAD' THEN 'Maintenance'
                                WHEN 'MAINT' THEN 'Maintenance'
                                WHEN 'MAINTENANCE' THEN 'Maintenance'
                                WHEN 'GOOD' THEN 'Good'
                                ELSE 'UNKNOWN'
                            END AS status_label
                        FROM (
                            SELECT jsonb_array_elements(COALESCE(uv.vehicle->'assemblies', '[]'::jsonb)) AS pos
                            UNION ALL
                            SELECT jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) AS pos
                            FROM jsonb_array_elements(COALESCE(uv.vehicle->'axles', '[]'::jsonb)) AS axle
                        ) all_positions
                        WHERE (all_positions.pos->>'hasAlert')::boolean = true
                        ORDER BY rank_weight DESC
                        LIMIT 1
                    ) sub
                ), 'UNKNOWN')
            ELSE uv.highest_severity
        END AS vehicle_highest_severity
    FROM unflattened_vehicles uv
),
extracted_and_filtered AS (
    SELECT 
        uv.data_id,
        uv.device_id,
        uv.reading_timestamp,
        uv.vehicle_highest_severity AS highest_severity,
        uv.device_type_id,
        uv.device_type_name,
        uv.zone,
        uv.division,
        uv.next_txr_point,
        uv.vendor_name,
        COALESCE(
            NULLIF(uv.vehicle->>'vehicleNo', ''),
            NULLIF(uv.vehicle->>'rsNo', ''),
            NULLIF(uv.vehicle->>'no', '')
        ) AS vehicleNo,
        COALESCE(
            NULLIF(uv.vehicle->>'vehicleCategory', ''), 
            NULLIF(uv.vehicle->>'category', ''),
            NULLIF(uv.payload->'trainInfo'->>'trainName', ''),
            'UNKNOWN'
        ) AS category,
        CASE 
            WHEN uv.vehicle IS NULL THEN '["Data wrong"]'::jsonb
            WHEN uv.vehicle ? 'vehicleNo' THEN
                jsonb_build_array(COALESCE(to_jsonb((uv.vehicle->>'vehicleSide') || COALESCE(uv.vehicle->>'vehicleAxleNumber', '')), uv.vehicle->'position', 'null'::jsonb))
            ELSE
                (
                    SELECT COALESCE(jsonb_agg(COALESCE(pos->'position', 'null'::jsonb)), '[]'::jsonb)
                    FROM (
                        SELECT jsonb_array_elements(COALESCE(uv.vehicle->'assemblies', '[]'::jsonb)) AS pos
                        UNION ALL
                        SELECT jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) AS pos
                        FROM jsonb_array_elements(COALESCE(uv.vehicle->'axles', '[]'::jsonb)) AS axle
                    ) sub
                    WHERE sub.pos->'hasAlert' = 'true'::jsonb
                )
        END AS positions,
        CASE 
            WHEN uv.vehicle IS NULL THEN '[]'::jsonb
            WHEN uv.vehicle ? 'vehicleNo' THEN
                jsonb_build_array(
                    COALESCE(
                        uv.vehicle->'deviceData',
                        NULLIF(
                            jsonb_strip_nulls(
                                jsonb_build_object(
                                    'wildWheelImpactDynamicKiloNewtons', uv.vehicle->'wildWheelImpactDynamicKiloNewtons',
                                    'wildWheelImpactRatio', uv.vehicle->'wildWheelImpactRatio',
                                    'wildWheelWeightTonnes', uv.vehicle->'wildWheelWeightTonnes',
                                    'wildPeakWheelImpactKiloNewtons', uv.vehicle->'wildPeakWheelImpactKiloNewtons',
                                    'railBamBearingFaultCode', uv.vehicle->'railBamBearingFaultCode'
                                )
                            ),
                            '{}'::jsonb
                        ),
                        'null'::jsonb
                    )
                )
            ELSE
                (
                    SELECT COALESCE(jsonb_agg(COALESCE(pos->'deviceData', 'null'::jsonb)), '[]'::jsonb)
                    FROM (
                        SELECT jsonb_array_elements(COALESCE(uv.vehicle->'assemblies', '[]'::jsonb)) AS pos
                        UNION ALL
                        SELECT jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) AS pos
                        FROM jsonb_array_elements(COALESCE(uv.vehicle->'axles', '[]'::jsonb)) AS axle
                    ) sub
                    WHERE sub.pos->'hasAlert' = 'true'::jsonb
                )
        END AS device_data
    FROM vehicle_severity uv
)
SELECT 
    data_id,
    device_id,
    reading_timestamp,
    COALESCE(NULLIF(vehicleNo, ''), 'NIL') AS "vehicleNo",
    category,
    highest_severity,
    positions,
    device_data,
    device_type_id,
    device_type_name,
    zone,
    division,
    next_txr_point,
    vendor_name
FROM extracted_and_filtered
WHERE positions <> '[]'::jsonb
ORDER BY reading_timestamp DESC;
            `;

            const result = await query(sql, [lastSeenDataId, currentMaxId]);
            lastSeenDataId = currentMaxId;

            if (result.rows.length > 0) {
                console.log(`[DB Listener] Emitting ${result.rows.length} new alerts via WebSocket.`);
                const io = getIo();
                io.emit('new_alerts', result.rows);
            }
        }
    } catch (err) {
        console.error('[DB Listener] Error polling for new data:', err.message);
    }
};

const handleNotification = async () => {
    if (isFetching) {
        pendingFetch = true;
        return;
    }

    isFetching = true;
    try {
        await pollForNewData();
    } finally {
        isFetching = false;
        if (pendingFetch) {
            pendingFetch = false;
            handleNotification();
        }
    }
};

const initDbListener = async () => {
    await initLastSeenDataId();

    try {
        const client = await pool.connect();

        client.on('notification', (msg) => {
            if (msg.channel === 'new_sensor_data') {
                handleNotification();
            }
        });

        await client.query('LISTEN new_sensor_data');
        console.log('[DB Listener] Postgres LISTEN/NOTIFY started on channel "new_sensor_data".');

        client.on('error', (err) => {
            console.error('[DB Listener] Dedicated PG client error:', err.message);
        });

    } catch (err) {
        console.error('[DB Listener] Error setting up LISTEN/NOTIFY:', err.message);
    }
};

module.exports = { initDbListener };