"use strict";
/* global process; */
var assert = require('assert');
var RioBus = require('./operations');

var db;

RioBus.connect(function(err, _db) {
	assert.equal(null, err);
    db = _db;

    findBusStopsForAllLines(function(linesInfo) {
        for (var lineInfo of linesInfo) {
            if (lineInfo.line != '913') continue;
            
            console.log('Searching with line ' + lineInfo.line + '\n');
            processLine(lineInfo, function() {
                process.exit(0);
            });
        }
    });
    
});

function processLine(lineInfo, callback) {
    var line = lineInfo.line;
    prepareLineForProcessing(line, function() {
        var processedSpots = [];
        
        for (var i=0; i<lineInfo.spots.length; i++) {
            var stopSpot = lineInfo.spots[i];
            
            processAndUpdateStop(line, stopSpot, function(stopSpotProcessed) {
                console.log('Bus stop processed: ', stopSpotProcessed);
                processedSpots.push(stopSpotProcessed);
                
                if (processedSpots.length == lineInfo.spots.length) {
                    lineInfo.spots = processedSpots;
                    updateLineSpots(lineInfo, function() {
                        console.log('Done processing ' + processedSpots.length + ' bus stops.');
                        dropTempCollection(line, function() {
                            callback();
                        });
                    });
                }
            });
        }
        
    });
}

function prepareLineForProcessing(line, callback) {
    db.collection('itinerary').aggregate([
        { "$match": { "line": line } },
        { "$unwind": "$spots" },
        { "$project": { "_id": false, "returning": "$spots.returning", "coordinates": ["$spots.latitude", "$spots.longitude"] } },
        { "$out": tempCollectionNameFromLine(line) }
    ]).toArray(function(err, results) {
	 	assert.equal(err, null);
        db.collection(tempCollectionNameFromLine(line)).createIndex({ "coordinates": "2dsphere" }, null, function(err, results) {
            assert.equal(err, null);
            callback();
        });
    });
}

function tempCollectionNameFromLine(line) {
    return `stops_itinerary_temp_${line}`;
}

function findBusStopsForAllLines(callback) {
    db.collection('bus_stop').find({}).toArray(function(err, linesInfo) {
        assert.equal(err, null);
        callback(linesInfo);
    });
}

function findItinerarySpotClosestToCoordinate(line, longitude, latitude, callback) {
	db.collection(tempCollectionNameFromLine(line)).aggregate([
        { 
            "$geoNear": { 
                "near": { "type": "Point", "coordinates": [ latitude, longitude ] },
                "maxDistance": 99,
                "distanceField": "dsist",
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
 
function processAndUpdateStop(line, stopSpot, callback) {
    findItinerarySpotClosestToCoordinate(line, stopSpot.longitude, stopSpot.latitude, function(match) {
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

function dropTempCollection(line, callback) {
    db.collection(tempCollectionNameFromLine(line)).drop(function(err, results) {
        assert.equal(err, null);
        callback();
    });
}