
signalReportsApp.directive('srTypeaheadCallsign', function (SignalReportDB) {
	return {
		link : function (scope, element, attrs) {
			element.typeahead({
				hint: false,
				highlight: false,
				minLength: 1
			}, {
				name : 'callsign',
				source : function (q, cb) {
					var filtered = CALLSIGN_DATA.filter(function (i) {
						return i[0].test(q);
					});
					SignalReportDB.open().then(function () {
						SignalReportDB.query({ call : q.toUpperCase() }, { limit : 5 }).then(function (result) {
							console.log('call query', result);
							if (filtered.length) {
								result.push(filtered[0]);
							}
							cb(result);
						});
					});
				},
				displayKey: function (i) {
					return i.call;
				},
				templates : {
					suggestion : function (obj) {
						if (obj instanceof Array) {
							if (obj[2]) {
								return '<p class="typeahead-call-dropdown">#2, <b>#1</b></p>'.replace(/#(\d)/g, function (_, n) {
									return obj[n];
								});
							} else {
								return '<p class="typeahead-call-dropdown">#1</p>'.replace(/#(\d)/g, function (_, n) {
									return obj[n];
								});
							}
						} else {
							return '<p class="typeahead-call-dropdown">#{call} : #{qso_date} #{band} #{mode}</p>'.replace(/#\{([^}]+)\}/g, function (_, n) {
								return obj[n];
							});
						}
					}
				}
			});

			element.focus(function () {
				element.typeahead('val', element.val());
			}).
			on('typeahead:closed', function () {
				element.change(); // to apply to ng-model
			});
		}
	};
});

signalReportsApp.directive('srTypeaheadMode', function () {
	var MODES = signalReportsApp.MODES;
	return {
		link : function (scope, element, attrs) {
			element.typeahead({
				hint: false,
				highlight: false,
				minLength: 1
			}, {
				name : 'mode',
				displayKey: function (i) {
					return i;
				},
				source : function (q, cb) {
					var re = new RegExp(q, 'i');
					cb(MODES.filter(function (i) { return re.test(i) }));
				}
			});

			element.focus(function () {
				element.typeahead('val', element.val());
			}).
			on('typeahead:closed', function () {
				element.change(); // to apply to ng-model
			});
		}
	};
});

signalReportsApp.directive('srTypeaheadBand', function () {
	var BANDS = signalReportsApp.BANDS;
	return {
		link : function (scope, element, attrs) {
			element.typeahead({
				hint: false,
				highlight: false,
				minLength: 1
			}, {
				name : 'mode',
				displayKey: function (i) {
					return i.band;
				},
				source : function (q, cb) {
					var re = new RegExp(q, 'i');
					cb(BANDS.filter(function (i) { return re.test(i.band) }));
				}
			});

			element.focus(function () {
				element.typeahead('val', element.val());
			}).
			on('typeahead:closed', function () {
				element.change(); // to apply to ng-model
			});
		}
	};
});

signalReportsApp.directive('srTypeaheadHistory', function (Reports) {
	return {
		link : function (scope, element, attrs) {
			var name = attrs.srTypeaheadHistory;
			element.typeahead({
				hint: false,
				highlight: false,
				minLength: 1
			}, {
				name : 'history',
				displayKey : function (i) {
					return i[name];
				},
				source : function (q, cb) {
					var re = new RegExp(q, 'i');
					Reports.query({ limit: 100 }, function (data) {
						var uniq = {};
						cb(data.filter(function (i) {
							var ret = !uniq[i[name]] && re.test(i[name]);
							uniq[i[name]] = true;
							return ret;
						}));
					});
				}
			});

			element.focus(function () {
				element.typeahead('val', element.val());
			}).
			on('typeahead:closed', function () {
				element.change(); // to apply to ng-model
			});
		}
	};
});

signalReportsApp.directive('srForceUppercase', function () {
	return {
		link : function (scope, element, attrs) {
			element.bind('blur', function () {
				if (element.val() != element.val().toUpperCase()) {
					element.val(element.val().toUpperCase()).change();
				}
			});
		}
	};
});

signalReportsApp.directive('srCompleteJcc', function (JCCService) {
	return {
		link : function (scope, element, attrs) {
			element.
				textcomplete([
					{
						match : /(^|\s)(jc[cg]\d{2,})$/i,
						search : function (query, next) {
							JCCService.resolve(query.toUpperCase()).then(next);
						},
						template : function (value) {
							return value.number + ' (' + value.name + ')';
						},
						replace : function (value) {
							return '$1' + value.number + ' ';
						}
					}
				]);
		}
	};
});

signalReportsApp.directive('srDialog', function ($q) {
	return {
		restrict: 'E',
		transclude : true,
		scope : {
			Dialog : '=name'
		},
		link : function ($scope, element, attrs) {
			$scope.style = attrs.style;
		},
		controller : function ($scope) {
			$scope.Dialog = {
				open : function (opts) {
					console.log('open', opts);
					$scope.deferred = $q.defer();
					$scope.opts = opts || {};
					$scope.show = true;
					for (var key in opts.stash) if (opts.stash.hasOwnProperty(key)) {
						$scope.$$nextSibling[key] = opts.stash[key];
					}
					return $scope.deferred.promise;
				},

				close : function (value) {
					$scope.close();
				}
			};

			$scope.close = function () {
				$scope.show = false;
			};

			$scope.ok = function (e) {
				if ( ($scope.opts.ok || function () {})() === false) return;
				$scope.close();
				$scope.deferred.resolve();
			};

			$scope.cancel = function () {
				if ( ($scope.opts.cancel || function () {})() === false) return;
				$scope.close();
				$scope.deferred.reject();
			};
		},
		templateUrl : '/views/dialog.html'
	};
});

signalReportsApp.directive('srSetting', function (SignalReportDB, temporaryStorage, Identity, Backup) {
	return {
		restrict : 'E',
		scope :  {
			SettingDialog : '=name'
		},
		link : function ($scope, element, attrs) {
			chrome.storage.onChanged.addListener(function (changes, area) {
				if (area === 'local' && changes['lastSynced']) {
					$scope.lastSynced = changes['lastSynced'].newValue;
				}
			});

			temporaryStorage.get('lastSynced', function (data) {
				$scope.lastSynced = data.lastSynced;
			});
		},
		templateUrl : '/views/setting.html',
		controller : function ($scope, $q) {
			Identity.getProfileUserInfo().then(function (userInfo) {
				console.log('userInfo', userInfo);
				$scope.userInfo = userInfo;
			});

			$scope.SettingDialog = {
				open : function (opts) {
					console.log('open', opts);
					$scope.deferred = $q.defer();
					$scope.opts = opts || {};
					$scope.show = true;
					return $scope.deferred.promise;
				},

				close : function (value) {
					$scope.close();
				}
			};

			$scope.close = function () {
				$scope.show = false;
			};

			$scope.ok = function (e) {
				if ( ($scope.opts.ok || function () {})() === false) return;
				$scope.close();
				$scope.deferred.resolve();
			};

			$scope.cancel = function () {
				if ( ($scope.opts.cancel || function () {})() === false) return;
				$scope.close();
				$scope.deferred.reject();
			};

			$scope.importFile = function () {
				console.log('importFile');
				var accepts = [
					{
						description : 'ADIF 2.0',
						extensions  : ['adi']
					}
				];
				chrome.fileSystem.chooseEntry({ type: 'openFile', accepts : accepts }, function (readOnlyEntry) {
					readOnlyEntry.file(function(file) {
						var reader = new FileReader();

						// reader.onerror = errorHandler;
						reader.onloadend = function (e) {
							console.log(e.target.result);
							var adif = ADIF.parse_adi(e.target.result);
							console.log(adif);
							$q.when().then(function loop () {
								var row = adif.records.shift();
								if (!row) return;
								console.log('import', row);
								var date = row.qso_date.match(/(\d\d\d\d)(\d\d)(\d\d)/);
								var time = row.time_on.match(/(\d\d)(\d\d)(\d\d)?/);
								row.datetime = Date.UTC(+date[1], +date[2]-1, date[3], time[1], time[2], time[3] || 0);
								return SignalReportDB.insertReport(row).then(loop);
							}).
							then(function () {
								$scope.$parent.load();
							});
						};

						reader.readAsText(file);
					});
				});
			};

			$scope.exportFile = function () {
				console.log('exportFile');
				var suggestedName = 'signalreports-' + (new Date().strftime('%Y%m%d%H%M%S')) + '.adi';
				chrome.fileSystem.chooseEntry({ type: 'saveFile', suggestedName : suggestedName }, function (writableFileEntry) {
					SignalReportDB.exportADI().then(function (blob) {
						writableFileEntry.createWriter(function(writer) {
							writer.onerror = function (e) {
								console.log(e);
							};
							writer.onwriteend = function(e) {
								console.log('write complete');
							};
							writer.write(blob);
						}, function (e) {
							console.log(e);
						});
					});
				});
			};

			$scope.allReset = function () {
				$scope.$parent.Alert.open({
					okLabel : loc('ok'),
					cancelLabel : loc('cancel'),
					stash : {
						message : loc('confirm_allReset')
					}
				}).
				then(function () {
					SignalReportDB.allReset().
					then(function () {
						$scope.$parent.reports = [];
						$scope.$parent.load();
					});
				});
			};

			$scope.syncNow = function () {
				$scope.$parent.sync();
			};

			$scope.setupBackup = function () {
				Identity.getAuthToken({ 'interactive': true }).then(function (token) {
					Backup.enable();
					Backup.queue();
				});
			};

			$scope.disableBackup = function () {
				Identity.revoke();
				Backup.disable();
			};

			Identity.getAuthToken({ interactive : false }).then(function (token) {
				$scope.backupEnabled = true;
			});
		}
	};
});

signalReportsApp.directive('srEditDialog', function ($document, Reports, SignalReportDB) {
	return {
		restrict : 'E',
		scope :  {
			EditDialog : '=name'
		},
		link : function ($scope, element, attrs) {
			var inputForm = element.find('#input-form');
			var inputFormForm = inputForm.find('form');

			$scope.$watch('report.mode', function (newValue) {
				console.log('mode', newValue);
				var classes = inputForm.attr('class');
				for (var i = 0, len = classes.length; i < len; i++) {
					if (classes[i].match(/^mode-/)) {
						inputForm.removeClass(classes[i]);
					}
				}

				if (!newValue) return;
				inputForm.addClass('mode-' + newValue.toLowerCase());
			});

			$scope.$watch('report.freq', function (newValue, oldValue) {
				for (var i = 0, it; (it = signalReportsApp.BANDS[i]); i++) {
					if (it.lowerFreq <= newValue && newValue <= it.upperFreq) {
						$scope.report.band = it.band;
						break;
					}
				}
			});


			inputForm.
				find('input[name=call]').
					blur(function () {
						var $this = $(this);

						SignalReportDB.open().then(function () {
							SignalReportDB.query({ call : $this.val().toUpperCase() }, { limit : 5 }).then(function (result) {
								var data = result.sort(function (a, b) { return b.datetime - a.datetime }).filter(function (i) {  return i.call == $this.val().toUpperCase() })[0];
								if (data) {
									$scope.$evalAsync(function () {
										if (!$scope.report.name_intl) $scope.report.name_intl = data.name_intl;
										if (!$scope.report.qth_intl) $scope.report.qth_intl = data.qth_intl;
									});
								}
							});
						});
					}).
				end().
				find('input[name=rst_sent], input[name=rst_rcvd]').
					focus(function () {
						$(this).parent().find('.rst-dropdown').show();
					}).
					blur(function () {
						$(this).parent().find('.rst-dropdown').hide();
					}).
					keyup(function () {
						$(this).change();
					}).
					change(function () {
						var $this = $(this);
						var rst = $this.val().split('');

						$this.parent().find('tr.readability td').text( (rst[0] || '') + ' ' + (signalReportsApp.Utils.RST.R[rst[0] - 1] || '') );
						$this.parent().find('tr.strength td').text( (rst[1] || '') + ' ' + (signalReportsApp.Utils.RST.S[rst[1] - 1] || '') );
						$this.parent().find('tr.tone td').text( (rst[2] || '') + ' ' + (signalReportsApp.Utils.RST.T[rst[2] - 1] || '') );
					}).
				end().
				find('input[name=rst_rcvd]').
					blur(function () {
						if ($(this).val() && !inputFormForm.find('input[name=time]').val()) {
							$('#now').click();
						}
					}).
				end()
				;

			$scope.onopen = function () {
				console.log('onopen');
				setTimeout(function () {
					inputForm.find('input[name=call]').focus();
				}, 100);
			};
			
			$document.bind('keydown', function (e) {
				var key = keyString(e);
				if (key === 'C-RET') {
					e.preventDefault();
					if ($scope.opened) {
						inputFormForm.submit();
					}
				} else
				if (key === 'RET') {
					console.log('RET');
				} else
				if (key === 'ESC') {
					$scope.$evalAsync(function () {
						$scope.close();
					});
				} else {
				}
			});

		},

		templateUrl : '/views/edit-dialog.html',

		controller : function ($scope, $q, temporaryStorage, Reports) {
			$scope.report = {};
			$scope.opened = false;
			$scope.formChanged = false;

			var unwatch;

			$scope.EditDialog = {
				open : function (report, opts) {
					if (unwatch) unwatch();
					$scope.deferred = $q.defer();

					if (!report) {
						$scope.report = {};
					} else {
						$scope.report = angular.copy(report);
					}

					if ($scope.report.qso_date) {
						var dateobj = $scope.report.$date;
						$scope.report.qso_date = [
							dateobj.getFullYear(),
							String(100 + dateobj.getMonth() + 1).slice(1),
							String(100 + dateobj.getDate()).slice(1)
						].join('-');
						$scope.report.time_on = [
							String(100 + dateobj.getHours()).slice(1), 
							String(100 + dateobj.getMinutes()).slice(1), 
							String(100 + dateobj.getSeconds()).slice(1) 
						].join(':');
					}

					$scope.isNew = !$scope.report.datetime;
					$scope.opts = opts;
					$scope.formChanged = false;
					$scope.opened = true;
					$scope.onopen();

					unwatch = $scope.$watch('report', function (newValue, oldValue) {
						if (newValue === oldValue) return; // ignore initialize
						$scope.savingBackup = true;
						$scope.formChanged = true;
						temporaryStorage.set({ 'inputBackup' : { date : new Date().getTime(), data : newValue } }).then(function () {
							$scope.savingBackup = false;
						});
					}, true);

					temporaryStorage.get('inputBackup').then(function (val) {
						if (val.inputBackup) {
							$scope.inputBackup = val.inputBackup;
							$scope.inputBackup.date = new Date($scope.inputBackup.date);
						}
					});

					return $scope.deferred.promise;
				},

				close : function () {
					$scope.close();
				}
			};

			$scope.close = function () {
				if ( ($scope.opts.close || function () {})() === false) return;
				if ($scope.formChanged) {
					$scope.$parent.Alert.open({
						okLabel : loc('ok'),
						cancelLabel : loc('cancel'),
						stash : {
							message : loc('confirm_unsaved')
						}
					}).
					then(function () {
						_close();
					});
				} else {
					_close();
				}

				function _close () {
					$scope.opened = false;
					unwatch();
				}
			};

			$scope.restoreBackup = function () {
				var data = $scope.inputBackup.data;
				console.log('restoreBackup', data);
				for (var key in data) if (data.hasOwnProperty(key) && !/\$/.test(key)) {
					$scope.report[key] = data[key];
				}
				$scope.inputBackup = null;
			};

			$scope.setDateTime = function () {
				var now = new Date();
				$scope.report.qso_date = now.strftime('%Y-%m-%d');
				$scope.report.time_on  = now.strftime('%H:%M:%S');
			};

			$scope.deleteReport = function () {
				$scope.$parent.Alert.open({
					okLabel : loc('ok'),
					cancelLabel : loc('cance'),
					stash : {
						message : loc('confirm_deleteReport')
					}
				}).
				then(function () {
					var report = new Reports($scope.report);
					report.$delete(function () {
						$scope.close();
						$scope.deferred.resolve({
							report : null,
							isNew : false
						});
					});
				});
			};

			$scope.openBrowser = function (url) {
				window.open(url);
			};


			$scope.submit = function () {
				console.log('save', $scope.isNew, $scope.report);
				var date = $scope.report.qso_date.split(/-/);
				var time = $scope.report.time_on.split(/:/);

				var dateobj = new Date(
					+date[0],
					+date[1] - 1,
					+date[2],
					+time[0],
					+time[1],
					+time[2]
				);
				$scope.report.datetime = dateobj.getTime();

				// convert local time to UTC
				$scope.report.qso_date = [
					dateobj.getUTCFullYear(),
					String(100 + dateobj.getUTCMonth() + 1).slice(1),
					String(100 + dateobj.getUTCDate()).slice(1)
				].join('');
				$scope.report.time_on = [
					String(100 + dateobj.getUTCHours()).slice(1), 
					String(100 + dateobj.getUTCMinutes()).slice(1), 
					String(100 + dateobj.getUTCSeconds()).slice(1) 
				].join('');
				var report = new Reports($scope.report);
				console.log(report);
				report.$date = dateobj;

				$q.when().
				then(function () {
					if ($scope.isNew) {
						var trySave = function () {
							return report.$save(function () {
							}).
							catch(function (e) { // no warnings
								if (e.target.error.message === 'Key already exists in the object store.') {
									report.datetime++;
									return trySave();
								}
							});
						};

						return trySave();
					} else {
						return report.$update();
					}
				}).
				then(function () {
					// after saved clear backup
					temporaryStorage.set( { 'inputBackup' : null });
					$scope.formChanged = false;
					$scope.close();
					$scope.deferred.resolve({
						report : report,
						isNew : $scope.isNew
					});
				});
			};

		}
	};
});


