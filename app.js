var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/riobus';

var findBusesCloseToCoordinate = function(db, line, longitude, latitude, callback) {
	db.collection('bus').aggregate([
	{ 
		"$geoNear": { 

			"near": { "type": "Point", "coordinates": [ latitude, longitude ] },
			"maxDistance": 100,
			"distanceField": "dist.calculated",
			"includeLocs": "dist.location",
			"spherical": true,
			"query": { "line": line }
		}
	},
	{ 
         "$sort": { "dist.calculated": -1 } // Sort the nearest first
    }
    ]).toArray(function(err, result) {
	 	assert.equal(err, null);
     	callback(result);
 	});
 }

 var findBusLines = function(db, callback) {
 	var cursor = db.collection('bus_stop').find({ "line": "300" });
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

 var setIndexes = function(db, callback) {
 	db.collection('bus').createIndex(
 		{ "coordinates": "2dsphere" },
 		null,
 		function(err, results) {
 			console.log(results);
 			callback();
 		}
 		);
 };

 MongoClient.connect(url, function(err, db) {
 	assert.equal(null, err);

 	setIndexes(db, function() {
 		console.log('Indexes were set');

 		findBusLines(db, function(busLines) {

 			busLines.forEach(function(line) {
 				console.log("Line " + line.line + ": " + line.spots.length + " bus stops.");

 				line.spots.forEach(function(bus_stop) {

					findBusesCloseToCoordinate(db, line.line, bus_stop.longitude, bus_stop.latitude, function(matches) {
						console.log("- " + matches.length + " buses close to [" + bus_stop.latitude + ", " + bus_stop.longitude + "]");

					    matches.forEach(function(bus) {
					     	console.log("-- Bus " + bus.order + " with distance " + bus.dist.calculated + " (bus: " + bus.dist.location + " - bus_stop: " + bus_stop.latitude + "," + bus_stop.longitude + ")");
					    });

					    if (matches.length) console.log('');
		 			});

	 			});

 			})
 			
 		});
 	});
 });