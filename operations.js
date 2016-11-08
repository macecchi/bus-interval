"use strict";
/* global process; */
let assert = require('assert');
let BusStopStats = require('./busStopStats');
let colors = require('colors');
let MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;
let Config = require('./config');
let Utils = require('./utils');

/**
* Connect to database.
*/
function connect(callback) {
  var config = Config.database;
  var url = `${config.host}:${config.port}/${config.dbName}`;
  if (config.user!=='' && config.pass!=='') url = `${config.user}:${config.pass}@${url}`;
  url = 'mongodb://' + url;
  MongoClient.connect(url, function(err, db) { callback(err, db); });
}

/**
* Find buses of the requested line on a specific date and save it to a separate collection.
* The indexes are also redefined on the new temporary collection.
*/
function findBusesFromLineOnDate(db, line, callback) {
  var tempCollectionName = Config.schema.busHistoryTemporaryCollection;
  var queryInterval = Config.query.dateInterval;
  var found = 0;

  db.collection(tempCollectionName).drop(function(err, response) {
    if (err != null && err.errmsg !== "ns not found") throw err;

    var cursor = db.collection(Config.schema.busHistoryCollection).find({
      "timestamp": { "$gte": new Date(queryInterval[0]), "$lte": new Date(queryInterval[1]) },
      "line": line,
      "sense": { "$nin": ["desconhecido", "indisponível"] }
    });
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
        doc.coordinates = [ doc.latitude, doc.longitude ];
        delete doc.latitude;
        delete doc.longitude;
        db.collection(tempCollectionName).insert(doc);
        found++;
      }
      else {
        ensureIndexes(db, tempCollectionName, function(err) {
          callback(err, found);
        });
      }
    });
  });

}

/**
* Finds vehicles that are within a certain distance from a coordinate.
*/
function findBusesCloseToCoordinate(db, line, longitude, latitude, returning, callback) {
  var tempCollectionName = Config.schema.busHistoryTemporaryCollection;

  db.collection(tempCollectionName).aggregate([
    {
      "$geoNear": {
        "near": { "type": "Point", "coordinates": [ latitude, longitude ] },
        "maxDistance": Config.query.maxDistance,
        "distanceField": "dist.calculated",
        "includeLocs": "dist.location",
        "spherical": true,
        // "query": { "line": line.line, "sense": prepareDirection(line.description, returning) }
        "query": { "line": line.line }
      }
    },
    {
      "$sort": {
        "order": 1,
        "dist.calculated": 1
      }
    }
  ]).toArray(function(err, result) {
    callback(err, result);
  });

}

function prepareDirection(description, returning) {
  let tmp = 'desconhecido';
  if(!returning) tmp = description;
  else if(returning) {
    let tmpDescription = description.split(' X ');
    let aux = tmpDescription[1];
    tmpDescription[1] = tmpDescription[0];
    tmpDescription[0] = aux;
    tmp = tmpDescription.join(' X ');
  }
  return tmp;
}

/**
* Finds bus stops for the specified bus line.
*/
function findBusStopsForLine(db, line, callback) {
  db.collection(Config.schema.busStopsCollection).find({ "line": line }).limit(1).next(function(err, busLine) {
    if (busLine) {
      // Filter repeated bus stops
      var processedStops = {};
      var filteredStops = [];
      for (var stop of busLine.spots) {
        var busStopHash = JSON.stringify([stop.latitude,stop.longitude]);
        if (!processedStops[busStopHash]) {
          filteredStops.push(stop);
          processedStops[busStopHash] = true;
        }
      }
      busLine.spots = filteredStops;
      callback(null, busLine);
    } else {
      callback(err, null);
    }
  });
}

/**
* Calculates time passed for each bus on the bus stop since the previous one arrived.
* @param busStopHistory An array containing the bus history for a bus stop.
*/
function calculateTimeBetweenBuses(busStopHistory) {
  // Order the array by timestamp so that we only have to compare each entry to the last one.
  var busStopHistoryOrdered = busStopHistory.slice().sort(function(a, b) {
    var dateA = new Date(a.timestamp);
    var dateB = new Date(b.timestamp);
    return dateA - dateB;
  });

  let busStopStats = new BusStopStats();

  for (var i=1; i<busStopHistoryOrdered.length; i++) {
    var bus = busStopHistoryOrdered[i];
    var busPrevious = busStopHistoryOrdered[i-1];

    // Time between buses
    var timeDiff = Math.round(Math.abs(new Date(bus.timestamp) - new Date(busPrevious.timestamp))/1000/60);
    busStopStats.addTimeDiffPoint(timeDiff, new Date(bus.timestamp));

    console.log('* Time since last bus: ' + Utils.minutesToFormattedTime(timeDiff).bold + colors.dim(' (between ' + busPrevious.order + ' at ' + Utils.formatTime(busPrevious.timestamp) + ' and ' + bus.order + ' at ' + Utils.formatTime(bus.timestamp) + ')'));
  }

  return busStopStats;
}

/**
* Calculates the return times (time between every arrival of the same bus) for buses on a bus stop.
* @param busStopHistory An array containing the bus history for a bus stop.
*/
function calculateBusReturnTimes(busStopHistory) {
  var previousMatch = {};
  var timeDiffs = [];
  var avgReturnTime = 0;
  var avgReturnTimeBuses = 0;

  busStopHistory.forEach(function(bus) {
    // Return time
    if (bus.order == previousMatch.order) {
      var timeDiffFromLast = Math.round(Math.abs(new Date(bus.timestamp) - new Date(previousMatch.timestamp))/1000/60);
      // Ignore buses with time interval bigger than 4 hours
      if (timeDiffFromLast < 4*60) {
        timeDiffs.push(timeDiffFromLast);
      }
    }
    else {
      if (timeDiffs.length > 0) {
        process.stdout.write('* Return times for order ' + previousMatch.order + ': ');
        var timeDiffSum = 0;
        timeDiffs.forEach(function(timeDiff) {
          process.stdout.write(Utils.minutesToFormattedTime(timeDiff).bold + ' ');
          timeDiffSum += timeDiff;
        });

        var timeDiffAverage = timeDiffSum/timeDiffs.length;
        avgReturnTime += timeDiffAverage;
        avgReturnTimeBuses++;
        process.stdout.write('(avg: ' + Utils.minutesToFormattedTime(timeDiffAverage) + ')\n');
      }
      timeDiffs = [];
    }
    previousMatch = bus;

  });

  avgReturnTime = avgReturnTime / avgReturnTimeBuses;
  return { avgReturnTime: avgReturnTime };
}

/**
* Ensures indexes from 'bus' collection are defined as 2dsphere coordinates.
*/
function ensureIndexes(db, collection, callback) {
  db.collection(collection).createIndex({ "coordinates": "2dsphere" }, null, function(err, results) {
    db.collection(collection).createIndex({ "timestamp": 1, "line": 1 }, null, function(err, results) {
      callback();
    });
  });
};

module.exports = {
  connect: connect,
  findBusesFromLineOnDate: findBusesFromLineOnDate,
  findBusesCloseToCoordinate: findBusesCloseToCoordinate,
  findBusStopsForLine: findBusStopsForLine,
  calculateTimeBetweenBuses: calculateTimeBetweenBuses,
  calculateBusReturnTimes: calculateBusReturnTimes,
  ensureIndexes: ensureIndexes
};
