function minutesToFormattedTime(minutes) {
	var timeDiffHours = Math.floor(minutes / 60);
	var timeDiffMinutes = Math.floor(minutes % 60);
	return '' + timeDiffHours + 'h' + timeDiffMinutes + 'min';
}

module.exports = {
	minutesToFormattedTime: minutesToFormattedTime
}