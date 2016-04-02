/* global process; */
var assert = require('assert');
var RioBus = require('./operations');

assert(process.argv.length > 2, 'Missing bus line parameter.');

var lastArg = process.argv[process.argv.length-1];
assert(!isNaN(lastArg), 'Missing bus line parameter.');
var line = lastArg;
var db;

console.log('Searching with line ' + line + '\n');

RioBus.connect(function(err, _db) {
	assert.equal(null, err);
    db = _db;

	prepareLineForProcessing(line, function() {
        findBusStopsForLine(line, function(lineInfo) {
            var processedSpots = [];
            
            for (var i=0; i<lineInfo.spots.length; i++) {
                var stopSpot = lineInfo.spots[i];
                
                processAndUpdateStop(stopSpot, function(stopSpotProcessed) {
                    console.log('Bus stop processed: ', stopSpotProcessed);
                    processedSpots.push(stopSpotProcessed);
                    
                    if (processedSpots.length == lineInfo.spots.length) {
                        lineInfo.spots = processedSpots;
                        updateLineSpots(lineInfo, function() {
                            console.log('Done processing ' + processedSpots.length + ' bus stops.');
                            process.exit(0);
                        });
                    }
                });
            }
            
        });
    });
    
});

function prepareLineForProcessing(line, callback) {
    db.collection('itinerary').aggregate([
        { "$match": { "line": line } },
        { "$unwind": "$spots" },
        { "$project": { "_id": false, "returning": "$spots.returning", "coordinates": ["$spots.latitude", "$spots.longitude"] } },
        { "$out": "stops_itinerary_temp" }
    ]).toArray(function(err, results) {
	 	assert.equal(err, null);
        db.collection('stops_itinerary_temp').createIndex({ "coordinates": "2dsphere" }, null, function(err, results) {
            assert.equal(err, null);
            callback();
        });
    });
}

function findBusStopsForLine(line, callback) {
    db.collection('bus_stop').find({ "line": line }).toArray(function(err, linesInfo) {
        assert.equal(err, null);
        callback(linesInfo[0]);
    });
}

function findItinerarySpotClosestToCoordinate(longitude, latitude, callback) {
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
 
function processAndUpdateStop(stopSpot, callback) {
    findItinerarySpotClosestToCoordinate(stopSpot.longitude, stopSpot.latitude, function(match) {
        if (match) {
            stopSpot.returning = match.returning;
        }
        callback(stopSpot);
    });
}

function updateLineSpots(lineDocument, callback) {
    db.collection('bus_stop').update({ "_id": lineDocument._id }, lineDocument, function(err, result) {
	 	assert.equal(err, null);
     	callback();
    });
}