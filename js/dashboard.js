var graphContainer = '#graph';
var date = '2015-07-05';
var statsFolder = 'stats';
var line = '324';

var margin = {top: 10, right: 0, bottom: 40, left: 40},
width = $(graphContainer).width() - margin.left - margin.right,
height = $(graphContainer).height() - margin.top - margin.bottom;

var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
var y = d3.scale.linear().range([height, 0]);
var xAxis = d3.svg.axis().scale(x).orient("bottom");
var yAxis = d3.svg.axis().scale(y).orient("left");

var svg = d3.select(graphContainer).append("svg:svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.append("g")
.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

processStatsFromFile('stats/' + date + '/' + line + '.json');

function processStatsFromFile(filePath) {
  d3.json(filePath, function(error, data) {
    if (error) return console.warn(error);

    calcAvgWaitTime(data);
    updatePageInfoWithData(data);

    var hourlyFrequencies = []
    var hours = [];
    for (var hour=0; hour<24; hour++) {
      var hourString = hour + '-' + (hour+1)%24 + 'h'; // next hour
      hours.push(hourString);
      hourlyFrequencies.push({ hour: hourString, waitTime: data.hourlyFrequencies[hour]});
    }

    x.domain(hours);
    y.domain([0, d3.max(data.hourlyFrequencies)]);

    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .attr("y", 10)
    .attr("x", 0)
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

    svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Frequência média");

    // Draw bar
    svg.selectAll(".bar")
    .data(hourlyFrequencies)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(d.hour); })
    .attr("width", x.rangeBand())
    .attr("y", function(d) { return y(d.waitTime); })
    .attr("height", function(d) { return height - y(d.waitTime); });
  });
}

function updatePageInfoWithData(data) {
  $('.line-title').html(data.line);

  var date = new Date(data.date);
  $('.date-title').html(date.toLocaleDateString('pt-BR'));

  $('.avg-return-time').html(minutesToFormattedTime(data.avgReturnTime));
  $('.avg-wait-time').html(minutesToFormattedTime(data.avgWaitTime));
  $('.avg-frequency').html(minutesToFormattedTime(data.avgFrequency));
}

function calcAvgWaitTime(data) {
  data.avgWaitTime = data.avgFrequency / 2;
}
