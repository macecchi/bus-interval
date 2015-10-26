var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/riobus';
var riobus = require('./operations');

assert(process.argv.length > 2, 'Missing bus line parameter.');

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);

	riobus.ensureIndexes(db, function() {
		console.log('Indexes are correct');

		var searchLines = process.argv[2];
		console.log('Starting with line ' + searchLines);

		riobus.findBusLines(db, searchLines, function(busLines) {

			busLines.forEach(function(line) {
				console.log("Line " + line.line + ": " + line.spots.length + " bus stops.");

				var totalBusStops = line.spots.length;
				var countStops = 0;

				line.spots.forEach(function(bus_stop) {
					riobus.findBusesCloseToCoordinate(db, line.line, bus_stop.longitude, bus_stop.latitude, function(matches) {
						console.log("- [" + countStops + "/" + totalBusStops + "] " + matches.length + " buses close to [" + bus_stop.latitude + ", " + bus_stop.longitude + "]");

					    matches.forEach(function(bus) {
					     	console.log("-- " + bus.order + " with distance " + bus.dist.calculated + " (bus: " + bus.dist.location + ")");
					    });

					    if (matches.length > 0) console.log('');
					    if (++countStops == totalBusStops) process.exit(0);
		 			});
	 			});
			});
		});
	});
});