/* global process; */
var assert = require('assert');
var Config = require('./config');
var RioBus = require('./operations');

RioBus.connect(function(err, db) {
	assert.equal(null, err);

	console.log('Redefining indexes...');
	RioBus.ensureIndexes(db, Config.schema.busHistoryCollection, function() {
		console.log('Indexes are set for collection ' + Config.schema.busHistoryCollection + '.');
		process.exit();
	});
});