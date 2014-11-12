signalReportsApp.factory('SignalReportDB', function ($rootScope, $q, temporaryStorage) {
	var DB = function () { this.init.apply(this, arguments) };
	DB.prototype = {
		version : 4,

		init : function () {
			var self = this;
			self.initListener();
			self.db = null;
		},

		initListener : function () {
			this.listeners = {};
		},

		addListener : function (event, listener) {
			if (!this.listeners[event]) this.listeners[event] = [];
			this.listeners[event].push(listener);
		},

		removeListener : function (event, listener) {
			if (!this.listeners[event]) return;
			for (var i = 0, it; (it = this.listeners[event][i]); i++) {
				if (it === listener) {
					this.listeners[event].splice(i, 1);
					return;
				}
			}
		},

		dispatchEvent : function (event, data) {
			if (!this.listeners[event]) return;
			try {
				for (var i = 0, it; (it = this.listeners[event][i]); i++) {
					it(data);
				}
			} catch (e) {
				console.log(e, e.stack);
			}
		},

		errorHandler : function (deferred) {
			return function (e) {
				console.log(e);
				deferred.reject(e);
			};
		},

		open : function () {
			var self = this;
			if (!self.db) {
				var ret = $q.defer();
				var request = indexedDB.open('signal_report', self.version);
				request.onupgradeneeded = function (e) {
					console.log('upgradeneeded');
					var db = request.result;
					request.transaction.onerror = self.errorHandler(ret);
					request.transaction.onabort = self.errorHandler(ret);

					if (e.oldVersion < 2) {
						var reports = db.createObjectStore("reports", {
							keyPath : 'datetime'
						});
						reports.createIndex('by_call', 'call');
					}

					if (e.oldVersion < 4) {
						request.transaction.objectStore('reports').createIndex('deleted', '_deleted', { unique: false });
					}
				};

				request.onsuccess = function (e) {
					self.db = e.target.result;
					console.log('success');
					ret.resolve(self.db);
				};

				request.onerror = self.errorHandler(ret);
				return ret.promise;
			} else {
				return $q.when(self.db);
			}
		},

		close : function () {
			var self = this;
			self.db.close();
		},

		query : function (query, opts) {
			var self = this;
			var ret = $q.defer();
			if (!opts) opts = {};

			var txn = self.db.transaction(['reports'], 'readonly');
			var store = txn.objectStore('reports');
			var request;
			var array = [];
			var limit = opts.limit || 50;

			console.log(['query', query, opts]);

			if (query.call) {
				query.call = String(query.call);
				// request = store.index('by_call').openCursor(IDBKeyRange.only(String(query.call)));
				request = store.index('by_call').openCursor(IDBKeyRange.bound(query.call, query.call + '\uffff', false, false));
			} else
			if (query.before) {
				request = store.openCursor(IDBKeyRange.upperBound(query.before, true), 'prev');
			} else {
				request = store.openCursor(null, 'prev');
			}

			var searchRe = query.search ? new RegExp(query.search, 'i') : null;
			request.onsuccess = function (e) {
				var cursor = e.target.result;
				if (cursor) {
					if (!cursor.value._deleted) {
						var matched = true;
						if (searchRe) {
							matched =
								searchRe.test(cursor.value.call) ||
								searchRe.test(cursor.value.notes_intl) ||
								searchRe.test(cursor.value.my_city_intl);
						}

						if (matched) {
							array.push(cursor.value);
							limit--;
						}

						if (limit > 0) {
							cursor.continue(); // no warnings
						} else {
							ret.resolve(array);
						}
					} else {
						cursor.continue(); // no warnings
					}
				} else {
					ret.resolve(array);
				}
			};
			request.onerror = self.errorHandler(ret);

			return ret.promise;
		},

		dump : function () {
			var self = this;
			return self.open().then(function () {
				var ret = $q.defer();

				var txn = self.db.transaction(['reports'], 'readonly');
				var store = txn.objectStore('reports');
				var request;
				var data = {};

				request = store.openCursor(null);

				request.onsuccess = function (e) {
					var cursor = e.target.result;
					if (cursor) {
						data[ cursor.value.datetime ] = cursor.value;
						cursor.continue(); // no warnings
					} else {
						ret.resolve(data);
					}
				};
				request.onerror = self.errorHandler(ret);

				return ret.promise;
			});
		},

		count : function () {
			var self = this;

			var txn = self.db.transaction(['reports'], 'readonly');
			var store = txn.objectStore('reports');

			function total () {
				var ret = $q.defer();
				var request = store.count();
				request.onsuccess = function () {
					ret.resolve(request.result);
				};
				request.onerror = self.errorHandler(ret);
				return ret.promise;
			}

			function deleted () {
				var ret = $q.defer();
				var request = store.index('deleted').count(IDBKeyRange.only(1));
				request.onsuccess = function () {
					ret.resolve(request.result);
				};
				request.onerror = self.errorHandler(ret);
				return ret.promise;
			}

			return $q.all([ total(), deleted() ]).then(function (v) {
				return v[0] - v[1];
			});
		},

		get : function (id) {
			var self = this;
			var ret = $q.defer();

			var txn = self.db.transaction(['reports'], 'readonly');
			var store = txn.objectStore('reports');
			var request = store.get(id);
			request.onsuccess = function () {
				if (!request.result._deleted) {
					ret.resolve(request.result);
				} else {
					ret.resolve(null);
				}
			};
			request.onerror = self.errorHandler(ret);
			return ret.promise;
		},

		insertReport : function (obj) {
			var self = this;
			var ret = $q.defer();
			var txn = self.db.transaction(['reports'], 'readwrite');
			var store = txn.objectStore('reports');

			if (!obj.datetime) obj.datetime = new Date().getTime();
			if (!obj.updated_at) obj.updated_at = obj.datetime;

			var request = store.add(obj);
			request.onerror = self.errorHandler(ret);

			txn.oncomplete = function () {
				ret.resolve(obj);
			};

			return ret.promise;
		},

		updateReport : function (obj) {
			var self = this;
			if (!obj.datetime) throw "id required";
			var ret = $q.defer();
			var txn = self.db.transaction(['reports'], 'readwrite');
			var store = txn.objectStore('reports');
			obj.updated_at = new Date().getTime();
			var request = store.put(obj);
			request.onerror = self.errorHandler(ret);

			txn.oncomplete = function () {
				ret.resolve(obj);
			};
			return ret.promise;
		},

		// just logical removing for syncing
		deleteReport : function (obj) {
			var self = this;
			obj._deleted = 1;
			return self.updateReport(obj);
		},

		allReset : function (id) {
			var self = this;
			var ret = $q.defer();
			var txn = self.db.transaction(['reports'], 'readwrite');
			var store = txn.objectStore('reports');
			var request = store.clear();
			request.onsuccess = function () {
				ret.resolve(request.result);
			};
			request.onerror = self.errorHandler(ret);
			return ret.promise;
		},

		sync : function () {
			var self = this;
			self.dispatchEvent('syncStatusChange', { status : 'started' });

			var ret = $q.defer();
//			chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');
//			chrome.syncFileSystem.requestFileSystem(function (fs) {
//				if (chrome.runtime.lastError) {
//					ret.reject(chrome.runtime.lastError.message);
//					return;
//				}
//				fs.root.getFile(
//					'signalreports.txt',
//					{ create: true },
//					function (entry) {
//						var syncedData = $q.defer();
//						ret.notify("Reading file...");
//						entry.file(function (file) {
//							var reader = new FileReader();
//							reader.onerror = self.errorHandler(syncedData);
//							reader.onloadend = function (e) {
//								console.log('onloadend', e.target.result);
//								var data = {};
//								if (e.target.result) {
//									var array = JSON.parse(e.target.result);
//									for (var i = 0, it; (it = array[i]); i++) {
//										data[ it.datetime ] = it;
//									}
//								}
//								syncedData.resolve(data);
//							};
//							reader.readAsText(file);
//						});
//
//						$q.all({
//							synced : syncedData.promise,
//							local  : self.dump()
//						}).
//						then(function syncRemoteToLocal (data) {
//							var synced = data.synced, local = data.local;
//							console.log(data);
//
//							ret.notify("Update local database with remote database");
//
//							var deferred = $q.defer();
//
//							var txn = self.db.transaction(['reports'], 'readwrite');
//							var store = txn.objectStore('reports');
//
//							var count = 0;
//							for (var key in synced) if (synced.hasOwnProperty(key)) {
//								if (!local[key] || local[key].updated_at < synced[key].updated_at) {
//									console.log('will be updated on local: ', synced[key]);
//									count++;
//									store.put(synced[key]).onerror = self.errorHandler(deferred);
//								}
//							}
//
//							txn.onerror = self.errorHandler(deferred);
//
//							txn.oncomplete = function () {
//								console.log('updated ', count, ' rows');
//								deferred.resolve(data);
//							};
//
//							return deferred.promise;
//						}).
//						then(function syncLocalToRemote (data) {
//							var synced = data.synced, local = data.local;
//
//							ret.notify("Update remote database with local database");
//
//							var count = 0;
//							for (var key in local) if (local.hasOwnProperty(key)) {
//								if (!synced[key] || synced[key].updated_at < local[key].updated_at) {
//									console.log('will be updated on remote: ', local[key]);
//									count++;
//									synced[key] = local[key];
//								}
//							}
//							console.log('writing ', count, ' new rows');
//
//							var array = [];
//							for (var key in synced) if (synced.hasOwnProperty(key)) {
//								array.push(synced[key]);
//							}
//
//							array.sort(function (a, b) {
//								return a.datetime - b.datetime;
//							});
//
//							entry.createWriter(function (writer) {
//								writer.onerror = self.errorHandler(ret);
//								writer.onwriteend = function () {
//									console.log('done dump');
//									temporaryStorage.set({ lastSynced: new Date().getTime() }).then(function () {
//										self.dispatchEvent('syncStatusChange', { status : 'done' });
//										ret.resolve();
//									}, self.errorHandler(ret));
//								};
//
//								writer.write(new Blob([ JSON.stringify(array) ]));
//							});
//						});
//					},
//					function (e) {
//						ret.reject(e);
//					}
//				);
//			});
			return ret.promise;
		},

		exportADI : function () {
			var self = this;
			return self.dump().then(function (data) {
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

				return new Blob(output);
			});
		}
	};

	return new DB();
});

signalReportsApp.service('Backup', function ($q, temporaryStorage, SignalReportDB, Drive) {
	var Backup =  {
		enabled : false,
		lastBackuped : 0,

		init : function () {
			var self = this;
			var ret = $q.defer();
			self.initListener();
			temporaryStorage.get('backup').then(function (data) {
				console.log('get backup status', data.backup);
				if (!data.backup) data.backup = {};

				self.lastBackuped = data.backup.lastBackuped;
				if (data.backup.enabled) {
					self.enable();
				} else {
					self.disable();
				}
				ret.resolve();
			});

			self.addListener('status', function (e) {
				temporaryStorage.set({ backup : e });
			});
			return ret.promise;
		},

		enable : function () {
			var self = this;
			self.enabled = true;
			self.dispatchEvent('status', { enabled : self.enabled, lastBackuped : self.lastBackuped });

			clearTimeout(self._timer);
			self._timer = setInterval(function () {
				self.queue();
			}, 60 * 60 * 1000);
		},

		disable : function () {
			var self = this;
			self.enabled = false;
			clearTimeout(self._timer);
			self.dispatchEvent('status', { enabled : self.enabled, lastBackuped : self.lastBackuped });
		},

		queue : _.throttle(function () {
			var self = this;
			if (!self.enabled) return;
			console.log('start backup');
			return SignalReportDB.exportADI().then(function (blob) {
				var basename = new Date().strftime('%Y-%m-%d') + '.adi';
				return Drive.uploadFile('signalreports/backup/' + basename, blob).then(function (done) {
					console.log('backup done');
					self.lastBackuped = new Date().getTime();
					self.dispatchEvent('status', { enabled : self.enabled, lastBackuped : self.lastBackuped });
				});
			});
		}, 60 * 1000),

		initListener : function () {
			this.listeners = {};
		},

		addListener : function (event, listener) {
			if (!this.listeners[event]) this.listeners[event] = [];
			this.listeners[event].push(listener);
		},

		removeListener : function (event, listener) {
			if (!this.listeners[event]) return;
			for (var i = 0, it; (it = this.listeners[event][i]); i++) {
				if (it === listener) {
					this.listeners[event].splice(i, 1);
					return;
				}
			}
		},

		dispatchEvent : function (event, data) {
			if (!this.listeners[event]) return;
			try {
				for (var i = 0, it; (it = this.listeners[event][i]); i++) {
					it(data);
				}
			} catch (e) {
				console.log(e, e.stack);
			}
		}
	};

	return Backup;
});



signalReportsApp.factory('CATSocketService', function () {
	var service = $({});

	service.connect = function () {
//		if (service.socket) return;
//		service.socket = new WebSocket("ws://waatserver.local:51234");
//
//		service.socket.onopen = function () {
//			console.log('onopen');
//			service.connected = true;
//			if (service.onopen) service.onopen();
//		};
//
//		service.socket.onclose = function () {
//			service.connected = false;
//			console.log('onclose');
//			if (service.onclose) service.onclose();
//			delete service.socket;
//			setTimeout(function () {
//				console.log('reconnecting');
//				service.connect();
//			}, 1000);
//		};
//
//		service.socket.onmessage = function (e) {
//			var data = JSON.parse(e.data).result;
//			service.status = data;
//			console.log('ws.onmessage', data);
//			service.triggerHandler('message', [ data ]);
//		};
	};

	service.send = function (data) {
		service.socket.send(JSON.stringify(data));
	};

	service.command = function (cmd, arg) {
		service.send({ command: cmd, value : arg });
	};

	service.connect();

	return service;
});

signalReportsApp.factory('temporaryStorage', function ($q) {
	return {
		get : function (keys, callback) {
			var deferred = $q.defer();
			chrome.storage.local.get(keys, function (items) {
				if (callback) callback(items);
				deferred.resolve(items);
			});
			return deferred.promise;
		},

		set : function (items, callback) {
			var deferred = $q.defer();
			chrome.storage.local.set(items, function (e) {
				if (callback) callback();
				deferred.resolve();
			});
			return deferred.promise;
		},

		remove : function (keys, callback) {
			var deferred = $q.defer();
			chrome.storage.local.remove(keys, function () {
				if (callback) callback();
				deferred.resolve();
			});
			return deferred.promise;
		}
	};
});

signalReportsApp.factory('syncStorage', function ($q) {
	return {
		get : function (keys, callback) {
			var deferred = $q.defer();
			chrome.storage.sync.get(keys, function (items) {
				if (callback) callback(items);
				deferred.resolve(items);
			});
			return deferred.promise;
		},

		set : function (items, callback) {
			var deferred = $q.defer();
			chrome.storage.sync.set(items, function (e) {
				if (callback) callback();
				deferred.resolve();
			});
			return deferred.promise;
		},

		remove : function (keys, callback) {
			var deferred = $q.defer();
			chrome.storage.sync.remove(keys, function () {
				if (callback) callback();
				deferred.resolve();
			});
			return deferred.promise;
		}
	};
});

signalReportsApp.factory('JCCService', function ($http, $q) {
	var JCCService = {
		resolve : function (number) {
			var ret = $q.defer();

			$http.get('/assets/jcc.json', { cache : true }).
				success(function (data, status, headers, config) {
					console.log(data);
					try {
						var index = data.index[number];
						ret.resolve(data.list.slice(index[0], index[0] + index[1]));
					} catch (e) {
						ret.resolve([]);
					}
				}).
				error(function (data, status, headers, config) {
					ret.reject(data);
				});

			return ret.promise;
		}
	};

	return JCCService;
});

signalReportsApp.factory('Reports', function ($q, SignalReportDB) {
	var db = SignalReportDB.open();

	var Reports = function () { this.$init.apply(this, arguments) };
	Reports.prototype = {
		$init : function (columns) {
			for (var key in columns) if (columns.hasOwnProperty(key) && !/\$/.test(key)) {
				this[key] = columns[key];
			}
			if (this.qso_date && this.time_on) {
				var date = this.qso_date.match(/^(\d\d\d\d)(\d\d)(\d\d)$/);
				var time = this.time_on.match(/^(\d\d)(\d\d)(\d\d)?$/);
				console.log([this.qso_date, this.time_on]);
				this.$date = new Date(Date.UTC(date[1], +date[2] - 1, date[3], time[1], time[2], time[3] || 0));
			}
		},

		$save : function (callback) {
			console.log('$save');
			var object = {};
			for (var key in this) if (this.hasOwnProperty(key) && !/\$/.test(key)) {
				var val = this[key];
				object[key] = val;
			}
			console.log(object);

			return db.
			then(function () {
				return SignalReportDB.insertReport(object);
			}).
			then(callback);
		},

		$update : function (callback) {
			console.log('$update');
			var object = {};
			for (var key in this) if (this.hasOwnProperty(key) && !/\$/.test(key)) {
				var val = this[key];
				object[key] = val;
			}

			return db.
			then(function () {
				return SignalReportDB.updateReport(object);
			}).
			then(callback);
		},

		$delete : function (callback) {
			console.log('$delete');
			var object = {};
			for (var key in this) if (this.hasOwnProperty(key) && !/\$/.test(key)) {
				var val = this[key];
				object[key] = val;
			}
			return db.
			then(function () {
				return SignalReportDB.deleteReport(object);
			}).
			then(callback);
		}
	};

	Reports.query = function (query, callback) {
		var ret = [];
		db.then(function () {
			SignalReportDB.query(query, {
				limit : 51
			}).
			then(function (result) {
				Reports.hasMore = (result.length > 50);
				for (var i = 0, it; (it = result[i]); i++) {
					var report = new Reports(it);
					ret.push(report);
				}
				if (callback) callback(ret);
			});
		});
		return ret;
	};

	Reports.count = function () {
		return db.then(function () {
			return SignalReportDB.count();
		});
	};

	return Reports;
});

signalReportsApp.factory('Identity', function ($q, $http) {
	var Identity = {
		getAuthToken : function (opts) {
			var ret = $q.defer();
			chrome.identity.getAuthToken({ 'interactive': false }, function (token) {
				if (chrome.runtime.lastError) {
					console.log(chrome.runtime.lastError);
					ret.reject(chrome.runtime.lastError);
					return;
				}
				if (!token) {
					ret.reject('');
					return;
				}
				Identity.token = token;
				ret.resolve(token);
			});
			return ret.promise;
		},

		getProfileUserInfo : function (opts) {
			var ret = $q.defer();
			chrome.identity.getProfileUserInfo(function (userInfo) {
				ret.resolve(userInfo);
			});
			return ret.promise;
		},

		request : function (opts) {
			var ret = $q.defer();
			function _request (retry) {
				Identity.getAuthToken({}).then(function (token) {
					if (!opts.headers) opts.headers = {};
					opts.headers['Authorization'] = 'Bearer ' + token;
					$http(opts).
						success(function (data, status, headers, config) {
							ret.resolve({ data: data, status: status, headers: headers, config: config });
						}).
						error(function (data, status, headers, config) {
							if (status === 401 && retry) {
								chrome.identity.removeCachedAuthToken({ 'token': token }, _request);
								return;
							}
							ret.reject({ data: data, status: status, headers: headers, config: config });
						});
				}, function (e) { ret.reject(e) });
			}
			_request(true);
			return ret.promise;
		},

		revoke : function () {
			Identity.getAuthToken({}).then(function (token) {
				var ret = $q.defer();
				chrome.identity.removeCachedAuthToken({ 'token': token }, function () {
					ret.resolve();
				});
				return ret.promise;
			});
		}
	};
	return Identity;
});

signalReportsApp.factory('Drive', function (Identity, $q) {
	return {
		list  : function (opts) {
			if (!opts) opts = {};
			var params = opts.params;
			var url = 'https://www.googleapis.com/drive/v2/files';
			var ret = [];
			return $q.when().then(function loop () {
				return Identity.request({
					method : 'GET',
					url : url,
					params : params
				}).
				then(function (res) {
					ret = ret.concat(res.data.items);
					if (res.data.nextLink) {
						console.log('Drive.list has nextLink');
						params = null;
						url = res.data.nextLink;
						return loop();
					} else {
						return ret;
					}
				});
			});
		},

		findFileByPath : function (path, parent) {
			var self = this;
			if (!parent) parent = 'root';
			path = path.split('/');
			var current = '';
			return $q.when().then(function loop () {
				var target = path.shift();
				current += '/' + target;
				var q = "'" + parent + "' in parents and title = '" + target + "'";
				return self.list({ params : { q : q, fields : path.length > 1 ? 'items/id' : null } }).then(function (list) {
					if (!list.length) return null;
					if (path.length) {
						parent = list[0].id;
						return loop();
					} else {
						return list[0];
					}
				});
			});
		},

		mkPath : function (path) {
			var self = this;
			path = path.split('/');
			var parent = "root", current = '';
			return $q.when().then(function loop () {
				var target = path.shift();
				current += '/' + target;
				var q = "'" + parent + "' in parents and title = '" + target + "'";
				return self.list({ params : { q : q, fields : path.length > 1 ? 'items/id' : null } }).then(function (list) {
					var folder;
					if (!list.length) {
						console.log('create path', current);
						 folder = Identity.request({
							method : 'POST',
							url :  'https://www.googleapis.com/drive/v2/files',
							headers : { 'Content-Type' : 'application/json' },
							data : JSON.stringify({
								"title" : target,
								"parents": [{"id": parent}],
								"mimeType": "application/vnd.google-apps.folder"
							})
						}).
						then(function (res) {
							return res.data;
						});
					} else {
						console.log('exist path', current);
						folder = $q.when(list[0]);
					}

					return folder.then(function (folder) {
						if (path.length) {
							parent = folder.id;
							return loop();
						} else {
							return folder;
						}
					});
				});
			});
		},

		uploadFile : function (path, blob, opts) {
			var self = this;
			if (!opts) opts = {};
			path = path.split('/');
			var basename = path.pop();

			var contentType = opts.contentType || 'text/plain';

			return self.mkPath(path.join('/')).
			then(function (parent) {
				return self.findFileByPath(basename, parent.id).then(function (file) {
					console.log(file);
					return Identity.request({
						method : file ? 'PUT' : 'POST',
						url : 'https://www.googleapis.com/upload/drive/v2/files/' + (file ? file.id : '') + '?uploadType=resumable',
						headers : {
							'Content-Type' : 'application/json; charset=UTF-8',
							'X-Upload-Content-Length' : blob.size,
							'X-Upload-Content-Type' : contentType
						},
						data : JSON.stringify({
							'title' : basename,
							"parents": [{
								"id": parent.id
							}],
							'mimeType' : 'text/plain'
						})
					}).
					then(function (res) {
						console.log(res);
						var url = res.headers('Location');
						console.log(url);
						return Identity.request({
							method : 'PUT',
							url : url,
							headers : {
								'Content-Type' : contentType
							},
							data : blob
						}).
						then(function (res) {
							console.log(res);
						});
					});
				});
			});
		}
	};
});
