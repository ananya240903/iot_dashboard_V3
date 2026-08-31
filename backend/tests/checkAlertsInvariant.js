require('dotenv').config();
const { pool } = require('../src/config/db');
const { deviceDataService } = require('../src/service');

async function runTest() {
    console.log('Running alerts invariant test...');
    try {
        const data = await deviceDataService.deviceData();
        let allValid = true;

        data.forEach(zone => {
            if (zone.device_types) {
                zone.device_types.forEach(dt => {
                    let typeValid = true;
                    if (dt.devices) {
                        dt.devices.forEach(device => {
                            const total = device.trueAlertCount || 0;
                            const maint = device.maintenanceCount || 0;
                            const crit = device.criticalCount || 0;
                            const other = device.otherCount || 0;

                            const sum = maint + crit + other;
                            if (total !== sum) {
                                console.error(`Invariant violated for device ${device.device_id} in ${dt.device_type_name}. Total: ${total}, Sum: ${sum} (M: ${maint}, C: ${crit}, O: ${other})`);
                                typeValid = false;
                                allValid = false;
                            }
                        });
                    }
                });
            }
        });

        if (allValid) {
            console.log('✅ All devices passed the invariant check: trueAlertCount == maintenanceCount + criticalCount + otherCount');
        } else {
            console.error('❌ Invariant check failed for one or more devices.');
            process.exit(1);
        }
    } catch (err) {
        console.error('Test failed with error:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

runTest();
