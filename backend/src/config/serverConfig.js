const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    PORT : process.env.PORT,
    POSTGRES_URI: process.env.POSTGRES_URI
}