var LineStats = {};

LineStats.statsDirPath = 'stats';

LineStats.init = function(formSelector) {
  this.datasetForm = $(formSelector);
  this.datasetSelect = this.datasetForm.find('select');

  var _this = this;
  this.datasetForm.change(function(e) {
    var selectedDataset = _this.datasetSelect.val();
    _this.processStatsFromFile(_this.statsDirPath + '/' + selectedDataset);
    e.preventDefault();
  });

  this.Graph.init();
  this.loadAvailableDatasets();
}

LineStats.loadAvailableDatasets = function() {
  var _this = this;

  $.getJSON(this.statsDirPath + '/datasets.json', function(availableDatasets) {
    // Display available datasets
    for (var dataset of availableDatasets) {
      _this.datasetSelect.append('<option value="' + dataset + '">' + dataset + '</option>');
    }

    // Pre-load the first available dataset
    _this.processStatsFromFile(_this.statsDirPath + '/' + availableDatasets[0]);
  }).fail(function(error) {
    alert('Ocorreu um erro carregando a lista de datasets disponíveis.', error);
    console.warn(error);
  });
}

LineStats.processStatsFromFile = function(filePath) {
  var _this = this;

  $.getJSON(filePath, function(data) {
    _this.calcAvgWaitTime(data);
    _this.updatePageInfoWithData(data);
    _this.Graph.loadData(data);
  }).fail(function(error) {
    alert('Ocorreu um erro carregando o dataset.', error);
    console.warn(error);
  });
}

LineStats.updatePageInfoWithData = function(data) {
  $('.line-title').html(data.line);

  var date = new Date(data.date);
  $('.date-title').html(date.toLocaleDateString());

  $('.live-tracking-url').attr('href', 'http://riob.us/?' + data.line);

  $('.avg-return-time').html(minutesToFormattedTime(data.avgReturnTime));
  $('.avg-wait-time').html(minutesToFormattedTime(data.avgWaitTime));
  $('.avg-frequency').html(minutesToFormattedTime(data.avgFrequency));
}

LineStats.calcAvgWaitTime = function(data) {
  data.avgWaitTime = data.avgFrequency / 2;
}
