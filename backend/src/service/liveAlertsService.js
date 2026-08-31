const { query, pool } = require('../config/db');
const EventEmitter = require('events');
const QueryStream = require('pg-query-stream');

const getLiveAlerts = async (sinceTimestamp, beforeTimestamp, deviceTypes = null, limit = 1000, sortDirection = 'desc', afterTimestamp = null, sites = null, vendors = null, severity = null) => {
    const filterTimestamp = sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null;
    const beforeFilter = beforeTimestamp ? new Date(beforeTimestamp).toISOString() : null;
    const afterFilter = afterTimestamp ? new Date(afterTimestamp).toISOString() : null;

    const sql = `
WITH pre_filtered AS (
    -- Step 1 & 2: Filter recent documents with active alerts and join master tables
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
        dm.site,
        dm.next_txr_point,
        vm.vendor_name
    FROM iotms.sensor_data sd
    LEFT JOIN iotms.device_master dm 
        ON sd.device_id = dm.device_id
    LEFT JOIN iotms.device_type_master dtm 
        ON dm.device_type_id = dtm.device_type_id
    LEFT JOIN iotms.vendor_master vm
        ON dm.vendor_id = vm.vendor_id
    WHERE sd.has_alert = true
      AND sd.reading_timestamp >= COALESCE($1::timestamp, CURRENT_TIMESTAMP - INTERVAL '60 days')
      AND ($2::timestamp IS NULL OR sd.reading_timestamp <= $2::timestamp)
      AND ($5::timestamp IS NULL OR sd.reading_timestamp >= $5::timestamp)
      AND ($3::text[] IS NULL OR dtm.device_type_name = ANY($3::text[]))
      AND ($6::text[] IS NULL OR dm.site = ANY($6::text[]))
      AND ($7::text[] IS NULL OR vm.vendor_name = ANY($7::text[]))
      -- Severity filter moved to the final SELECT — it now needs the
      -- per-vehicle recomputed severity, which doesn't exist until after
      -- the JSONB explosion below.
),

unflattened_vehicles AS (
    -- Step 3: Extract and merge 'rsDetails' and 'rollingStock' arrays into one row per vehicle
    SELECT 
        pf.*,
        v.v_item AS vehicle
    FROM pre_filtered pf
    LEFT JOIN LATERAL jsonb_path_query(
        COALESCE(pf.payload->'rsDetails', '[]'::jsonb) || COALESCE(pf.payload->'rollingStock', '[]'::jsonb),
        '$[*] ? (exists(@.vehicleCategory) || exists(@.axles[*].wheels[*] ? (@.hasAlert == true)) || exists(@.assemblies[*] ? (@.hasAlert == true)))'
    ) AS v(v_item) ON true
),

-- ADDED: Step 3.5 - Recompute severity from THIS vehicle's own wheels/assemblies,
-- instead of reusing the record-level highest_severity across every exploded row.
-- SCOPED TO WILD ONLY: only WILD's status vocabulary (Critical/Maint/Good) has
-- been verified. HABD and other device types keep their original record-level
-- highest_severity untouched until their own status vocabulary is confirmed.
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
            ELSE uv.highest_severity -- non-WILD: unchanged, original record-level behavior
        END AS vehicle_highest_severity
    FROM unflattened_vehicles uv
),

extracted_and_filtered AS (
    -- Step 4: Extract identifiers and STRICTLY replicate Mongo's array logic
    SELECT 
        uv.data_id,
        uv.device_id,
        uv.reading_timestamp,
        uv.vehicle_highest_severity AS highest_severity,
        uv.device_type_id,
        uv.device_type_name,
        uv.zone,
        uv.division,
        uv.site,
        uv.next_txr_point,
        uv.vendor_name,
        
        -- UPDATED: Determine Vehicle Number with NULLIF to handle empty strings in overlapping fields
        COALESCE(
            NULLIF(uv.vehicle->>'vehicleNo', ''),
            NULLIF(uv.vehicle->>'rsNo', ''),
            NULLIF(uv.vehicle->>'no', '')
        ) AS vehicleNo,
        
        -- Category
        COALESCE(
            NULLIF(uv.vehicle->>'vehicleCategory', ''), 
            NULLIF(uv.vehicle->>'category', ''),
            NULLIF(uv.payload->'trainInfo'->>'trainName', ''),
            'UNKNOWN'
        ) AS category,
        
        -- Process raw positions replicating Mongo's $type check
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
        
        -- Process raw deviceData replicating Mongo's logic
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

-- Step 5 & 6: Final projection and matching non-empty
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
    site,
    next_txr_point,
    vendor_name
FROM extracted_and_filtered
WHERE positions <> '[]'::jsonb
  AND ($8::text[] IS NULL OR LOWER(highest_severity) = ANY($8::text[]))
ORDER BY reading_timestamp ${sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
LIMIT $4;
    `;

    try {
        const result = await query(sql, [filterTimestamp, beforeFilter, deviceTypes, limit, afterFilter, sites, vendors, severity]);
        return result.rows;
    } catch (error) {
        console.error("Error in getLiveAlerts SQL query:", error);
        throw error;
    }
};

const streamLiveAlerts = (sinceTimestamp, batchSize = 100) => {
    const emitter = new EventEmitter();
    const filterTimestamp = sinceTimestamp ? new Date(sinceTimestamp).toISOString() : null;

    // We reuse the exact same SQL logic from getLiveAlerts
    const sql = `
WITH pre_filtered AS (
    SELECT 
        sd.data_id, sd.device_id, sd.reading_timestamp, sd.highest_severity, sd.payload,
        dm.device_type_id, dtm.device_type_name, dm.zone, dm.division, dm.site, dm.next_txr_point, vm.vendor_name
    FROM iotms.sensor_data sd
    LEFT JOIN iotms.device_master dm ON sd.device_id = dm.device_id
    LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
    LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
    WHERE sd.has_alert = true
      AND sd.reading_timestamp > COALESCE($1::timestamp, CURRENT_TIMESTAMP - INTERVAL '60 days')
),
unflattened_vehicles AS (
    SELECT pf.*, v.v_item AS vehicle
    FROM pre_filtered pf
    LEFT JOIN LATERAL jsonb_path_query(
        COALESCE(pf.payload->'rsDetails', '[]'::jsonb) || COALESCE(pf.payload->'rollingStock', '[]'::jsonb),
        '$[*] ? (exists(@.vehicleCategory) || exists(@.axles[*].wheels[*] ? (@.hasAlert == true)) || exists(@.assemblies[*] ? (@.hasAlert == true)))'
    ) AS v(v_item) ON true
),
-- ADDED: Step 3.5 - same per-vehicle severity recompute as getLiveAlerts, WILD only
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
    SELECT uv.data_id, uv.device_id, uv.reading_timestamp,
        uv.vehicle_highest_severity AS highest_severity,
        uv.device_type_id,
        uv.device_type_name, uv.zone, uv.division, uv.site, uv.next_txr_point, uv.vendor_name,
        COALESCE(NULLIF(uv.vehicle->>'vehicleNo', ''), NULLIF(uv.vehicle->>'rsNo', ''), NULLIF(uv.vehicle->>'no', '')) AS vehicleNo,
        COALESCE(NULLIF(uv.vehicle->>'vehicleCategory', ''), NULLIF(uv.vehicle->>'category', ''), NULLIF(uv.payload->'trainInfo'->>'trainName', ''), 'UNKNOWN') AS category,
        CASE 
            WHEN uv.vehicle IS NULL THEN '["Data wrong"]'::jsonb
            WHEN uv.vehicle ? 'vehicleNo' THEN jsonb_build_array(COALESCE(to_jsonb((uv.vehicle->>'vehicleSide') || COALESCE(uv.vehicle->>'vehicleAxleNumber', '')), uv.vehicle->'position', 'null'::jsonb))
            ELSE (
                SELECT COALESCE(jsonb_agg(COALESCE(pos->'position', 'null'::jsonb)), '[]'::jsonb)
                FROM (
                    SELECT jsonb_array_elements(COALESCE(uv.vehicle->'assemblies', '[]'::jsonb)) AS pos
                    UNION ALL
                    SELECT jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) AS pos
                    FROM jsonb_array_elements(COALESCE(uv.vehicle->'axles', '[]'::jsonb)) AS axle
                ) sub WHERE sub.pos->'hasAlert' = 'true'::jsonb
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
            ELSE (
                SELECT COALESCE(jsonb_agg(COALESCE(pos->'deviceData', 'null'::jsonb)), '[]'::jsonb)
                FROM (
                    SELECT jsonb_array_elements(COALESCE(uv.vehicle->'assemblies', '[]'::jsonb)) AS pos
                    UNION ALL
                    SELECT jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) AS pos
                    FROM jsonb_array_elements(COALESCE(uv.vehicle->'axles', '[]'::jsonb)) AS axle
                ) sub WHERE sub.pos->'hasAlert' = 'true'::jsonb
            )
        END AS device_data
    FROM vehicle_severity uv
)
SELECT 
    data_id, device_id, reading_timestamp, COALESCE(NULLIF(vehicleNo, ''), 'NIL') AS "vehicleNo", category, highest_severity, positions, device_data,
    device_type_id, device_type_name, zone, division, site, next_txr_point, vendor_name
FROM extracted_and_filtered
WHERE positions <> '[]'::jsonb;
    `;

    pool.connect((err, client, release) => {
        if (err) {
            emitter.emit('error', err);
            return;
        }

        const query = new QueryStream(sql, [filterTimestamp], { batchSize });
        const stream = client.query(query);

        stream.on('data', (row) => {
            emitter.emit('data', row);
        });

        stream.on('error', (error) => {
            release();
            emitter.emit('error', error);
        });

        stream.on('end', () => {
            release();
            emitter.emit('end');
        });
    });

    return emitter;
};

const getAllDeviceTypes = async () => {
    const sql = `SELECT DISTINCT device_type_name FROM iotms.device_type_master WHERE device_type_name IS NOT NULL ORDER BY device_type_name ASC`;
    try {
        const result = await query(sql);
        return result.rows.map(row => row.device_type_name);
    } catch (error) {
        console.error("Error fetching device types:", error);
        throw error;
    }
};

const getAllSites = async () => {
    const sql = `SELECT DISTINCT site FROM iotms.device_master WHERE site IS NOT NULL ORDER BY site ASC`;
    try {
        const result = await query(sql);
        return result.rows.map(row => row.site);
    } catch (error) {
        console.error("Error fetching sites:", error);
        throw error;
    }
};

const getAllVendors = async () => {
    const sql = `SELECT DISTINCT vendor_name FROM iotms.vendor_master WHERE vendor_name IS NOT NULL ORDER BY vendor_name ASC`;
    try {
        const result = await query(sql);
        return result.rows.map(row => row.vendor_name);
    } catch (error) {
        console.error("Error fetching vendors:", error);
        throw error;
    }
};

const getAllSeverities = async () => {
    const sql = `SELECT DISTINCT INITCAP(LOWER(TRIM(highest_severity))) AS highest_severity
FROM iotms.sensor_data 
WHERE highest_severity IS NOT NULL AND has_alert = true 
ORDER BY 1 ASC`;
    try {
        const result = await query(sql);
        return result.rows.map(row => row.highest_severity);
    } catch (error) {
        console.error("Error fetching severities:", error);
        throw error;
    }
};

module.exports = {
    getLiveAlerts,
    streamLiveAlerts,
    getAllDeviceTypes,
    getAllSites,
    getAllVendors,
    getAllSeverities
};