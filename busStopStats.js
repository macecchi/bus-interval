'use strict';
const Utils = require('./utils');

class BusStopStats {
    constructor() {
        this.timeDiffs = [];
        this.hourlyTimeDiffs = [];
        for (let i=0; i<24; i++) {
            this.hourlyTimeDiffs[i] = [];
        }
    }
    
    printStats() {
        var average = this.avgTimeBetweenBuses();
        process.stdout.write('* Average time between buses: ' + Utils.minutesToFormattedTime(average).bold);
        
        var stdDeviation = this.avgTimeBetweenBusesStdDev(average);
        process.stdout.write(' (std. deviation: ' + Utils.minutesToFormattedTime(stdDeviation) + ')\n');
    }
    
    // Average wait time
    addTimeDiffPoint(timeDiff, time) {
        this.timeDiffs.push(timeDiff);
        
        let hour = time.getHours();
        this.hourlyTimeDiffs[hour].push(timeDiff);
    }
    
    avgTimeBetweenBuses() {
        if (this.timeDiffs.length < 2) return 0;
        
        var total = 0;
        for (let timeDiff of this.timeDiffs) {
            total += timeDiff;
        }
        return total/this.timeDiffs.length;
    }
    
    // Average return time
    avgTimeBetweenBusesStdDev(average) {
        var total = 0;
        for (let timeDiff of this.timeDiffs) {
            total += Math.pow(timeDiff - average, 2);
        }
        return Math.sqrt(total/(this.timeDiffs.length-1));
    }
    
    
    // Hourly average
    hourlyAvgWaitTime() {
        let averages = [];
        
        for (let hour=0; hour<24; hour++) {
            let total = 0;
            for (let timeDiff of this.hourlyTimeDiffs[hour]) {
                total += timeDiff;
            }
            
            if (this.hourlyTimeDiffs[hour].length > 0) {
                let hourAverage = total / this.hourlyTimeDiffs[hour].length;
                averages[hour] = hourAverage;
            } else {
                averages[hour] = 0;
            }
        }
        
        return averages;
    }
    
}

module.exports = BusStopStats;