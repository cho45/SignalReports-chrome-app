signalReportsApp.filter('frequency', function () {
	return function (frequency) {
		return String(+frequency * 1e6).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,').replace(/,/, '.').slice(0, -1);
	};
});


signalReportsApp.filter('loc', function () {
	return loc;
});
