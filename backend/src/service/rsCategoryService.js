const { query } = require('../config/db');

async function getAlertsByCategory() {
    try {
        const sql = `
SELECT 
    CASE 
        WHEN UPPER(raw_category) IN ('C', 'COACH') THEN 'COACH'
        WHEN UPPER(raw_category) IN ('L', 'LOCO', 'LOCOMOTIVES') THEN 'LOCO'
        WHEN UPPER(raw_category) IN ('F', 'W', 'WAGON', 'WAGONS') THEN 'WAGON'
        WHEN UPPER(raw_category) IN ('', 'UNKNOWN') OR raw_category IS NULL THEN 'UNKNOWN'
        ELSE UPPER(raw_category)
    END AS category,
    SUM(
        CASE 
            WHEN is_flat_alert THEN 1 
            ELSE (coalesce(wheel_alerts, 0) + coalesce(assembly_alerts, 0))
        END
    )::integer AS "totalAlerts"
FROM (
    SELECT 
        COALESCE(item->>'category', item->>'vehicleCategory') AS raw_category,
        (item->>'vehicleCategory' IS NOT NULL) AS is_flat_alert,
        
        -- High performance JSON extraction for alert counts instead of nested SELECT COUNTs
        coalesce(jsonb_array_length(jsonb_path_query_array(item, '$.axles[*].wheels[*] ? (@.hasAlert == true)')), 0) AS wheel_alerts,
        coalesce(jsonb_array_length(jsonb_path_query_array(item, '$.assemblies[*] ? (@.hasAlert == true)')), 0) AS assembly_alerts
    FROM iotms.sensor_data,
    LATERAL jsonb_path_query(
        COALESCE(payload->'rsDetails', '[]'::jsonb) || COALESCE(payload->'rollingStock', '[]'::jsonb),
        '$[*] ? (exists(@.vehicleCategory) || exists(@.axles[*].wheels[*] ? (@.hasAlert == true)) || exists(@.assemblies[*] ? (@.hasAlert == true)))'
    ) AS item
    WHERE has_alert = true
      -- Force index scan usage via GIN operators if applicable
      AND (payload @> '{"alertSummary": {"hasAlert": true}}' OR payload ? 'rsDetails' OR payload ? 'rollingStock')
) final_metrics
WHERE is_flat_alert = true OR wheel_alerts > 0 OR assembly_alerts > 0
GROUP BY 1;
        `;
        const result = await query(sql);
        return result.rows;
    } catch (error) {
        console.error("Error in getAlertsByCategory SQL query:", error);
        throw error;
    }
}

async function getRepeatedAlertsByCategory() {
    try {
        const sql = `
WITH items AS (
    SELECT
        sd.data_id,
        item,
        UPPER(COALESCE(item->>'category', item->>'vehicleCategory', 'UNKNOWN')) AS cat,
        COALESCE(
            NULLIF(item->>'rsNo', ''),
            NULLIF(item->>'no', ''),
            NULLIF(item->>'vehicleNo', '')
        ) AS rs_no
    FROM iotms.sensor_data sd
    CROSS JOIN LATERAL jsonb_path_query(
        COALESCE(sd.payload->'rsDetails', '[]'::jsonb) || COALESCE(sd.payload->'rollingStock', '[]'::jsonb),
        '$[*] ? (exists(@.vehicleCategory) || exists(@.axles[*].wheels[*] ? (@.hasAlert == true)) || exists(@.assemblies[*] ? (@.hasAlert == true)))'
    ) AS arr(item)
    WHERE sd.has_alert = true  -- Filter early
      AND (sd.payload @> '{"alertSummary": {"hasAlert": true}}' OR sd.payload ? 'rsDetails' OR sd.payload ? 'rollingStock')
),
filtered_items AS (
    SELECT 
        data_id,
        item,
        rs_no,
        CASE
            WHEN cat IN ('C','COACH') THEN 'COACH'
            WHEN cat IN ('L','LOCO','LOCOMOTIVES') THEN 'LOCO'
            WHEN cat IN ('F','W','WAGON','WAGONS') THEN 'WAGON'
            WHEN cat IN ('','UNKNOWN') THEN 'UNKNOWN'
            ELSE cat
        END AS category
    FROM items
    -- Fail-fast approach: Filter invalid vehicle numbers BEFORE executing heavy lateral joins
    WHERE rs_no IS NOT NULL 
      AND UPPER(rs_no) NOT IN ('', 'NULL', 'NIL', 'NA', 'UNDEFINED')
),
expanded AS (
    SELECT
        f.data_id,
        f.category,
        f.rs_no,
        p.position
    FROM filtered_items f
    CROSS JOIN LATERAL (
        ----------------------------------------------------------------
        -- Flat Alert
        ----------------------------------------------------------------
        SELECT (f.item->>'vehicleSide') || COALESCE(f.item->>'vehicleAxleNumber', '') AS position
        WHERE f.item ? 'vehicleNo'

        UNION ALL

        ----------------------------------------------------------------
        -- Wheel Alerts
        ----------------------------------------------------------------
        SELECT wheel->>'position'
        FROM jsonb_array_elements(COALESCE(f.item->'axles', '[]'::jsonb)) axle
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) wheel
        WHERE (wheel->>'hasAlert')::boolean = true

        UNION ALL

        ----------------------------------------------------------------
        -- Assembly Alerts
        ----------------------------------------------------------------
        SELECT asm->>'position'
        FROM jsonb_array_elements(COALESCE(f.item->'assemblies', '[]'::jsonb)) asm
        WHERE (asm->>'hasAlert')::boolean = true
    ) p
),
repeated AS (
    SELECT
        category,
        rs_no,
        position,
        COUNT(*)::integer AS times,
        ARRAY_AGG(data_id ORDER BY data_id) AS data_id
    FROM expanded
    GROUP BY category, rs_no, position
    HAVING COUNT(*) >= 1
)
SELECT
    category,
    COUNT(*)::integer AS total_count,
    jsonb_agg(
        jsonb_build_object(
            'rsNo', rs_no,
            'position', position,
            'times', times,
            'data_id', data_id
        )
        ORDER BY rs_no
    ) AS "repeated_Alerts"
FROM repeated
GROUP BY category
ORDER BY category;
        `;
        const result = await query(sql);
        return result.rows;
    } catch (error) {
        console.error("Error in getRepeatedAlertsByCategory SQL query:", error);
        throw error;
    }
}

async function searchAlertsByRsNo(searchRsNo) {
    try {
        const searchRsNoStr = String(searchRsNo);

        const sql = `
WITH target_vehicles AS (
    -- Step 1: Find the target vehicle (no has_alert filter)
    SELECT
        data_id,
        v.value AS vehicle
    FROM iotms.sensor_data,
    LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(payload->'rsDetails') = 'array'
                THEN payload->'rsDetails'
            ELSE '[]'::jsonb
        END ||
        CASE
            WHEN jsonb_typeof(payload->'rollingStock') = 'array'
                THEN payload->'rollingStock'
            ELSE '[]'::jsonb
        END
    ) AS v(value)
    WHERE extract_vehicle_numbers(payload) @> ARRAY[$1]::text[]
      AND (
            v.value->>'rsNo' = $1
         OR v.value->>'no' = $1
         OR v.value->>'vehicleNo' = $1
      )
),

extracted_components AS (
    -- Step 2: Extract components and normalize category
    SELECT
        data_id,

        CASE
            WHEN UPPER(COALESCE(vehicle->>'category', vehicle->>'vehicleCategory', ''))
                 IN ('C', 'COACH')
                THEN 'COACH'

            WHEN UPPER(COALESCE(vehicle->>'category', vehicle->>'vehicleCategory', ''))
                 IN ('L', 'LOCO', 'LOCOMOTIVES')
                THEN 'LOCO'

            WHEN UPPER(COALESCE(vehicle->>'category', vehicle->>'vehicleCategory', ''))
                 IN ('F', 'W', 'WAGON', 'WAGONS')
                THEN 'WAGON'

            ELSE 'UNKNOWN'
        END AS category,

        comp AS component

    FROM target_vehicles,

    LATERAL (

        -- Schema with axles -> wheels
        SELECT wheels.value AS comp
        FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(vehicle->'axles') = 'array'
                        THEN vehicle->'axles'
                    ELSE '[]'::jsonb
                END
             ) AS axles(value),
             jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(axles.value->'wheels') = 'array'
                        THEN axles.value->'wheels'
                    ELSE '[]'::jsonb
                END
             ) AS wheels(value)

        UNION ALL

        -- Schema with assemblies
        SELECT assemblies.value AS comp
        FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(vehicle->'assemblies') = 'array'
                        THEN vehicle->'assemblies'
                    ELSE '[]'::jsonb
                END
             ) AS assemblies(value)

        UNION ALL

        -- Legacy / WILD schema
        SELECT jsonb_build_object(
            'hasAlert', true,
            'position', COALESCE(
                vehicle->>'position',
                (vehicle->>'vehicleSide') || COALESCE(vehicle->>'vehicleAxleNumber', '')
            )
        ) AS comp
        WHERE vehicle ? 'vehicleNo'

    ) sub
),

all_components AS (
    -- Keep only valid positions: L, R, L1-L8, R1-R8
    SELECT
        data_id,
        category,
        component->>'position' AS position,
        COALESCE((component->>'hasAlert')::boolean, false) AS has_alert
    FROM extracted_components
    WHERE component->>'position' ~ '^[LR]([1-8])?$'
),

grouped_components AS (
    SELECT
        position,
        category,
        has_alert,
        COUNT(*) AS component_count,
        array_agg(DISTINCT data_id ORDER BY data_id) AS data_ids
    FROM all_components
    GROUP BY position, category, has_alert
)

SELECT
    $1 AS vehicle_number,

    (SELECT COUNT(*) FROM all_components) AS total_components,

    (SELECT COUNT(*) FROM all_components WHERE has_alert = true)
        AS total_has_alert_true,

    (SELECT COUNT(*) FROM all_components WHERE has_alert = false)
        AS total_has_alert_false,

    COALESCE(
        json_agg(
            json_build_object(
                'position', position,
                'category', category,
                'hasAlert', has_alert,
                'count', component_count,
                'data_ids', data_ids
            )
            ORDER BY
                category,
                CASE
                    WHEN position = 'L' THEN 0
                    WHEN position LIKE 'L%' THEN 1
                    WHEN position = 'R' THEN 2
                    WHEN position LIKE 'R%' THEN 3
                    ELSE 4
                END,
                COALESCE(NULLIF(SUBSTRING(position FROM 2), '')::INT, 0),
                has_alert DESC
        ),
        '[]'::json
    ) AS components,

    (
        SELECT array_agg(DISTINCT data_id ORDER BY data_id)
        FROM all_components
    ) AS all_data_ids

FROM grouped_components;
        `;

        const result = await query(sql, [searchRsNoStr]);
        return result.rows;
    } catch (error) {
        console.error("Error in searchAlertsByRsNo SQL query:", error);
        throw error;
    }
}

module.exports = {
    getAlertsByCategory,
    getRepeatedAlertsByCategory,
    searchAlertsByRsNo
};
