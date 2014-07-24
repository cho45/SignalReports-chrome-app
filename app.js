var signalReportsApp = angular.module('signalReportsApp', []);

signalReportsApp.Utils = {
	RST : {
		R : [
			"Unreadable",
			"Barely readable, occasional words distinguishable",
			"Readable with considerable difficulty",
			"Readable with practically no difficulty",
			"Perfectly readable"
		],
		S : [
			"Faint signal, barely perceptible",
			"Very weak",
			"Weak",
			"Fair",
			"Fairly good",
			"Good",
			"Moderately strong",
			"Strong",
			"Very strong signals"
		],
		T : [
			"Sixty cycle a.c or less, very rough and broad",
			"Very rough a.c., very harsh and broad",
			"Rough a.c. tone, rectified but not filtered",
			"Rough note, some trace of filtering",
			"Filtered rectified a.c. but strongly ripple-modulated",
			"Filtered tone, definite trace of ripple modulation",
			"Near pure tone, trace of ripple modulation",
			"Near perfect tone, slight trace of modulation",
			"Perfect tone, no trace of ripple or modulation of any kind"
		]
	},

	setDateAndTime : function (entry) {
		if (!entry.date || !entry.time) {
			var dt = new Date(entry.datetime);
			entry.date = dt.strftime('%Y-%m-%d');
			entry.time = dt.strftime('%H:%M');
		}
		return entry;
	}
};

// from http://www.adif.org/304/ADIF_304.htm#Band_Enumeration
signalReportsApp.BANDS = [
	{ band : '2190m', lowerFreq : 0.136, upperFreq : 0.137 },
	{ band : '630m', lowerFreq : 0.472, upperFreq : 0.479 },
	{ band : '560m', lowerFreq : 0.501, upperFreq : 0.504 },
	{ band : '160m', lowerFreq : 1.8, upperFreq : 2.0 },
	{ band : '80m', lowerFreq : 3.5, upperFreq : 4.0 },
	{ band : '60m', lowerFreq : 5.102, upperFreq : 5.4065 },
	{ band : '40m', lowerFreq : 7.0, upperFreq : 7.3 },
	{ band : '30m', lowerFreq : 10.0, upperFreq : 10.15 },
	{ band : '20m', lowerFreq : 14.0, upperFreq : 14.35 },
	{ band : '17m', lowerFreq : 18.068, upperFreq : 18.168 },
	{ band : '15m', lowerFreq : 21.0, upperFreq : 21.45 },
	{ band : '12m', lowerFreq : 24.890, upperFreq : 24.99 },
	{ band : '10m', lowerFreq : 28.0, upperFreq : 29.7 },
	{ band : '6m', lowerFreq : 50, upperFreq : 54 },
	{ band : '4m', lowerFreq : 70, upperFreq : 71 },
	{ band : '2m', lowerFreq : 144, upperFreq : 148 },
	{ band : '1.25m', lowerFreq : 222, upperFreq : 225 },
	{ band : '70cm', lowerFreq : 420, upperFreq : 450 },
	{ band : '33cm', lowerFreq : 902, upperFreq : 928 },
	{ band : '23cm', lowerFreq : 1240, upperFreq : 1300 },
	{ band : '13cm', lowerFreq : 2300, upperFreq : 2450 },
	{ band : '9cm', lowerFreq : 3300, upperFreq : 3500 },
	{ band : '6cm', lowerFreq : 5650, upperFreq : 5925 },
	{ band : '3cm', lowerFreq : 10000, upperFreq : 10500 },
	{ band : '1.25cm', lowerFreq : 24000, upperFreq : 24250 },
	{ band : '6mm', lowerFreq : 47000, upperFreq : 47200 },
	{ band : '4mm', lowerFreq : 75500, upperFreq : 81000 },
	{ band : '2.5mm', lowerFreq : 119980, upperFreq : 120020 },
	{ band : '2mm', lowerFreq : 142000, upperFreq : 149000 },
	{ band : '1mm', lowerFreq : 241000, upperFreq : 250000 }
];

signalReportsApp.MODES = [
	'AM',
	'ATV',
	'CHIP',
	'CLO',
	'CONTESTI',
	'CW',
	'DIGITALVOICE',
	'DOMINO',
	'DSTAR',
	'FAX',
	'FM',
	'FSK441',
	'HELL',
	'ISCAT',
	'JT4',
	'JT6M',
	'JT9',
	'JT44',
	'JT65',
	'MFSK',
	'MT63',
	'OLIVIA',
	'OPERA',
	'PAC',
	'PAX',
	'PKT',
	'PSK',
	'PSK2K',
	'Q15',
	'ROS',
	'RTTY',
	'RTTYM',
	'SSB',
	'SSTV',
	'THOR',
	'THRB',
	'TOR',
	'V4',
	'VOI',
	'WINMOR',
	'WSPR'
];


//signalReportsApp.config(function ($httpProvider) {
//	 $httpProvider.defaults.headers.post =
//	 $httpProvider.defaults.headers.put =
//	 $httpProvider.defaults.headers.patch = {
//		 'Content-Type' : 'application/x-www-form-urlencoded' 
//	 };
//});

//signalReportsApp.factory('$exceptionHandler', function () {
//	return function (exception, cause) {
//		alert(exception.message);
//	};
//});


