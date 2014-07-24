
chrome.runtime.onInstalled.addListener(function () {
	console.log('installed');
});


chrome.app.runtime.onLaunched.addListener(function (launchData) {
	chrome.app.window.create('views/index.html', {
		'id' : 'main',
		'frame' : 'none',
//		'innerBounds' : {
//			'width' : 1024,
//			'height' : 100
//		},
		'bounds': {
			'width'    : 1240,
			'height'   : 800
		}
	});
});

chrome.app.runtime.onRestarted.addListener(function () {
	console.log('Restarted');
});
