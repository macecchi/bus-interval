/* global process; */
/**
 * Application configuration
 * You may use it to describe every global configuration data
 */
module.exports = {
    database: {
        dbName: process.env.NODEJS_DB_NAME  || 'riobus',
        host: process.env.NODEJS_DB_HOST    || 'localhost',
        port: process.env.NODEJS_DB_PORT    || 27017,
        user: process.env.NODEJS_DB_USER    || '',
        pass: process.env.NODEJS_DB_PASS    || ''
    }
};