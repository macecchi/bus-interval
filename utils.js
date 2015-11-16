function minutesToFormattedTime(minutes) {
	var timeDiffHours = Math.floor(minutes / 60);
	var timeDiffMinutes = Math.floor(minutes % 60);
	var formattedHours = (timeDiffHours > 0) ? ('' + timeDiffHours + 'h') : '';
	return formattedHours + timeDiffMinutes + 'min';
}

module.exports = {
	minutesToFormattedTime: minutesToFormattedTime
}