'use strict';
const Utils = require('./utils');

class LineStats {
    constructor() {
        this.waitTime = 0;
        this.waitCount = 0;
        this.returnTime = 0;
        this.returnCount = 0;
    }
    
    printStats() {
	    console.log('- Average wait time: ' + Utils.minutesToFormattedTime(this.avgWaitTime()));
	    console.log('- Average return time: ' + Utils.minutesToFormattedTime(this.avgReturnTime()));
    }
    
    // Bus Stop
    addBusStopStats(busStopStats) {
        var avgWaitTime = busStopStats.avgTimeBetweenBuses();
        if (avgWaitTime > 0) {
            this.addWaitTimePoint(avgWaitTime);
        }
    }
    
    // Average wait time
    addWaitTimePoint(waitTime) {
        this.waitTime += waitTime;
        this.waitCount++;
    }
    
    avgWaitTime() {
        return this.waitTime / this.waitCount;
    }
    
    // Average return time
    addReturnTimePoint(returnTime) {
        this.returnTime += returnTime;
        this.returnCount++;
    }
    
    avgReturnTime() {
        return this.returnTime / this.returnCount;
    }
}

module.exports = LineStats;