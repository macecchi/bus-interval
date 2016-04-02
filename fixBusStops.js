/* global process; */
var assert = require('assert');
var RioBus = require('./operations');

assert(process.argv.length > 2, 'Missing bus line parameter.');

var lastArg = process.argv[process.argv.length-1];
assert(!isNaN(lastArg), 'Missing bus line parameter.');
var searchLine = lastArg;

console.log('Searching with line ' + searchLine + '\n');

RioBus.connect(function(err, db) {
	assert.equal(null, err);

    identifyBusStopDirectionsFromItinerary(db, searchLine, function() {
        process.exit(0);
    });
});

function identifyBusStopDirectionsFromItinerary(db, line, callback) {
    prepareLineForMatchingSpots(db, line, function(results) {
        console.log(results);
        callback();
    });
}

function prepareLineForMatchingSpots(db, line, callback) {
	db.collection('itinerary').aggregate([
        { "$match": { "line": line } },
        { "$unwind": "$spots" },
        { "$project": { "_id": false, "returning": "$spots.returning", "coordinates": ["$spots.latitude", "$spots.longitude"] } },
        { "$out": "stops_itinerary_temp" }
    ]).toArray(function(err, results) {
	 	assert.equal(err, null);
        db.collection('stops_itinerary_temp').createIndex({ "coordinates": "2dsphere" }, null, function(err, results) {
            assert.equal(err, null);
            db.collection('stops_itinerary_temp').find({}).toArray(function(err, itinerarySpots) {
                db.collection('bus_stop').find({ "line": line }).toArray(function(err, linesInfo) {
                    assert.equal(err, null);
                    var lineInfo = linesInfo[0];
                    
                    var processedSpots = [];
                    for (var i=0; i<lineInfo.spots.length; i++) {
                        var stopSpot = lineInfo.spots[i];
                        processAndUpdateStop(db, stopSpot, function(stopSpotProcessed) {
                            console.log('Bus stop processed: ', stopSpotProcessed);
                            processedSpots.push(stopSpotProcessed);
                            if (processedSpots.length == lineInfo.spots.length) {
                                lineInfo.spots = processedSpots;
                                updateLineSpots(db, lineInfo, function() {
                                    callback();
                                });
                            }
                        });
                    }
                });
            });
        });
 	});
}

function findItinerarySpotClosestToCoordinate(db, longitude, latitude, callback) {
	db.collection('stops_itinerary_temp').aggregate([
        { 
            "$geoNear": { 
                "near": { "type": "Point", "coordinates": [ latitude, longitude ] },
                "maxDistance": 99,
                "distanceField": "dist",
                "spherical": true,
            }
        },
        { 
            "$sort": {
                "order": 1,
                "dist.calculated": 1
            }
        },
        {
            "$limit": 1
        }
    ]).toArray(function(err, result) {
	 	assert.equal(err, null);
     	callback(result[0]);
 	});
 }
 
function processAndUpdateStop(db, stopSpot, callback) {
    findItinerarySpotClosestToCoordinate(db, stopSpot.longitude, stopSpot.latitude, function(match) {
        if (match) {
            stopSpot.returning = match.returning;
        }
        callback(stopSpot);
    });
}

function updateLineSpots(db, lineDocument, callback) {
    db.collection('bus_stop').update({ "_id": lineDocument._id }, lineDocument, function(err, result) {
	 	assert.equal(err, null);
     	callback();
    });
}