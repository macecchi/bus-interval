/* global process; */
/**
 * Application configuration
 * You may use it to describe every global configuration data
 */
module.exports = {
    database: {
        dbName: process.env.RIOBUS_DB_NAME  || 'nodejs',
        host: process.env.RIOBUS_DB_HOST    || 'localhost',
        port: process.env.RIOBUS_DB_PORT    || 27017,
        user: process.env.RIOBUS_DB_USER    || '',
        pass: process.env.RIOBUS_DB_PASS    || ''
    },
    schema: {
        busStopsCollection: 'bus_stop',
        busHistoryCollection: 'bus_2015',
        busHistoryTemporaryCollection: 'bus_history_temp'
    },
    query: {
        // Maximum distance a bus can be to a stop to be considered valid (meters)
        maxDistance: 99,

        // Maximum time a bus near the same area can be considered to be duplicated (minutes)
        duplicatedBusTimeLimit: 25
    }
};
