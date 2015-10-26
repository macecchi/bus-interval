var assert = require('assert');

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

var findBusLines = function(db, line, callback) {
	var cursor = db.collection('bus_stop').find({ "line": line });
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

var ensureIndexes = function(db, callback) {
	db.collection('bus').createIndex(
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