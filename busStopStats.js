'use strict';
const Utils = require('./utils');

class BusStopStats {
  constructor() {
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
    let hour = time.getHours();
    this.hourlyTimeDiffs[hour].push(timeDiff);
  }

  avgTimeBetweenBuses() {
    var total = 0, count = 0;

    for (let hour=0; hour<24; hour++) {
      for (let timeDiff of this.hourlyTimeDiffs[hour]) {
        total += timeDiff;
        count++;
      }
    }

    if (count < 2) return 0;
    return total/count;
  }

  // Average return time
  avgTimeBetweenBusesStdDev(average) {
    var total = 0, count = 0;

    for (let hour=0; hour<24; hour++) {
      for (let timeDiff of this.hourlyTimeDiffs[hour]) {
        total += Math.pow(timeDiff - average, 2);
        count++;
      }
    }

    return Math.sqrt(total/(count-1));
  }


  // Hourly average
  hourlyAvgWaitTime() {
    let averages = [];

    for (let hour=0; hour<24; hour++) {
      let total = 0;
      let hourAverages = this.hourlyTimeDiffs[hour];
      for (let timeDiff of hourAverages) {
        total += timeDiff;
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

module.exports = BusStopStats;
