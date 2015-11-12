var assert = require('assert');

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
	ensureIndexes: ensureIndexes
};