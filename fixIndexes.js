var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var url = 'mongodb://localhost:27017/riobus';
var riobus = require('./operations');

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);

	console.log('Redefining indexes...');
	riobus.ensureIndexes(db, 'bus_history_old', function() {
		console.log('Indexes are set.');
		process.exit() ;
	});
});