
signalReportsApp.directive('srTypeaheadCallsign', function () {
	return {
		link : function (scope, element, attrs) {
//			element.
//				typeahead({
//					name : 'callsign',
//					template: 'callcompl',
//					engine: {
//						compile : function (string) {
//							return {
//								render : template(string)
//							};
//						}
//					},
//					remote : '/api/callsign?q=%QUERY'
//				}).
//				keydown(function (e) {
//					var key = keyString(e);
//					if (key === 'RET') {
//						element.data('ttView').inputView.trigger('enterKeyed', e);
//					} else
//					if (key === 'C-n') {
//						e.ctrlKey = false;
//						element.data('ttView').inputView.trigger('downKeyed', e);
//					} else
//					if (key === 'C-p') {
//						e.ctrlKey = false;
//						element.data('ttView').inputView.trigger('upKeyed', e);
//					}
//				});
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

signalReportsApp.directive('srSetting', function (SignalReportDB, temporaryStorage) {
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
								row.datetime = new Date(+date[1], +date[2]-1, date[3], time[1], time[2], time[3] || 0).getTime();
								return SignalReportDB.insertReport(row).then(loop);
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
					SignalReportDB.dump().then(function (data) {
						var array = [];
						for (var key in data) if (data.hasOwnProperty(key)) {
							if (!data[key]._deleted) {
								array.push(data[key]);
							}
						}
						array.sort(function (a, b) { return a.datetime - b.datetime });

						var output = [
							'this data was exported using SignalReports, conforming to ADIF standard specification version 3.0.4\n',
							'<adif_ver:5>3.0.4\n',
							'<created_timestamp:9>', (new Date()).strftime('%Y%m%d %H%M%S'), '\n',
							'<eoh>\n\n'
						];

						for (var i = 0, it; (it = array[i]); i++) {
							for (var key in it) if (it.hasOwnProperty(key)) {
								var val = it[key];
								var type = ADIF.QSO_FIELDS.typeOf(key);
								if (!type) continue;

								if (val) {
									// convert string to utf-8 byte array for calculating byte length
									var part = new Blob([ val ]);
									output.push('<', key, ':', part.size, '>', val);
								}
							}
							output.push('<eor>\n');
						}

						writableFileEntry.createWriter(function(writer) {
							writer.onerror = function (e) {
								console.log(e);
							};
							writer.onwriteend = function(e) {
								console.log('write complete');
							};
							writer.write(new Blob(output));
						}, function (e) {
							console.log(e);
						});
					});
				});
			};

			$scope.allReset = function () {
				$scope.$parent.Alert.open({
					okLabel : 'OK',
					cancelLabel : 'Cancel',
					stash : {
						message : 'Sure?'
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
		}
	};
});

signalReportsApp.directive('srEditDialog', function ($document, Reports) {
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
					if (it.lowerFreq < newValue && newValue < it.upperFreq) {
						$scope.report.band = it.band;
						break;
					}
				}
			});


			inputForm.
				find('input[name=call]').
					blur(function () {
						var $this = $(this);

//						$.ajax({
//							url: "/api/callsign",
//							type : "GET",
//							data : { q : $this.val() },
//							dataType: 'json'
//						}).
//						done(function (data) {
//							if (data.length && data[0].value === $this.val()) {
//								if (!scope.editingReport.name) scope.editingReport.name = data[0].name || '';
//								if (!scope.editingReport.address) scope.editingReport.address = data[0].address || data[0].country || '';
//								scope.$apply();
//							}
//						}).
//						fail(function (e) {
//						});
					}).
				end().
				find('input[name=rst_sent], input[name=rst_rcvd]').
					focus(function () {
						$(this).parent().find('.rst-dropdown').show();
					}).
					blur(function () {
						$(this).parent().find('.rst-dropdown').hide();
						if ($(this).val() && !inputFormForm.find('input[name=time]').val()) {
							$('#now').click();
						}
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
						var date = $scope.report.qso_date.match(/^(\d\d\d\d)(\d\d)(\d\d)$/);
						date.shift();
						$scope.report.qso_date = date.join('-');
					}

					if ($scope.report.time_on) {
						var time = $scope.report.time_on.match(/^(\d\d)(\d\d)(\d\d)?$/);
						time.shift();
						$scope.report.time_on = time.join(':');
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
						okLabel : 'OK',
						cancelLabel : 'Cancel',
						stash : {
							message : 'Sure?'
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
					okLabel : 'OK',
					cancelLabel : 'Cancel',
					stash : {
						message : 'Sure?'
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


			$scope.submit = function () {
				console.log('save', $scope.isNew, $scope.report);
				var date = $scope.report.qso_date.split(/-/);
				var time = $scope.report.time_on.split(/:/);

				$scope.report.datetime = new Date(
					+date[0],
					+date[1] - 1,
					+date[2],
					+time[0],
					+time[1],
					+time[2]
				).getTime();

				$scope.report.qso_date = date.join('');
				$scope.report.time_on = time.join('');
				var report = new Reports($scope.report);

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


