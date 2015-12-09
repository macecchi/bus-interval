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
        busHistoryCollection: 'bus_history',
        busHistoryTemporaryCollection: 'bus_history_temp'
    },
    query: {
        dateInterval: ["2015-12-08T02:00:00.000Z", "2015-12-09T02:00:00.000Z"], // Time interval to query. Add 2 hours to fix timezone.
        maxDistance: 99, // Maximum distance a bus can be to a stop to be considered valid (meters)
        duplicatedBusTimeLimit: 15 // Maximum time a bus near the same area can be considered to be duplicated (minutes)
    }
};