var margin = {top: 10, right: 0, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(10, "");

var svg = d3.select("#graph").append("svg:svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("stats/325.json", function(error, data) {
  if (error) return console.warn(error);
    var hourlyWaitTimes = []
    var hours = [];
    for (var hour=0; hour<24; hour++) {
        hours.push(hour);
        // hours.push(hour + '-' + (hour+1) + 'h00');
        hourlyWaitTimes.push({ hour: hour, waitTime: data.hourlyAvgWaitTimes[hour]});
    }
  x.domain(hours);
  y.domain([0, d3.max(data.hourlyAvgWaitTimes)]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Tempo de espera");

  svg.selectAll(".bar")
      .data(hourlyWaitTimes)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.hour); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.waitTime); })
      .attr("height", function(d) { return height - y(d.waitTime); });

      $('#avg-return-time').html(data.avgReturnTime + ' min');
      $('#avg-wait-time').html(data.avgWaitTime + ' min');
});
