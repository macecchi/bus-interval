var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/riobus';
var colors = require('colors');
var riobus = require('./operations');
var utils = require('./utils');

const DUPLICATED_TIME_LIMIT = 15; // Maximum time a bus near the same area can be considered to be duplicated (minutes)

assert(process.argv.length > 2, 'Missing bus line parameter.');

var searchLines = [];
process.argv.slice(2).forEach(function(arg) {
	searchLines.push(arg);
});

console.log('Searching with lines ' + searchLines);

console.time('Total');

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);


	console.log('Finding buses for line on date...');

	console.time('LineOnDate Query');
	riobus.findBusesFromLineOnDate(db, searchLines, function(tempCollectionName) {
		console.log('Found history for line on date. Saved to collection "' + tempCollectionName + '"...');
		console.timeEnd('LineOnDate Query');


		console.time('GeoNear Query');
		riobus.findBusLines(db, searchLines, function(busLines) {

			busLines.forEach(function(line) {
				console.log("Line " + line.line + ": " + line.spots.length + " bus stops");

				var totalBusStops = line.spots.length;
				var countStops = 0;
				line.spots.forEach(function(bus_stop) {
					var busStopHistory = [];
					
					riobus.findBusesCloseToCoordinate(db, tempCollectionName, line.line, bus_stop.longitude, bus_stop.latitude, function(matches) {
						console.log(colors.bold.bgWhite.black("[" + ++countStops + "/" + totalBusStops + "] Bus stop with sequence " + bus_stop.sequential + " at [" + bus_stop.latitude + ", " + bus_stop.longitude + "]"));

						var previousMatch = {};
						var previousMatches = [];
						
						console.log(colors.green('Found ' + matches.length + ' occurences within range of bus stop:'));
					    matches.forEach(function(bus) {
					    	var time = new Date(bus.timestamp);
					    	var duplicated;
					    	var minutesDiff = Number.POSITIVE_INFINITY;

					    	// See if the bus is a duplicate (if it's the same order in the same place in the same time interval)
					    	if (bus.order == previousMatch.order) {
					    		previousMatches.push(previousMatch);
					    		previousMatches.forEach(function(pastMatch) {
					    			minutesDiff = Math.min(minutesDiff, Math.round(Math.abs(time - new Date(pastMatch.timestamp))/1000/60));
					    		});

					    		if (minutesDiff < DUPLICATED_TIME_LIMIT) {
					    			duplicated = true;
					    		}
					    		else {
					    			duplicated = false;
					    		}
					    	}
					    	else {
					    		previousMatches = [];
					    		minutesDiff = Number.POSITIVE_INFINITY;
					    		duplicated = false;
					    	}

					    	if (!duplicated) {
					    		busStopHistory.push(bus);
					     		console.log("- " + bus.order + " with distance " + utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + utils.pad(bus.direction,3) + " @ " + utils.formatDateTime(time) + ")");
					    	}
					    	else {
					    		console.log("-- " + bus.order + " with distance " + utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + utils.pad(bus.direction,3) + " @ " + utils.formatDateTime(time) + ")");

					    	}

					    	previousMatch = bus;
					    });


					    // Generate statistics for bus stop
					    console.log(colors.yellow('\nStatistics - Bus stop #' + bus_stop.sequential + ':'));
					    
					    riobus.calculateTimeBetweenBuses(busStopHistory);
					    riobus.calculateBusReturnTimes(busStopHistory);
						
					    console.log('');
					    if (countStops == totalBusStops) {
							console.timeEnd('GeoNear Query');
					    	console.timeEnd('Total');
					    	process.exit(0);
					    }
		 			}); // end matches loop

					
	 			}); // end bus stops loop
			});
		});

	});//findbusesonline...
});