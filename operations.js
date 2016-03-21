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
                doc.coordinates = [ doc.latitude, doc.longitude ];
                delete doc.latitude;
                delete doc.longitude;
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
	// Order the array by timestamp so that we only have to compare each entry to the last one.
	var busStopHistoryOrdered = busStopHistory.slice().sort(function(a, b) {
		var dateA = new Date(a.timestamp);
		var dateB = new Date(b.timestamp);
		return dateA - dateB;
	});
	
	var timeDiffs = [];
	
	for (var i=1; i<busStopHistoryOrdered.length; i++) {
		var bus = busStopHistoryOrdered[i];
		var busPrevious = busStopHistoryOrdered[i-1];

		// Time between buses
		var timeDiff = Math.round(Math.abs(new Date(bus.timestamp) - new Date(busPrevious.timestamp))/1000/60);
		timeDiffs.push(timeDiff);
		
		console.log('* Time since last bus: ' + Utils.minutesToFormattedTime(timeDiff).bold + colors.dim(' (between ' + busPrevious.order + ' at ' + Utils.formatTime(busPrevious.timestamp) + ' and ' + bus.order + ' at ' + Utils.formatTime(bus.timestamp) + ')'));
	}
	
	// Calculate average time between buses
	var average = 0;
	timeDiffs.forEach(function(timeDiff) { average += timeDiff; });
	average /= timeDiffs.length;
	process.stdout.write('* Average time between buses: ' + Utils.minutesToFormattedTime(average).bold);
	
	// Calculate standard deviation
	var stdDeviation = 0;
	timeDiffs.forEach(function(timeDiff) { stdDeviation += Math.pow(timeDiff - average,2); });
	stdDeviation = Math.sqrt(stdDeviation/(timeDiffs.length-1));
	process.stdout.write(' (standard deviation: ' + Utils.minutesToFormattedTime(stdDeviation) + ')\n');
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