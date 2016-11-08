function pad(str, size){ return ('        ' + str).substr(-size); }
function padZero(num, size){ return ('000000000' + num).substr(-size); }

function minutesToFormattedTime(minutes) {
	var timeDiffHours = Math.floor(minutes / 60);
	var timeDiffMinutes = Math.floor(minutes % 60);
  if (timeDiffHours > 0) {
	   return timeDiffHours + 'h ' + padZero(timeDiffMinutes,2) + 'min';
  } else {
	   return padZero(timeDiffMinutes,2) + 'min';
  }
}

function formatDateTime(date) {
	return '' + padZero(date.getDate(),2) + '/' + padZero(date.getMonth()+1,2) + '/' + date.getFullYear() + ' ' + padZero(date.getHours(),2) + ':' + padZero(date.getMinutes(),2) + ':' + padZero(date.getSeconds(),2);
}

function formatTime(date) {
	return '' + padZero(date.getHours(),2) + ':' + padZero(date.getMinutes(),2) + ':' + padZero(date.getSeconds(),2);
}

function formatSense(sense) {
	return sense.split(' X ')[0];
}
