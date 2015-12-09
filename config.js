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
    },
    schema: {
        busStopsCollection: 'bus_stop',
        busHistoryCollection: 'bus_history_old',
        busHistoryTemporaryCollection: 'bus_history_temp'
    },
    query: {
        dateInterval: ["2015-11-24T00:00:00.000Z", "2015-11-25T00:00:00.000Z"],
        maxDistance: 99,
        duplicatedBusTimeLimit: 15 // Maximum time a bus near the same area can be considered to be duplicated (minutes)
    }
};