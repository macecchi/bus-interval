"use strict";
/* global process; */
const assert = require('assert');
const colors = require('colors');
const Config = require('./config');
const LineStats = require('./lineStats');
const RioBus = require('./operations');
const Utils = require('./utils');
const wait = require('wait.for-es6');

// Handle arguments
assert(process.argv.length > 2, 'Missing bus line parameter.');

let showDuplicates = (process.argv.indexOf('--show-duplicates') > -1);
let filterSpot = (process.argv.indexOf('--stop') > -1) ? process.argv[process.argv.indexOf('--stop')+1] : -1;

let searchLine = process.argv[process.argv.length-1];
assert(!isNaN(searchLine), 'Missing bus line parameter.');

console.log('Searching with line ' + searchLine + '\n');
if (filterSpot != -1) console.log('Filtering only bus stop with sequence #' + filterSpot);

console.time('Total');

function* main() {
	let db = yield wait.for(RioBus.connect);

	console.log('Loading bus stops information...');
	let line = yield wait.for(RioBus.findBusStopsForLine, db, searchLine);
	if (!line) {
		console.log('Line not found.');
		process.exit(1);
	}
	
	// Check if bus stops information is present before continuing
	var totalBusStops = line.spots.length;
	if (totalBusStops == 0) {
		console.log('No bus stops were found for the selected lines. App will terminate.');
		process.exit(2);
	}
	
	console.log('Total of ' + totalBusStops + ' bus stops were found for the selected lines.\n');

	console.time('LineOnDate Query');
	console.log('Finding buses for line on date...');
	
	yield wait.for(RioBus.findBusesFromLineOnDate, db, searchLine);
	console.log('Found history for line on date. Saved to temporary collection."');
	console.timeEnd('LineOnDate Query');
	
	console.time('GeoNear Query');
	console.log("Line " + line.line + ": " + line.spots.length + " bus stops\n");
	
	var lineStats = new LineStats();

	totalBusStops = line.spots.length;
	var countStops = 0;
	
	for (let bus_stop of line.spots) {
		// Skip if it doesn't match our filter
		if (filterSpot != -1 && bus_stop.sequential != filterSpot) continue;
		
		var busStopHistory = [];
		
		let matches = yield wait.for(RioBus.findBusesCloseToCoordinate, db, line, bus_stop.longitude, bus_stop.latitude, bus_stop.returning);
		console.log(colors.bold.bgWhite.black("[" + ++countStops + "/" + totalBusStops + "] Bus stop with sequence " + bus_stop.sequential + " at [" + bus_stop.latitude + ", " + bus_stop.longitude + "]"));

		var previousMatch = {};
		var previousMatches = [];
		
		console.log(colors.green('Found ' + matches.length + ' occurences within range of bus stop'));
		for (let bus of matches) {
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
				} else {
					duplicated = false;
				}
			} else {
				previousMatches = [];
				minutesDiff = Number.POSITIVE_INFINITY;
				duplicated = false;
			}

			if (!duplicated) {
				busStopHistory.push(bus);
				// console.log("- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + " towards " + Utils.formatSense(bus.sense) + ")");
			} else if (showDuplicates) {
				// console.log("-- " + bus.order + " with distance " + Utils.pad(Math.ceil(bus.dist.calculated),2) + "m (bus: ➤ " + Utils.pad(bus.direction,3) + " @ " + Utils.formatDateTime(time) + " towards " + Utils.formatSense(bus.sense) + ")");
			}

			previousMatch = bus;
		}
		
		if (matches.length > 0) {
			// Generate statistics for bus stop
			console.log(colors.yellow('\nStatistics - Bus stop #' + bus_stop.sequential + ':'));
			
			var busStopStats = RioBus.calculateTimeBetweenBuses(busStopHistory);
			busStopStats.printStats();
			
			lineStats.addBusStopStats(busStopStats);
			
			var returnStats = RioBus.calculateBusReturnTimes(busStopHistory);
			if (!isNaN(returnStats.avgReturnTime) && returnStats.avgReturnTime > 0) {
				lineStats.addReturnTimePoint(returnStats.avgReturnTime);
			}
		}
		
		console.log('');
	}
	
	console.timeEnd('GeoNear Query');
	console.timeEnd('Total');
	
	console.log('Line stats:');
	lineStats.printStats();
	process.exit(0);
}

wait.launchFiber(main);
