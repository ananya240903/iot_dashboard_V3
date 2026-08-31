const QueryStream = require('pg-query-stream');
const { pool } = require('../config/db');

/**
 * Handles executing a query stream and piping the NDJSON results to the HTTP response.
 * @param {Object} res - Express response object
 * @param {string} sql - SQL query string
 * @param {Array} values - Query parameters
 */
async function streamQueryResponse(res, sql, values = []) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let client;
    try {
        client = await pool.connect();
    } catch (err) {
        console.error("Failed to connect to pool for stream:", err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Stream connection error" });
        } else {
            res.end();
        }
        return;
    }

    try {
        const queryStream = new QueryStream(sql, values);
        const streamObj = client.query(queryStream);
        
        streamObj.on('data', (row) => {
            res.write(JSON.stringify(row));
            const canContinue = res.write('\n');
            if (!canContinue) {
                streamObj.pause();
                res.once('drain', () => streamObj.resume());
            }
        });
        
        streamObj.on('end', () => {
            res.end();
            client.release();
        });
        
        streamObj.on('error', (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: "Stream error" });
            } else {
                res.end();
            }
            client.release();
        });
    } catch (err) {
        console.error("Stream initialization error:", err);
        client.release();
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: "Stream initialization error" });
        } else {
            res.end();
        }
    }
}

module.exports = {
    streamQueryResponse
};
