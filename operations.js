/* global process; */
var assert = require('assert');
var colors = require('colors');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var Config = require('./config');
var Utils = require('./utils');

/**
 * Connect to database.
 */
function connect(callback) {
	var config = Config.database;
	var url = `${config.host}:${config.port}/${config.dbName}`;
	if (config.user!=='' && config.pass!=='') url = `${config.user}:${config.pass}@${url}`;
	url = 'mongodb://' + url;
	MongoClient.connect(url, function(err, db) { callback(err, db); });
}

/**
 * Find buses of the requested lines on a specific date and save it to a separate collection.
 * The indexes are also redefined on the new temporary collection.
 */
function findBusesFromLineOnDate(db, lines, callback) {
	var tempCollectionName = Config.schema.busHistoryTemporaryCollection;
	var queryInterval = Config.query.dateInterval;

	db.collection(tempCollectionName).drop(function(err, response) {
		if (err != null && err.errmsg !== "ns not found") throw err;

		var cursor = db.collection(Config.schema.busHistoryCollection).find({ "timestamp": { "$gte": new Date(queryInterval[0]), "$lte": new Date(queryInterval[1]) }, "line": { "$in": lines } });
		cursor.each(function(err, doc) {
			assert.equal(err, null);
			if (doc != null) {
				db.collection(tempCollectionName).insert(doc);
			}
			else {
				ensureIndexes(db, tempCollectionName, function() {
					callback(tempCollectionName);
				});
			}
		});
	});

}

/**
 * Finds vehicles that are within a certain distance from a coordinate.
 */
function findBusesCloseToCoordinate(db, collection, line, longitude, latitude, callback) {
	db.collection(collection).aggregate([
	{ 
		"$geoNear": { 
			"near": { "type": "Point", "coordinates": [ latitude, longitude ] },
			"maxDistance": Config.query.maxDistance,
			"distanceField": "dist.calculated",
			"includeLocs": "dist.location",
			"spherical": true,
			"query": { "line": line }
		}
	},
	{ 
         "$sort": {
         	"order": 1,
         	"dist.calculated": 1
         }
    }
    ]).toArray(function(err, result) {
	 	assert.equal(err, null);
     	callback(result);
 	});

 }

/**
 * Finds bus stops for the specified bus lines.
 */
function findBusStops(db, lines, callback) {
	var cursor = db.collection(Config.schema.busStopsCollection).find({ "line": { "$in": lines } });
	var busLines = [];

	cursor.each(function(err, doc) {
		assert.equal(err, null);
		if (doc != null) {
			busLines.push(doc);
		} else {
			callback(busLines);
		}
	});
};

/**
 * Calculates time passed for each bus on the bus stop since the previous one arrived.
 * @param busStopHistory An array containing the bus history for a bus stop.
 */
function calculateTimeBetweenBuses(busStopHistory) {
	busStopHistory.forEach(function(bus) {
		// Time between buses
		// I want to find the closest entry before this one and calculate the time difference between them
		var busTimestamp = new Date(bus.timestamp);
		var shortestDiff = Number.POSITIVE_INFINITY;
		var shortestDiffBus;
		busStopHistory.forEach(function(busPrevious) {
			var previousBusTimestamp = new Date(busPrevious.timestamp);
			// Check if we are testing a previous entry
			if (previousBusTimestamp < busTimestamp) {
				var timeDiffFromLast = Math.round(Math.abs(busTimestamp - previousBusTimestamp)/1000/60);
				if (timeDiffFromLast < shortestDiff) {
					shortestDiff = timeDiffFromLast;
					shortestDiffBus = busPrevious;
				}
			}
		});
		if (shortestDiffBus) {
			console.log('* Time since last bus: ' + Utils.minutesToFormattedTime(shortestDiff).bold + colors.dim(' (between ' + shortestDiffBus.order + ' at ' + Utils.formatTime(shortestDiffBus.timestamp) + ' and ' + bus.order + ' at ' + Utils.formatTime(bus.timestamp) + ')'));
		}
	});
}

/**
 * Calculates the return times (time between every arrival of the same bus) for buses on a bus stop.
 * @param busStopHistory An array containing the bus history for a bus stop.
 */
function calculateBusReturnTimes(busStopHistory) {
	var previousMatch = {};
	var timeDiffs = [];
	busStopHistory.forEach(function(bus) {
		// Return time
		if (bus.order == previousMatch.order) {
			var timeDiffFromLast = Math.round(Math.abs(new Date(bus.timestamp) - new Date(previousMatch.timestamp))/1000/60);
			// Ignore buses with time interval bigger than 4 hours
			if (timeDiffFromLast < 4*60) {
				timeDiffs.push(timeDiffFromLast);
			}
		}
		else {
			if (timeDiffs.length > 0) {
				process.stdout.write('* Return times for order ' + previousMatch.order + ': ');
				var timeDiffSum = 0;
				timeDiffs.forEach(function(timeDiff) {
					process.stdout.write(Utils.minutesToFormattedTime(timeDiff).bold + ' ');
					timeDiffSum += timeDiff;
				});

				var timeDiffAverage = timeDiffSum/timeDiffs.length;
				process.stdout.write('(avg: ' + Utils.minutesToFormattedTime(timeDiffAverage) + ')\n');
			}
			timeDiffs = [];
		}
		previousMatch = bus;

	});
}

/**
 * Ensures indexes from 'bus' collection are defined as 2dsphere coordinates.
 */
function ensureIndexes(db, collection, callback) {
	db.collection(collection).createIndex({ "coordinates": "2dsphere" }, null, function(err, results) {
		db.collection(collection).createIndex({ "timestamp": 1, "line": 1 }, null, function(err, results) {
			callback();
		});
	});
};

module.exports = {
	connect: connect,
	findBusesFromLineOnDate: findBusesFromLineOnDate,
	findBusesCloseToCoordinate: findBusesCloseToCoordinate,
	findBusStops: findBusStops,
	calculateTimeBetweenBuses: calculateTimeBetweenBuses,
	calculateBusReturnTimes: calculateBusReturnTimes,
	ensureIndexes: ensureIndexes
};