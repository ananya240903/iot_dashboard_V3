const db = require('../config/db');
const { withSWRCache } = require('../utils/swrCache');

exports.getTrendAnalysis = async (req, res) => {

    try {
        const { data_ids, rsNo, position, type } = req.body;
        if (!data_ids || !Array.isArray(data_ids) || data_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'data_ids required' });
        }
        if (!rsNo) {
            return res.status(400).json({ success: false, message: 'rsNo required' });
        }

        let targetPositions = [];
        if (type === 'wheel') {
            targetPositions = [position];
        } else if (type === 'axle') {
            if (position && position.startsWith('L')) targetPositions = [position, 'R' + position.substring(1)];
            else if (position && position.startsWith('R')) targetPositions = [position, 'L' + position.substring(1)];
            else targetPositions = [position];
        }

        const dataQuery = `
            SELECT 
                sd.data_id,
                sd.reading_timestamp,
                sd.device_id,
                vm.vendor_name,
                dtm.device_type_name,
                dm.site,
                dm.station_code,
                dm.section,
                
                -- 1. Extract ALL Wheel Data
                (SELECT jsonb_agg(wheel) 
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rsDetails', '[]'::jsonb) || COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 LEFT JOIN jsonb_array_elements(COALESCE(rs->'axles', '[]'::jsonb)) axle ON true
                 LEFT JOIN jsonb_array_elements(COALESCE(axle->'wheels', '[]'::jsonb)) wheel ON true
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND wheel IS NOT NULL
                ) as wheels_data,

                -- 2. Extract ALL Assembly Data
                (SELECT jsonb_agg(asm)
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rsDetails', '[]'::jsonb) || COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 LEFT JOIN jsonb_array_elements(COALESCE(rs->'assemblies', '[]'::jsonb)) asm ON true
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND asm IS NOT NULL
                ) as assemblies_data,

                -- 3. Extract ALL WILD Data (Flat structure)
                (SELECT jsonb_agg(rs || jsonb_build_object('position', ((rs->>'vehicleSide') || (rs->>'vehicleAxleNumber'))))
                 FROM jsonb_array_elements(COALESCE(sd.payload->'rollingStock', '[]'::jsonb)) rs
                 WHERE $1 IN (rs->>'rsNo', rs->>'no', rs->>'rsno', rs->>'vehicleNo', rs->>'position')
                   AND rs->>'vehicleSide' IS NOT NULL
                ) as wild_data

            FROM iotms.sensor_data sd
            LEFT JOIN iotms.device_master dm ON sd.device_id = dm.device_id
            LEFT JOIN iotms.device_type_master dtm ON dm.device_type_id = dtm.device_type_id
            LEFT JOIN iotms.vendor_master vm ON dm.vendor_id = vm.vendor_id
            WHERE sd.data_id = ANY($2)
        `;

        const dataResult = await db.query(dataQuery, [rsNo, data_ids.map(String)]);
        const rows = dataResult.rows;

        const results = [];

        for (const row of rows) {
            let extractedWheels = [];

            if (row.wheels_data && row.wheels_data.length > 0) {
                extractedWheels = row.wheels_data;
            } else if (row.assemblies_data && row.assemblies_data.length > 0) {
                extractedWheels = row.assemblies_data;
            } else if (row.wild_data && row.wild_data.length > 0) {
                extractedWheels = row.wild_data;
            }

            let wheelsToProcess = [];
            if (type === 'rs') {
                wheelsToProcess = extractedWheels.filter(w => w && w.position);
            } else {
                wheelsToProcess = extractedWheels.filter(w => w && w.position && targetPositions.includes(w.position));
                for (const tp of targetPositions) {
                    if (!wheelsToProcess.find(w => w.position === tp)) {
                        wheelsToProcess.push({ error: 'Wheel JSON not found for pos: ' + tp, position: tp });
                    }
                }
            }

            for (const wheelRaw of wheelsToProcess) {
                let formattedWheel = { ...wheelRaw };

                if (!formattedWheel.error) {
                    if (formattedWheel.wildWheelImpactRatio !== undefined || formattedWheel.railBamBearingFaultCode !== undefined) {
                        const statusObj = {};
                        if (formattedWheel.wildPeakWheelImpactRatioAlertLevelKey !== undefined && formattedWheel.wildPeakWheelImpactRatioAlertLevelKey !== null) statusObj.wildPeakWheelImpactRatioAlertLevelKey = formattedWheel.wildPeakWheelImpactRatioAlertLevelKey || 'null';
                        if (formattedWheel.wildPeakWheelImpactAlertLevelKey !== undefined && formattedWheel.wildPeakWheelImpactAlertLevelKey !== null) statusObj.wildPeakWheelImpactAlertLevelKey = formattedWheel.wildPeakWheelImpactAlertLevelKey || 'null';
                        if (formattedWheel.railBamBearingAlertLevelKey !== undefined && formattedWheel.railBamBearingAlertLevelKey !== null) statusObj.railBamBearingAlertLevelKey = formattedWheel.railBamBearingAlertLevelKey || 'null';

                        const deviceDataObj = {};
                        if (formattedWheel.wildWheelImpactRatio !== undefined && formattedWheel.wildWheelImpactRatio !== null) {
                            deviceDataObj.wildWheelImpactRatio = parseFloat(formattedWheel.wildWheelImpactRatio) || 0;
                            deviceDataObj.wildWheelWeightTonnes = parseFloat(formattedWheel.wildWheelWeightTonnes) || 0;
                            deviceDataObj.wildPeakWheelImpactKiloNewtons = parseFloat(formattedWheel.wildPeakWheelImpactKiloNewtons) || 0;
                        }
                        if (formattedWheel.railBamBearingFaultCode !== undefined && formattedWheel.railBamBearingFaultCode !== null) {
                            deviceDataObj.railBamBearingFaultCode = formattedWheel.railBamBearingFaultCode;
                        }

                        formattedWheel = {
                            position: formattedWheel.position || 'Unknown',
                            status: Object.keys(statusObj).length > 0 ? statusObj : '-',
                            deviceData: Object.keys(deviceDataObj).length > 0 ? deviceDataObj : undefined
                        };
                    } else if (!formattedWheel.deviceData) {
                        const deviceDataObj = {};
                        const excludeKeys = ['id', 'hasAlert', 'position', 'vehicleSide', 'vehicleAxleNumber', 'no', 'rsNo', 'rsno', 'readingTimestamp', 'readingTimestampUtc', 'timestamp', 'timestampUtc', 'speedKmph', 'speed', 'wheelNo'];

                        Object.keys(formattedWheel).forEach(k => {
                            const val = parseFloat(formattedWheel[k]);
                            if (!isNaN(val) && typeof formattedWheel[k] !== 'object' && !excludeKeys.includes(k)) {
                                deviceDataObj[k] = val;
                            }
                        });

                        if (Object.keys(deviceDataObj).length > 0) {
                            formattedWheel.deviceData = deviceDataObj;
                        }
                    }
                }

                results.push({
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
                    hasAlert: false // Frontend determines this
                });
            }
        }

        res.json({ success: true, data: results });
    } catch (error) {
        console.error("Analysis API Error:", error);
        res.status(500).json({ success: false, message: 'Server error generating analysis data' });
    }
};

exports.getVariationReport = async (req, res) => {
    try {
        const { timeFilter, startDate, endDate } = req.body;
        
        let start = new Date();
        let end = new Date();

        if (timeFilter === '24h') {
            start.setHours(start.getHours() - 24);
        } else if (timeFilter === '30d') {
            start.setDate(start.getDate() - 30);
        } else if (timeFilter === '60d') {
            start.setDate(start.getDate() - 60);
        } else if (timeFilter === 'custom' && startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid or missing time filter' });
        }

        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 1000;
        const offset = (page - 1) * limit;
        const sortDirection = req.body.sortDirection === 'asc' ? 'ASC' : 'DESC';

        const cacheKey = `variation_report_${timeFilter}_${startDate || 'none'}_${endDate || 'none'}_${page}_${limit}_${sortDirection}`;

        const fetchReportData = async () => {
            const dataQuery = `
                SELECT 
                    data_id,
                    reading_timestamp,
                    device_id,
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'rsno', COALESCE(train->>'rsno', train->>'no', train->>'rsNo'),
                                'position', wheel->>'position',
                                'ilf', (wheel->'deviceData'->>'ilf')::numeric,
                                'maxDynamicLoadTon', (wheel->'deviceData'->>'maxDynamicLoadTon')::numeric,
                                'avgDynamicLoadTon', (wheel->'deviceData'->>'avgDynamicLoadTon')::numeric
                            )
                        )
                        FROM jsonb_array_elements(
                            CASE WHEN jsonb_typeof(payload->'rsDetails') = 'array' THEN payload->'rsDetails' ELSE '[]'::jsonb END
                        ) AS train,
                        jsonb_array_elements(
                            CASE WHEN jsonb_typeof(train->'axles') = 'array' THEN train->'axles' ELSE '[]'::jsonb END
                        ) AS axle,
                        jsonb_array_elements(
                            CASE WHEN jsonb_typeof(axle->'wheels') = 'array' THEN axle->'wheels' ELSE '[]'::jsonb END
                        ) AS wheel
                        WHERE wheel->'deviceData' IS NOT NULL
                    ) AS extracted_wheels
                FROM iotms.sensor_data
                WHERE reading_timestamp >= $1 AND reading_timestamp <= $2
                ORDER BY reading_timestamp ${sortDirection}
                LIMIT $3 OFFSET $4
            `;

            const dataResult = await db.query(dataQuery, [start, end, limit, offset]);
            const rows = dataResult.rows;

            const results = [];

            for (const row of rows) {
                const wheelsData = row.extracted_wheels;
                if (!Array.isArray(wheelsData) || wheelsData.length === 0) continue;

                const trainGroups = {};
                for (const w of wheelsData) {
                    if (!w.rsno) continue;
                    if (!trainGroups[w.rsno]) trainGroups[w.rsno] = [];
                    trainGroups[w.rsno].push({
                        position: w.position,
                        ilf: w.ilf || 0,
                        maxDynamicLoadTon: w.maxDynamicLoadTon || 0,
                        avgDynamicLoadTon: w.avgDynamicLoadTon || 0
                    });
                }

                for (const rsno in trainGroups) {
                    const wheels = trainGroups[rsno];
                    if (wheels.length === 0) continue;

                    let sumIlf = 0, sumMax = 0, sumAvg = 0;
                    for (const w of wheels) {
                        sumIlf += w.ilf;
                        sumMax += w.maxDynamicLoadTon;
                        sumAvg += w.avgDynamicLoadTon;
                    }

                    const avgIlf = sumIlf / wheels.length;
                    const avgMax = sumMax / wheels.length;
                    const avgAvg = sumAvg / wheels.length;

                    let hasHighVariation = false;

                    for (const w of wheels) {
                        const varIlf = avgIlf ? (Math.abs(w.ilf - avgIlf) / avgIlf) * 100 : 0;
                        const varMax = avgMax ? (Math.abs(w.maxDynamicLoadTon - avgMax) / avgMax) * 100 : 0;
                        const varAvg = avgAvg ? (Math.abs(w.avgDynamicLoadTon - avgAvg) / avgAvg) * 100 : 0;

                        w.variation_ilf = varIlf;
                        w.variation_max = varMax;
                        w.variation_avg = varAvg;

                        if (varIlf > 10 || varMax > 10 || varAvg > 10) {
                            hasHighVariation = true;
                        }
                    }

                    if (hasHighVariation) {
                        results.push({
                            data_id: row.data_id,
                            reading_timestamp: row.reading_timestamp,
                            device_id: row.device_id,
                            rsno: rsno,
                            wheels,
                            averages: {
                                ilf: avgIlf,
                                maxDynamicLoadTon: avgMax,
                                avgDynamicLoadTon: avgAvg
                            }
                        });
                    }
                }
            }
            
            return {
                hasMore: rows.length === limit,
                data: results
            };
        };

        const cacheResult = await withSWRCache(cacheKey, fetchReportData, 300, 3600);

        res.json({ 
            success: true, 
            page,
            limit,
            hasMore: cacheResult.data.hasMore,
            data: cacheResult.data.data 
        });

    } catch (error) {
        console.error("Variation API Error:", error);
        res.status(500).json({ success: false, message: 'Server error generating variation report' });
    }
};
