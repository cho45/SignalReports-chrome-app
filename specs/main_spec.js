function switchToAppWindow (nth) {
	function _switchToAppWindow (n) {
		if (n <= 0) throw "failed to switch to app window";

		browser.driver.getAllWindowHandles().then(function (handles) {
			if (handles.length <= nth) {
				_switchToAppWindow(n--);
			} else {
				browser.driver.switchTo().window(handles[nth]);
			}
		});
	}
	_switchToAppWindow(1000);
}

var String_random = require("string_random.js").String_random;

var SignalReports = function () {
	this.openForm = function () {
		$('a[href="#new"]').click();
		this.console_log();
	};

	this.submitForm = function () {
		$('#input-form form input[type=submit]').click();
		this.console_log();
	};

	this.closeForm = function () {
		$('#input-form .close').click();
		this.console_log();
	};

	this.openSetting = function () {
		$('a[ng-click="openSetting()"]').click();
		this.console_log();
	};

	this.closeSetting = function () {
		$('#setting .close').click();
		this.console_log();
	};

	this.inputs = {
		band         : element(by.model('report.band')),
		freq         : element(by.model('report.freq')),
		mode         : element(by.model('report.mode')),
		my_rig_intl  : element(by.model('report.my_rig_intl')),
		tx_pwr       : element(by.model('report.tx_pwr')),
		call         : element(by.model('report.call')),
		rst_sent     : element(by.model('report.rst_sent')),
		rst_rcvd     : element(by.model('report.rst_rcvd')),
		qso_date     : element(by.model('report.qso_date')),
		time_on      : element(by.model('report.time_on')),
		name_intl    : element(by.model('report.name_intl')),
		qth_intl     : element(by.model('report.qth_intl')),
		notes_intl   : element(by.model('report.notes_intl')),
		my_city_intl : element(by.model('report.my_city_intl'))
	};

	this.console_log = function (done) {
		return this.exec(function (done) {
			var ret = window.__console_log;
			window.__console_log = [];
			done(ret);
		}).then(function (logs) {
			for (var i = 0, len = logs.length; i < len; i++) {
				console.log('[console.log]', logs[i]);
			}
		});
	};

	this.exec = function (func) {
		var args = Array.prototype.slice.call(arguments, 0);
		args[0] = '('+ (func.toString()) + ').apply(null, arguments);';
		return browser.executeAsyncScript.apply(browser, args);
	};

	this.exec(function (done) {
		window.__console_log = [];
		console.log = function () {
			window.__console_log.push(Array.prototype.slice.call(arguments));
		};
		done();
	});
};

describe('SignalReport', function () {
	beforeEach(function () { switchToAppWindow(1) });

	it("test", function () {
		var total = element(by.css('.total'));
		expect(total.getText()).toEqual('Total: 0');

		var app = new SignalReports();
		app.openForm();

		expect($('#input-form').isDisplayed()).toBe(true);
		expect(browser.driver.switchTo().activeElement().getAttribute('ng-model')).toBe('report.call');

		app.inputs.freq.sendKeys('7.010');
		expect(app.inputs.band.getAttribute('value')).toBe('40m');

		app.inputs.mode.sendKeys('cw\t');
		expect(app.inputs.mode.getAttribute('value')).toBe('CW');
		expect($('#input-form').getAttribute('class')).toMatch(/mode-cw/);

		app.inputs.my_rig_intl.sendKeys('FT-450D');
		app.inputs.tx_pwr.sendKeys('50W');

		app.inputs.call.sendKeys('foobar\t');
		expect(app.inputs.call.getAttribute('value')).toBe('FOOBAR');

		app.inputs.rst_sent.sendKeys('599\t');
		expect(app.inputs.qso_date.getAttribute('value')).toMatch(/^\d\d\d\d-\d\d-\d\d$/);
		expect(app.inputs.time_on.getAttribute('value')).toMatch(/^\d\d:\d\d:\d\d$/);

		app.inputs.rst_rcvd.sendKeys('579');
		app.inputs.name_intl.sendKeys('太郎');
		app.inputs.qth_intl.sendKeys('京都市');
		app.inputs.notes_intl.sendKeys('ノート');
		app.submitForm();

		// reopen dialog
		expect($('#input-form').isDisplayed()).toBe(true);
		expect(browser.driver.switchTo().activeElement().getAttribute('ng-model')).toBe('report.call');

		app.closeForm();
		expect($('#input-form').isDisplayed()).toBe(false);

		// check list
		expect(element.all(by.repeater('report in reports')).count()).toBe(1);
		var row = by.repeater('report in reports').row(0);
		expect(element(row.column('call')).getText()).toEqual('FOOBAR');
		expect(element(row.column('mode')).getText()).toEqual('CW');
		expect(element(row.column('my_rig_intl')).getText()).toEqual('FT-450D');
		expect(element(row.column('tx_pwr')).getText()).toEqual('50W');
		// expect(element(row.column('datetime')).getText()).toMatch(/\d\d\d\d-\d\d\d\d \d\d:\d\d:\d\d/);
		expect(element(row.column('rst_sent')).getText()).toEqual('599');
		expect(element(row.column('rst_rcvd')).getText()).toEqual('579');
		expect(element(row.column('name_intl')).getText()).toEqual('太郎');
		expect(element(row.column('qth_intl')).getText()).toEqual('京都市');
		expect(element(row.column('notes_intl')).getText()).toEqual('ノート');

		// re-edit
		element(by.repeater('report in reports').row(0)).click();
		expect($('#input-form').isDisplayed()).toBe(true);
		expect($('#input-form #delete').isDisplayed()).toBe(true);
		app.inputs.notes_intl.clear();
		app.inputs.notes_intl.sendKeys('ノート書き変え');
		app.submitForm();

		browser.driver.sleep(3000);

		// check list
		expect(element.all(by.repeater('report in reports')).count()).toBe(1);
		var row = by.repeater('report in reports').row(0); // no warnings
		expect(element(row.column('call')).getText()).toEqual('FOOBAR');
		expect(element(row.column('mode')).getText()).toEqual('CW');
		expect(element(row.column('my_rig_intl')).getText()).toEqual('FT-450D');
		expect(element(row.column('tx_pwr')).getText()).toEqual('50W');
		expect(element(row.column('rst_sent')).getText()).toEqual('599');
		expect(element(row.column('rst_rcvd')).getText()).toEqual('579');
		expect(element(row.column('name_intl')).getText()).toEqual('太郎');
		expect(element(row.column('qth_intl')).getText()).toEqual('京都市');
		expect(element(row.column('notes_intl')).getText()).toEqual('ノート書き変え');
	});

	it("unit tests", function () {
		browser.driver.executeScript(function () {
			chrome.app.window.create('specs/test.html', {
				'bounds': {
					'width': 800,
					'height': 600
				}
			}, function (created) {
				created.contentWindow.errors = [];
				created.contentWindow.onerror = function (e) {
					created.contentWindow.errors.push(String(e));
				};

				created.contentWindow.console_log = [];
				created.contentWindow.console.log = function () {
					created.contentWindow.console_log.push(arguments);
				};
			});
		});

		switchToAppWindow(2);

		expect(browser.driver.getCurrentUrl()).toMatch(/test\.html$/);

		browser.driver.wait(function () {
			return browser.driver.executeScript('return !!window.jasmine');
		}, 1000);

		browser.driver.wait(function () {
			return browser.driver.executeScript('return jsApiReporter.status() == "done"');
		}, 60000);

		browser.driver.executeScript('return [window.errors, window.console_log]').then(function (ret) {
			for (var i = 0, it; (it = ret[0][i]); i++) {
				console.log(it);
			}
			for (var i = 0, it; (it = ret[1][i]); i++) {
				console.log.apply(console, it);
			}
		});
		expect(browser.driver.executeScript('return jsApiReporter.specs()').then(function (specs) {
			var success = true;
			for (var i = 0, spec; (spec = specs[i]); i++) {
				if (spec.status == 'failed') success = false;

				for (var j = 0, it; (it = spec.failedExpectations[j]); j++) {
					console.log('got', it.actual, 'expected', it.expected);
					console.log(it.stack);
				}
			}
			return success;
		})).toEqual(true);

		browser.driver.close();
	});
});
