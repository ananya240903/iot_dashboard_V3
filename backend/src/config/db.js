const { Pool } = require('pg');
const serverConfig = require('./serverConfig');

const pool = new Pool({
  connectionString: serverConfig.POSTGRES_URI,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle pg client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
