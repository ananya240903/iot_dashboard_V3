const { query } = require('../config/db');

async function deviceData() {
    try {
        const sql = `
WITH DeviceBase AS (
    SELECT
        dm.zone,
        dm.device_type_id,
        dtm.device_type_name,
        dm.device_id,
        dm.calibrated_on,
        dm.next_calibration_due,
        dm.site,
        vm.vendor_name,
        CASE
            WHEN dds.last_data_timestamp IS NOT NULL
             AND dds.last_data_timestamp >= (NOW() - INTERVAL '48 hours')
            THEN 'live'
            ELSE 'offline'
        END AS status,
        COALESCE(
            (SELECT COUNT(*)::integer 
             FROM iotms.sensor_data sa 
             WHERE sa.device_id = dm.device_id AND sa.has_alert = true), 
            0
        ) AS "trueAlertCount",
        COALESCE(
            (SELECT COUNT(*)::integer 
             FROM iotms.sensor_data sa 
             WHERE sa.device_id = dm.device_id AND sa.has_alert = true AND sa.highest_severity ILIKE '%Maintenance%'), 
            0
        ) AS "maintenanceCount",
        COALESCE(
            (SELECT COUNT(*)::integer 
             FROM iotms.sensor_data sa 
             WHERE sa.device_id = dm.device_id AND sa.has_alert = true AND sa.highest_severity ILIKE '%Critical%'), 
            0
        ) AS "criticalCount",
        COALESCE(
            (SELECT COUNT(*)::integer 
             FROM iotms.sensor_data sa 
             WHERE sa.device_id = dm.device_id AND sa.has_alert = true AND (sa.highest_severity NOT ILIKE '%Maintenance%' AND sa.highest_severity NOT ILIKE '%Critical%' OR sa.highest_severity IS NULL)), 
            0
        ) AS "otherCount"
    FROM iotms.device_master dm
    LEFT JOIN iotms.device_type_master dtm 
        ON dm.device_type_id = dtm.device_type_id
    LEFT JOIN iotms.device_data_status dds 
        ON dm.device_id = dds.device_id
    LEFT JOIN iotms.vendor_master vm
        ON dm.vendor_id = vm.vendor_id
),
DeviceTypeGroup AS (
    -- OPTIMIZATION 2: JSONB performance improvement
    -- jsonb_agg and jsonb_build_object are faster and use less memory than json_agg
    SELECT
        zone,
        device_type_id,
        device_type_name,
        jsonb_agg(
            jsonb_build_object(
                'device_id', device_id,
                'vendor_name', vendor_name,
                'site', site,
                'calibrated_on', calibrated_on,
                'next_calibration_due', next_calibration_due,
                'status', status,
                'trueAlertCount', "trueAlertCount",
                'maintenanceCount', "maintenanceCount",
                'criticalCount', "criticalCount",
                'otherCount', "otherCount"
            )
        ) AS devices
    FROM DeviceBase
    GROUP BY zone, device_type_id, device_type_name
)
SELECT
    zone,
    jsonb_agg(
        jsonb_build_object(
            'device_type_id', device_type_id,
            'device_type_name', device_type_name,
            'devices', devices
        )
    ) AS device_types
FROM DeviceTypeGroup
GROUP BY zone;
        `;
        const result = await query(sql);
        return result.rows;
    } catch (error) {
        console.log("Error in fetching the device wise information ", error);
        throw error;
    }
}

async function getDeviceDataById(dataId) {
    try {
        const sql = `SELECT * FROM iotms.sensor_data WHERE data_id = $1`;
        const result = await query(sql, [String(dataId)]);
        return result.rows[0] || null;
    } catch (error) {
        console.log("Error in fetching device data by ID", error);
        throw error;
    }
}

function buildSensorDataByDeviceIdQuery(deviceId, before_timestamp, limit, has_alert, since_timestamp) {
    let sql = `SELECT data_id, device_id, reading_timestamp, has_alert, highest_severity, alert_count FROM iotms.sensor_data WHERE device_id = $1`;
    const values = [String(deviceId)];
    let paramIndex = 2;
    
    if (has_alert !== undefined && has_alert !== null && has_alert !== '') {
        sql += ` AND has_alert = $${paramIndex++}`;
        values.push(has_alert === 'true' || has_alert === true);
    }

    if (since_timestamp) {
        sql += ` AND reading_timestamp >= $${paramIndex++}`;
        values.push(since_timestamp);
    }

    if (before_timestamp) {
        sql += ` AND reading_timestamp < $${paramIndex++}`;
        values.push(before_timestamp);
    }
    sql += ` ORDER BY reading_timestamp DESC`;
    if (limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(parseInt(limit));
    }
    return { sql, values };
}

async function getSensorDataByDeviceId(deviceId, before_timestamp, limit, has_alert, since_timestamp) {
    try {
        const { sql, values } = buildSensorDataByDeviceIdQuery(deviceId, before_timestamp, limit, has_alert, since_timestamp);
        const result = await query(sql, values);
        return result.rows;
    } catch (error) {
        console.log("Error in fetching sensor data by device ID", error);
        throw error;
    }
}


async function getDeviceDataBulkByIds(dataIds, rsNo, position) {
    try {
        const sql = `
            SELECT 
                sd.data_id,
                sd.reading_timestamp,
                sd.device_id,
                vm.vendor_name,
                dtm.device_type_name,
                dm.site,
                dm.station_code,
                dm.section,
                
                -- 1. Extract Wheel Data
                (SELECT jsonb_agg(wheel) 
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rsDetails', '[]'::jsonb) || COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 LEFT JOIN jsonb_array_elements(COALESCE(rs->'axles', '[]'::jsonb)) axle ON true
                 LEFT JOIN jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) wheel ON true
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND wheel->>'position' = $2
                ) as wheels_data,

                -- 2. Extract Assembly Data
                (SELECT jsonb_agg(asm)
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rsDetails', '[]'::jsonb) || COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 LEFT JOIN jsonb_array_elements(COALESCE(rs->'assemblies', '[]'::jsonb)) asm ON true
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND asm->>'position' = $2
                ) as assemblies_data,

                -- 3. Extract WILD & RailBAM Data
                (SELECT jsonb_agg(jsonb_build_object(
                    'position', ((rs->>'vehicleSide') || (rs->>'vehicleAxleNumber')),
                    
                    'deviceData', jsonb_strip_nulls(jsonb_build_object(
                        'wildWheelImpactRatio', rs->>'wildWheelImpactRatio',
                        'wildWheelWeightTonnes', rs->>'wildWheelWeightTonnes',
                        'wildPeakWheelImpactKiloNewtons', rs->>'wildPeakWheelImpactKiloNewtons',
                        'wildWheelImpactDynamicKiloNewtons', rs->>'wildWheelImpactDynamicKiloNewtons',
                        'railBamBearingFaultCode', rs->>'railBamBearingFaultCode'
                    )),
                    
                    'status', jsonb_strip_nulls(jsonb_build_object(
                        'wildPeakWheelImpactAlertLevelKey', rs->>'wildPeakWheelImpactAlertLevelKey',
                        'wildPeakWheelImpactRatioAlertLevelKey', rs->>'wildPeakWheelImpactRatioAlertLevelKey',
                        'railBamBearingAlertLevelKey', rs->>'railBamBearingAlertLevelKey'
                    ))
                 ))
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND ((rs->>'vehicleSide') || (rs->>'vehicleAxleNumber')) = $2
                ) as wild_data

            FROM iotms.sensor_data sd
            LEFT JOIN iotms.device_master dm ON sd.device_id = dm.device_id
            LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
            LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
            WHERE sd.data_id = ANY($3)
        `;
        const result = await query(sql, [rsNo || '', position || '', dataIds.map(String)]);

        const formattedResults = result.rows.map(row => {
            let formattedWheel = null;

            if (row.wheels_data && row.wheels_data.length > 0 && row.wheels_data[0]) {
                formattedWheel = { ...row.wheels_data[0] };
            } else if (row.assemblies_data && row.assemblies_data.length > 0 && row.assemblies_data[0]) {
                formattedWheel = { ...row.assemblies_data[0] };
            } else if (row.wild_data && row.wild_data.length > 0 && row.wild_data[0]) {
                formattedWheel = { ...row.wild_data[0] };
            }

            if (!formattedWheel) {
                formattedWheel = { error: 'Wheel JSON not found for pos: ' + position };
            }

            return {
                data_id: row.data_id,
                device_id: row.device_id || 'Unknown',
                reading_timestamp: row.reading_timestamp,
                wheelJson: formattedWheel,
                deviceDetails: {
                    vendor_name: row.vendor_name,
                    device_type_name: row.device_type_name,
                    site: row.site,
                    station_code: row.station_code,
                    section: row.section
                },
                hasAlert: false // Frontend will determine this
            };
        });

        return formattedResults;
    } catch (error) {
        console.log("Error in fetching device data by IDs bulk", error);
        throw error;
    }
}

async function getAllDeviceMaster() {
    try {
        const sql = `
            SELECT dm.*, dtm.device_type_name, vm.vendor_name,
            CASE
                WHEN dds.last_data_timestamp IS NOT NULL
                 AND dds.last_data_timestamp >= (NOW() - INTERVAL '48 hours')
                THEN 'live'
                ELSE 'offline'
            END AS status
            FROM iotms.device_master dm
            LEFT JOIN iotms.device_type_master dtm 
                ON dm.device_type_id = dtm.device_type_id
            LEFT JOIN iotms.device_data_status dds 
                ON dm.device_id = dds.device_id
            LEFT JOIN iotms.vendor_master vm
                ON dm.vendor_id = vm.vendor_id
        `;
        const result = await query(sql);
        return result.rows;
    } catch (error) {
        console.log("Error fetching all device master data", error);
        throw error;
    }
}

function buildFilteredSensorDataQuery(filters) {
    const { hasAlert, zone, connection_status, deviceId, deviceType, time, before_timestamp, limit, severity } = filters;

    const values = [];
    let paramIndex = 1;

    let targetDevicesWhere = [];

    if (zone) {
        targetDevicesWhere.push(`dm.zone = $${paramIndex++}`);
        values.push(zone);
    }

    if (deviceId) {
        targetDevicesWhere.push(`dm.device_id = $${paramIndex++}`);
        values.push(deviceId);
    }

    if (deviceType) {
        targetDevicesWhere.push(`dtm.device_type_name = $${paramIndex++}`);
        values.push(deviceType);
    }

    let sql = `
WITH TargetDevices AS
(
    SELECT
        dm.zone,
        dtm.device_type_name,
        dm.device_id,
        vm.vendor_name,
        dm.working_status,
        CASE
            WHEN dds.last_data_timestamp >= (NOW() - INTERVAL '48 hours')
            THEN 'live'
            ELSE 'offline'
        END AS connection_status
    FROM iotms.device_master dm
    JOIN iotms.device_type_master dtm
        ON dm.device_type_id = dtm.device_type_id
    LEFT JOIN iotms.device_data_status dds
        ON dm.device_id = dds.device_id
    LEFT JOIN iotms.vendor_master vm
        ON dm.vendor_id = vm.vendor_id
    ${targetDevicesWhere.length > 0 ? 'WHERE ' + targetDevicesWhere.join(' AND ') : ''}
)
SELECT
    td.zone,
    td.device_type_name,
    td.device_id,
    td.vendor_name,
    td.connection_status,
    sa.data_id,
    sa.reading_timestamp,
    sa.has_alert,
    sa.highest_severity
FROM TargetDevices td
JOIN iotms.sensor_data sa
    ON td.device_id = sa.device_id
`;

    const mainWhere = [];

    if (connection_status) {
        mainWhere.push(`td.connection_status = $${paramIndex++}`);
        values.push(connection_status.toLowerCase());
    }

    if (hasAlert !== undefined && hasAlert !== null && hasAlert !== '') {
        const isAlert = hasAlert === 'true' || hasAlert === true;
        mainWhere.push(`sa.has_alert = $${paramIndex++}`);
        values.push(isAlert);
    }

    if (time) {
        if (time === '24h') {
            mainWhere.push(`sa.reading_timestamp >= NOW() - INTERVAL '24 hours'`);
        } else if (time === '7d') {
            mainWhere.push(`sa.reading_timestamp >= NOW() - INTERVAL '7 days'`);
        } else if (time === '30d') {
            mainWhere.push(`sa.reading_timestamp >= NOW() - INTERVAL '30 days'`);
        } else if (time === '60d') {
            mainWhere.push(`sa.reading_timestamp >= NOW() - INTERVAL '60 days'`);
        } else {
            const parsedDate = new Date(time);
            if (!isNaN(parsedDate.getTime())) {
                mainWhere.push(`sa.reading_timestamp >= $${paramIndex++}`);
                values.push(parsedDate);
            }
        }
    }

    if (severity) {
        if (severity.toUpperCase() === 'MAINTENANCE') {
            mainWhere.push(`sa.highest_severity ILIKE '%Maintenance%'`);
        } else if (severity.toUpperCase() === 'CRITICAL') {
            mainWhere.push(`sa.highest_severity ILIKE '%Critical%'`);
        } else if (severity.toUpperCase() === 'OTHER') {
            mainWhere.push(`(sa.highest_severity NOT ILIKE '%Maintenance%' AND sa.highest_severity NOT ILIKE '%Critical%' OR sa.highest_severity IS NULL)`);
        } else {
            mainWhere.push(`sa.highest_severity ILIKE $${paramIndex++}`);
            values.push(`%${severity}%`);
        }
    }

    if (mainWhere.length > 0) {
        sql += ` WHERE ` + mainWhere.join(' AND ');
    }
    
    // Add keyset pagination
    if (before_timestamp) {
        sql += (mainWhere.length > 0 ? ` AND ` : ` WHERE `) + `sa.reading_timestamp < $${paramIndex++}`;
        values.push(before_timestamp);
    }
    
    // Add ordering and limit
    sql += ` ORDER BY sa.reading_timestamp DESC`;
    if (limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(parseInt(limit));
    }

    return { sql, values };
}

async function getFilteredSensorData(filters) {
    try {
        const { sql, values } = buildFilteredSensorDataQuery(filters);
        const result = await query(sql, values);
        return result.rows;
    } catch (error) {
        console.log("Error in fetching filtered sensor data", error);
        throw error;
    }
}

function buildAllSensorDataQuery(filters) {
    const { time, startDate, endDate, before_timestamp, limit, deviceType, search, vendor } = filters;
    let sql = `
        SELECT 
            sa.data_id, 
            sa.device_id, 
            sa.reading_timestamp, 
            sa.has_alert, 
            sa.highest_severity, 
            sa.alert_count,
            dtm.device_type_name,
            vm.vendor_name,
            dm.site
        FROM iotms.sensor_data sa
        LEFT JOIN iotms.device_master dm ON sa.device_id = dm.device_id
        LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
        LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
    `;
    const values = [];
    let paramIndex = 1;
    const whereClauses = [];
    const masterWhereClauses = [];

    if (time) {
        if (time === '24h') {
            whereClauses.push(`sa.reading_timestamp >= NOW() - INTERVAL '24 hours'`);
        } else if (time === '7d') {
            whereClauses.push(`sa.reading_timestamp >= NOW() - INTERVAL '7 days'`);
        } else if (time === '30d') {
            whereClauses.push(`sa.reading_timestamp >= NOW() - INTERVAL '30 days'`);
        } else if (time === '60d') {
            whereClauses.push(`sa.reading_timestamp >= NOW() - INTERVAL '60 days'`);
        }
    } else if (startDate && endDate) {
        whereClauses.push(`sa.reading_timestamp >= $${paramIndex++}`);
        values.push(startDate);
        whereClauses.push(`sa.reading_timestamp <= $${paramIndex++}`);
        values.push(endDate);
    } else if (startDate) {
        whereClauses.push(`sa.reading_timestamp >= $${paramIndex++}`);
        values.push(startDate);
    } else if (endDate) {
        whereClauses.push(`sa.reading_timestamp <= $${paramIndex++}`);
        values.push(endDate);
    }
    
    if (before_timestamp) {
        whereClauses.push(`sa.reading_timestamp < $${paramIndex++}`);
        values.push(before_timestamp);
    }
    
    if (deviceType && Array.isArray(deviceType) && deviceType.length > 0) {
        masterWhereClauses.push(`dtm.device_type_name = ANY($${paramIndex++})`);
        values.push(deviceType);
    }
    
    if (vendor && Array.isArray(vendor) && vendor.length > 0) {
        masterWhereClauses.push(`vm.vendor_name = ANY($${paramIndex++})`);
        values.push(vendor);
    }
    
    if (search) {
        masterWhereClauses.push(`dm.device_id::text ILIKE $${paramIndex}`);
        values.push(`%${search}%`);
        paramIndex++;
    }

    if (masterWhereClauses.length > 0) {
        whereClauses.push(`sa.device_id IN (
            SELECT dm.device_id
            FROM iotms.device_master dm
            LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
            LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
            WHERE ${masterWhereClauses.join(' AND ')}
        )`);
    }

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY sa.reading_timestamp DESC`;
    if (limit) {
        sql += ` LIMIT $${paramIndex++}`;
        values.push(parseInt(limit));
    }
    return { sql, values };
}

async function getAllSensorData(filters) {
    try {
        const { sql, values } = buildAllSensorDataQuery(filters);
        const result = await query(sql, values);
        return result.rows;
    } catch (error) {
        console.log("Error in fetching all sensor data", error);
        throw error;
    }
}

module.exports = {
    deviceData,
    getDeviceDataById,
    getDeviceDataBulkByIds,
    getAllDeviceMaster,
    getFilteredSensorData,
    buildFilteredSensorDataQuery,
    getSensorDataByDeviceId,
    buildSensorDataByDeviceIdQuery,
    getAllSensorData,
    buildAllSensorDataQuery
};
