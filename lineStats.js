'use strict';
const jsonfile = require('jsonfile')
const Utils = require('./utils');

class LineStats {
  constructor(line) {
    this.line = line;
    this.waitTime = 0;
    this.waitCount = 0;
    this.returnTime = 0;
    this.returnCount = 0;
    this.hourlyWaitTimes = [];
    for (let hour=0; hour<24; hour++) {
      this.hourlyWaitTimes[hour] = [];
    }
  }

  printStats() {
    console.log('- Average wait time: ' + Utils.minutesToFormattedTime(this.avgWaitTime()));
    console.log('- Average return time: ' + Utils.minutesToFormattedTime(this.avgReturnTime()));
    this.printHourlyStats();
  }

  printHourlyStats() {
    console.log('- Hourly average wait times:');
    let hourlyAverages = this.avgHourlyWait();
    for (let hour=0; hour<24; hour++) {
      let average = hourlyAverages[hour];
      console.log('-- ' + hour + '-' + (hour+1) + 'h: ' + Utils.minutesToFormattedTime(average));
    }
  }

  exportStats() {
    var stats = {
      line: this.line.line,
      avgFrequency: this.avgWaitTime(),
      avgReturnTime: this.avgReturnTime(),
      hourlyFrequencies: this.avgHourlyWait()
    };

    jsonfile.spaces = 4;
    jsonfile.writeFileSync('stats/' + this.line.line + '.json', stats);
  }

  // Bus Stop
  addBusStopStats(busStopStats) {
    var avgWaitTime = busStopStats.avgTimeBetweenBuses();
    if (avgWaitTime > 0) {
      this.addWaitTimePoint(avgWaitTime);
    }

    var hourlyWaitTimes = busStopStats.hourlyAvgWaitTime();
    for (let hour=0; hour<24; hour++) {
      this.hourlyWaitTimes[hour] = this.hourlyWaitTimes[hour].concat(hourlyWaitTimes[hour]);
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

  // Hourly Wait
  avgHourlyWait() {
    let averages = [];

    for (let hour=0; hour<24; hour++) {
      let total = 0;
      let hourAverages = this.hourlyWaitTimes[hour];
      for (let average of hourAverages) {
        total += average;
      }

      if (hourAverages.length > 0) {
        let hourAverage = total / hourAverages.length;
        averages[hour] = hourAverage;
      } else {
        averages[hour] = 0;
      }
    }

    return averages;
  }
}

module.exports = LineStats;
