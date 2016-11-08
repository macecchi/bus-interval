LineStats.Graph = {};
LineStats.Graph.container = '#graph';

LineStats.Graph.init = function() {
  var margin = {top: 10, right: 0, bottom: 40, left: 40};
  this.width = $(this.container).width() - margin.left - margin.right;
  this.height = $(this.container).height() - margin.top - margin.bottom;

  this.x = d3.scale.ordinal().rangeRoundBands([0, this.width], 0.1);
  var xAxis = d3.svg.axis().scale(this.x).orient("bottom");

  this.y = d3.scale.linear().range([this.height, 0]).domain([0, 60]);
  var yAxis = d3.svg.axis().scale(this.y).orient("left");

  this.svg = d3.select(this.container).append("svg:svg")
  .attr("width", this.width + margin.left + margin.right)
  .attr("height", this.height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  this.hours = [];

  for (var hour=0; hour<24; hour++) {
    var hourString = hour + '-' + (hour+1)%24 + 'h'; // next hour
    this.hours.push(hourString);
  }

  this.x.domain(this.hours);

  this.svg.append("g")
  .attr("class", "x axis")
  .attr("transform", "translate(0," + this.height + ")")
  .call(xAxis)
  .selectAll("text")
  .attr("y", 10)
  .attr("x", 0)
  .attr("transform", "rotate(-45)")
  .style("text-anchor", "end");

  this.svg.append("g")
  .attr("class", "y axis")
  .call(yAxis)
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 6)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .text("Frequência média");
}

LineStats.Graph.loadData = function(data) {
  var _this = this;

  // Update data source
  var hourlyFrequencies = []
  for (var hour=0; hour<24; hour++) {
    hourlyFrequencies.push({ hour: this.hours[hour], waitTime: data.hourlyFrequencies[hour]});
  }

  // Clear previous stats
  this.svg.selectAll(".bar").remove();

  // Draw bars
  this.svg.selectAll(".bar")
  .data(hourlyFrequencies)
  .enter().append("rect")
  .attr("class", "bar")
  .attr("x", function(d) { return _this.x(d.hour); })
  .attr("width", this.x.rangeBand())
  .attr("y", function(d) { return _this.y(d.waitTime); })
  .attr("height", function(d) { return _this.height - _this.y(d.waitTime); });
}
