signalReportsApp.controller('SignalReportListCtrl', function ($scope, $q, $http, $timeout, $interval, $document, Reports, SignalReportDB, CATSocketService, temporaryStorage, Backup) {
	Backup.init();
	Backup.addListener('status', function (status) {
		console.log('update backup status', status);
		$scope.backupEnabled = status.enabled;
		$scope.lastBackuped = status.lastBackuped;
	});


	$scope.search = function me (immediate) {
		if (me.timer) $timeout.cancel(me.timer);

		if (immediate) {
			$scope.load();
			me.prev = $scope.query;
		} else {
			me.timer = $timeout(function () {
				if (me.prev !== $scope.query) {
					$scope.load();
					me.prev = $scope.query;
				}
			}, 500);
		} 
	};


	$scope.load = function () {
		$scope.reports = Reports.query({ query : $scope.query, limit: 50 }, function (data) {
			$scope.hasMore = 50 < data.length;
		});


		Reports.count().
		then(function (val) {
			$scope.total = +val;
			console.log('total', val);
		}).
		catch(function (e) { // no warnings
			console.log(e);
		});
	};

	$scope.loadNext = function () {
		var before = $scope.reports[$scope.reports.length-1].id;
		var reports = Reports.query({ query : $scope.query, before: before, limit: 50 }, function (data) {
			$scope.reports = $scope.reports.concat(reports);
			$scope.hasMore = 50 < data.length;
		});
	};

	$scope.sync = function () {
		$scope.syncing = true;
		SignalReportDB.sync().then(
			function () {
				console.log('done sync');
				$scope.syncing = false;
				$scope.reports = [];
				$scope.load();
			},
			function (error) {
				console.log('sync error', error);
			},
			function (notify) {
				console.log('sync notify', notify);
				$scope.syncStatus = notify;
			}
		);
	};

	$scope.openForm = function (report) {
		if (!report && $scope.reports.length) {
			var target = $scope.reports[0];
			report = {
				band : target.band,
				freq : target.freq,
				mode : target.mode,
				my_rig_intl : target.my_rig_intl,
				my_city_intl : target.my_city_intl
			};
		}

		$scope.EditDialog.open(report, {
			close : function () {
				// CATSocketService.unbind('message');
			}
		}).
		then(function (val) {
			console.log('done edit', val);
			if (val.report) {
				if (val.isNew) {
					$scope.total++;
					$scope.reports.unshift(val.report);
					$scope.openForm();
				} else {
					report.$init(val.report);
				}
			} else {
				console.log('deleted');
				// deleted
				$scope.reports = $scope.reports.filter(function (i) {
					return i.datetime !== report.datetime;
				});
				$scope.total--;
			}
			$scope.sync();
		});
	};

	$scope.openSetting = function () {
		$scope.Setting.open();
	};

	$scope.resizeToFull = function () {
		chrome.app.window.current().maximize();
	};

	$scope.resizeToDefault = function () {
		// chrome.app.window.current().resizeTo(1024, 800);
		chrome.app.window.current().restore();
	};

	$scope.exitApplication = function () {
		chrome.app.window.current().close();
	};

	$scope.query = "";
	$scope.hasMore = false;
	$scope.orderProp = 'datetime';
	$scope.total = 0;
	$scope.load();

//	$timeout(function () {
////		$scope.openForm()
//		$scope.openSetting();
//	}, 500);
});

