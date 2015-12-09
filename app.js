/* global process; */
var Config = require('./config');
var assert = require('assert');
var colors = require('colors');
var RioBus = require('./operations');
var Utils = require('./utils');

assert(process.argv.length > 2, 'Missing bus line parameter.');

var showDuplicates = (process.argv.indexOf('--show-duplicates') > -1);

var searchLines = [];
process.argv.slice(2).forEach(function(arg) {
	searchLines.push(arg);
});

console.log('Searching with lines ' + searchLines + '\n');
console.time('Total');

RioBus.connect(function(err, db) {
	assert.equal(null, err);

	console.log('Loading bus stops information...');
	RioBus.findBusStops(db, searchLines, function(busLines) {
		// Check if bus stops information is present before continuing
		var totalBusStops = 0;
		busLines.forEach(function(line) {
			totalBusStops += line.spots.length;
		});
		if (totalBusStops == 0) {
			console.log('No bus stops were found for the selected lines. App will terminate.');
			process.exit(0);
		}
		console.log('Total of ' + totalBusStops + ' were found for the selected lines.\n');
	
		console.time('LineOnDate Query');
		console.log('Finding buses for line on date...');
		RioBus.findBusesFromLineOnDate(db, searchLines, function(tempCollectionName) {
			console.log('Found history for line on date. Saved to collection "' + tempCollectionName + '"...');
			console.timeEnd('LineOnDate Query');
			
			console.time('GeoNear Query');
			busLines.forEach(function(line) {
				console.log("Line " + line.line + ": " + line.spots.length + " bus stops");
	
				totalBusStops = line.spots.length;
				var countStops = 0;
				line.spots.forEach(function(bus_stop) {
					var busStopHistory = [];
					
					RioBus.findBusesCloseToCoordinate(db, tempCollectionName, line.line, bus_stop.longitude, bus_stop.latitude, function(matches) {
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
	
								if (minutesDiff < Config.query.duplicatedBusTimeLimit) {
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
								console.log("- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + ")");
							}
							else if (showDuplicates) {
								console.log("-- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + ")");
							}
	
							previousMatch = bus;
						});
	
	
						// Generate statistics for bus stop
						console.log(colors.yellow('\nStatistics - Bus stop #' + bus_stop.sequential + ':'));
						
						RioBus.calculateTimeBetweenBuses(busStopHistory);
						RioBus.calculateBusReturnTimes(busStopHistory);
						
						console.log('');
						if (countStops == totalBusStops) {
							console.timeEnd('GeoNear Query');
							console.timeEnd('Total');
							process.exit(0);
						}
					}); // end findBusesCloseToCoordinate					
				}); // end line.spots
			}); // end busLines
		}); // end findBusesFromLineOnDate
	}); // end findBusStops
});