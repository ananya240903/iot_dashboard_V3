export default function calculate(data, filters) {
    if (!data || !Array.isArray(data)) {
        return {
            chartData: [],
            calibrationStats: { valid: 0, overdue: 0, unknown: 0, details: [] },
            alertStats: []
        };
    }

    let liveCount = 0;
    let offlineCount = 0;

    let calibrationValid = 0;
    let calibrationOverdue = 0;
    let calibrationUnknown = 0;
    const calibrationDetails = [];
    const connectionDetails = [];

    const alertMap = {};
    const zoneMap = {};
    const today = new Date();
    data.forEach(zoneEntry => {
        // Filter by zone if specified
        if (filters?.zone && filters.zone !== "All" && zoneEntry.zone !== filters.zone) {
            return;
        }

        if (!zoneMap[zoneEntry.zone]) {
            zoneMap[zoneEntry.zone] = { live: 0, offline: 0 };
        }

        if (zoneEntry.device_types && Array.isArray(zoneEntry.device_types)) {
            zoneEntry.device_types.forEach(dt => {
                // Filter by device type if specified
                if (filters?.deviceType && !filters.deviceType.includes("All") && !filters.deviceType.includes(dt.device_type_name)) {
                    return;
                }

                const typeName = dt.device_type_name;
                if (!alertMap[typeName]) {
                    alertMap[typeName] = 0;
                }

                if (dt.devices && Array.isArray(dt.devices)) {
                    dt.devices.forEach(device => {
                        const status = device.status ? device.status.toLowerCase() : 'offline';
                        const isLive = (status === 'live' || status === 'online');
                        const deviceStatus = isLive ? 'Live' : 'Offline';

                        // Filter by status if specified
                        if (filters?.status && filters.status !== "All" && filters.status !== deviceStatus) {
                            return; // skip this device
                        }

                        if (isLive) {
                            liveCount++;
                            zoneMap[zoneEntry.zone].live++;
                            zoneMap[zoneEntry.zone][`live_${typeName}`] = (zoneMap[zoneEntry.zone][`live_${typeName}`] || 0) + 1;
                        } else {
                            offlineCount++;
                            zoneMap[zoneEntry.zone].offline++;
                            zoneMap[zoneEntry.zone][`offline_${typeName}`] = (zoneMap[zoneEntry.zone][`offline_${typeName}`] || 0) + 1;
                        }

                        connectionDetails.push({
                            status: isLive ? 'live' : 'offline',
                            zone: zoneEntry.zone,
                            device_id: device.device_id,
                            device_name: dt.device_type_name,
                            vendor_name: device.vendor_name || 'N/A',
                            site: device.site || 'N/A',
                            totalDocumentCount: device.totalDocumentCount || 0,
                            trueAlertCount: device.trueAlertCount || 0,
                            alertRatio: device.alertRatio || 0,
                        });

                        // Determine Calibration
                        let category = 'unknown';
                        if (!device.next_calibration_due) {
                            calibrationUnknown++;
                        } else {
                            const dueDate = new Date(device.next_calibration_due);
                            if (dueDate < today) {
                                category = 'overdue';
                                calibrationOverdue++;
                            } else {
                                category = 'valid';
                                calibrationValid++;
                            }
                        }

                        calibrationDetails.push({
                            category,
                            zone: zoneEntry.zone,
                            device_id: device.device_id,
                            device_name: dt.device_type_name,
                            vendor_name: device.vendor_name || 'N/A',
                            site: device.site || 'N/A',
                            calibrated_on: device.calibrated_on || 'N/A',
                            next_calibration_due: device.next_calibration_due || 'N/A'
                        });

                        // Aggregate Alerts
                        if (typeof device.trueAlertCount === 'number') {
                            alertMap[typeName] += device.trueAlertCount;
                        }
                    });
                }
            });
        }
    });

    const alertStats = Object.keys(alertMap).map(type => ({
        device_type: type,
        trueAlertCount: alertMap[type]
    }));

    const zoneStats = Object.keys(zoneMap).map(zone => ({
        zone,
        ...zoneMap[zone]
    }));

    return {
        chartData: [
            { name: 'Live', value: liveCount },
            { name: 'Offline', value: offlineCount }
        ],
        connectionStats: {
            live: liveCount,
            offline: offlineCount,
            details: connectionDetails
        },
        calibrationStats: {
            valid: calibrationValid,
            overdue: calibrationOverdue,
            unknown: calibrationUnknown,
            details: calibrationDetails
        },
        alertStats,
        zoneStats
    };
}