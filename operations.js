var assert = require('assert');
var utils = require('./utils');

/**
 * Finds vehicles that are within a certain distance from a coordinate.
 */
function findBusesCloseToCoordinate(db, line, longitude, latitude, callback) {
	db.collection('bus_history').aggregate([
	{ 
		"$geoNear": { 
			"near": { "type": "Point", "coordinates": [ latitude, longitude ] },
			"maxDistance": 100,
			"distanceField": "dist.calculated",
			"includeLocs": "dist.location",
			"spherical": true,
			"query": { "line": line, "timestamp": { "$gte": new Date("2015-10-28T00:00:00.000Z"), "$lte": new Date("2015-10-29T00:00:00.000Z") } }
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
function findBusLines(db, lines, callback) {
	var cursor = db.collection('bus_stop').find({ "line": { "$in": lines } });
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
			console.log('* Time since last bus: ' + utils.minutesToFormattedTime(shortestDiff) + ' (between ' + bus.order + ' and ' + shortestDiffBus.order + ')');
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
				process.stdout.write('Return times for order ' + previousMatch.order + ': ');
				var timeDiffSum = 0;
				timeDiffs.forEach(function(timeDiff) {
					process.stdout.write(utils.minutesToFormattedTime(timeDiff) + ' ');
					timeDiffSum += timeDiff;
				});

				var timeDiffAverage = timeDiffSum/timeDiffs.length;
				process.stdout.write('(avg: ' + utils.minutesToFormattedTime(timeDiffAverage) + ')\n');
			}
			timeDiffs = [];
		}
		previousMatch = bus;

	});
}

/**
 * Ensures indexes from 'bus' collection are defined as 2dsphere coordinates.
 */
function ensureIndexes(db, callback) {
	db.collection('bus_history').createIndex(
		{ "coordinates": "2dsphere" },
		null,
		function(err, results) {
			console.log(results);
			callback();
		}
		);
};

module.exports = {
	findBusesCloseToCoordinate: findBusesCloseToCoordinate,
	findBusLines: findBusLines,
	calculateTimeBetweenBuses: calculateTimeBetweenBuses,
	calculateBusReturnTimes: calculateBusReturnTimes,
	ensureIndexes: ensureIndexes
};