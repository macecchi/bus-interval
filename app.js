var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/riobus';
var riobus = require('./operations');

assert(process.argv.length > 2, 'Missing bus line parameter.');

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);

	console.log('Redefining indexes...');
	riobus.ensureIndexes(db, function() {
		console.log('Indexes are set.');

		var searchLines = [];
		process.argv.slice(2).forEach(function(arg) {
			searchLines.push(arg);
		});
		console.log('Starting with lines ' + searchLines);

		riobus.findBusLines(db, searchLines, function(busLines) {

			busLines.forEach(function(line) {
				console.log("Line " + line.line + ": " + line.spots.length + " bus stops");

				var totalBusStops = line.spots.length;
				var countStops = 0;

				line.spots.forEach(function(bus_stop) {
					riobus.findBusesCloseToCoordinate(db, line.line, bus_stop.longitude, bus_stop.latitude, function(matches) {
						console.log("- [" + ++countStops + "/" + totalBusStops + "] " + matches.length + " buses close to [" + bus_stop.latitude + ", " + bus_stop.longitude + "]");

						var previousMatch = {};
						var previousMatches = [];
						
					    matches.forEach(function(bus) {
					    	var time = new Date(bus.timestamp);
					    	var duplicated;
					    	var minutesDiff = 99999;

					    	if (bus.order == previousMatch.order) {
					    		previousMatches.push(previousMatch);
					    		previousMatches.forEach(function(pastMatch) {
					    			minutesDiff = Math.min(minutesDiff, Math.round(Math.abs(time - new Date(pastMatch.timestamp))/1000/60));
					    		});
					    		duplicated = minutesDiff < 10;
					    	}
					    	else {
					    		previousMatches = [];
					    		minutesDiff = 99999;
					    	}

					     	console.log((!duplicated ? "--" : "---") + " " + bus.order + " with distance " + Math.ceil(bus.dist.calculated) + "m (bus: " + bus.dist.location + " @ " + time.toLocaleString() + ")");
					    	previousMatch = bus;
					    });

					    if (matches.length > 0) console.log('');
					    if (countStops == totalBusStops) process.exit(0);
		 			});
	 			});
			});
		});
	});
});