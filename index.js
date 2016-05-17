"use strict";
/* global process; */
const Config = require('./config');
const assert = require('assert');
const colors = require('colors');
const RioBus = require('./operations');
const Utils = require('./utils');


assert(process.argv.length > 2, 'Missing bus line parameter.');

let showDuplicates = (process.argv.indexOf('--show-duplicates') > -1);
let filterSpot = (process.argv.indexOf('--stop') > -1) ? process.argv[process.argv.indexOf('--stop')+1] : -1;

let searchLine = process.argv[process.argv.length-1];
assert(!isNaN(searchLine), 'Missing bus line parameter.');

console.log('Searching with lines ' + searchLine + '\n');
if (filterSpot != -1) console.log('Filtering only bus stop with sequence #' + filterSpot);

console.time('Total');

var lineStats = {};

RioBus.connect(function(err, db) {
	assert.equal(null, err);

	console.log('Loading bus stops information...');
	RioBus.findBusStopsForLine(db, searchLine, function(line) {
		// Check if bus stops information is present before continuing
		var totalBusStops = line.spots.length;
		if (totalBusStops == 0) {
			console.log('No bus stops were found for the selected lines. App will terminate.');
			process.exit(0);
		}
		console.log('Total of ' + totalBusStops + ' bus stops were found for the selected lines.\n');
	
		console.time('LineOnDate Query');
		console.log('Finding buses for line on date...');
		RioBus.findBusesFromLineOnDate(db, searchLine, function(tempCollectionName) {
			console.log('Found history for line on date. Saved to collection "' + tempCollectionName + '".');
			console.timeEnd('LineOnDate Query');
			
			console.time('GeoNear Query');
			console.log("Line " + line.line + ": " + line.spots.length + " bus stops\n");
			lineStats[line.line] = { avgWaitTime: 0, avgWaitCount: 0, avgReturnTime: 0, avgReturnCount: 0 };
			
			totalBusStops = line.spots.length;
			var countStops = 0;
			
			line.spots.forEach(function(bus_stop) {
				// Skip if it doesn't match our filter
				if (filterSpot != -1 && bus_stop.sequential != filterSpot) return;
				
				var busStopHistory = [];
				
				RioBus.findBusesCloseToCoordinate(db, tempCollectionName, line, bus_stop.longitude, bus_stop.latitude, bus_stop.returning, function(matches) {
					console.log(colors.bold.bgWhite.black("[" + ++countStops + "/" + totalBusStops + "] Bus stop with sequence " + bus_stop.sequential + " at [" + bus_stop.latitude + ", " + bus_stop.longitude + "]"));

					var previousMatch = {};
					var previousMatches = [];
					
					console.log(colors.green('Found ' + matches.length + ' occurences within range of bus stop'));
					if (matches.length > 0) {
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
								// console.log("- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + " towards " + Utils.formatSense(bus.sense) + ")");
							}
							else if (showDuplicates) {
								// console.log("-- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + " towards " + Utils.formatSense(bus.sense) + ")");
							}
	
							previousMatch = bus;
						});
	
	
						// Generate statistics for bus stop
						console.log(colors.yellow('\nStatistics - Bus stop #' + bus_stop.sequential + ':'));
						
						var waitStats = RioBus.calculateTimeBetweenBuses(busStopHistory);
						if (!isNaN(waitStats.avgWaitTime) && waitStats.avgWaitTime > 0) {
							lineStats[line.line].avgWaitTime += waitStats.avgWaitTime;
							lineStats[line.line].avgWaitCount++;
						}
						var returnStats = RioBus.calculateBusReturnTimes(busStopHistory);
						if (!isNaN(returnStats.avgReturnTime) && returnStats.avgReturnTime > 0) {
							lineStats[line.line].avgReturnTime += returnStats.avgReturnTime;
							lineStats[line.line].avgReturnCount++;
						}
					} // if has matches
					
					console.log('');
					if (countStops == totalBusStops || filterSpot != -1) {
						console.timeEnd('GeoNear Query');
						console.timeEnd('Total');
						
						printStats(line);
						process.exit(0);
					}
				}); // end findBusesCloseToCoordinate					
			}); // end line.spots
		}); // end findBusesFromLineOnDate
	}); // end findBusStops
});

function printStats(line) {
	var avgWaitTime = lineStats[line.line].avgWaitTime / lineStats[line.line].avgWaitCount;
	var avgReturnTime = lineStats[line.line].avgReturnTime / lineStats[line.line].avgReturnCount;
	console.log('Line stats:');
	console.log('- Average wait time: ' + Utils.minutesToFormattedTime(avgWaitTime).bold);
	console.log('- Average return time: ' + Utils.minutesToFormattedTime(avgReturnTime).bold);
}
