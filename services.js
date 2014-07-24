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
		},

		close : function () {
			var self = this;
			self.db.close();
		},

		query : function (query, opts) {
			var self = this;
			var ret = $q.defer();

			var txn = self.db.transaction(['reports'], 'readonly');
			var store = txn.objectStore('reports');
			var request;
			var array = [];
			var limit = opts.limit || 50;

			if (query.call) {
				request = store.index('by_call').openCursor(IDBKeyRange.only(String(query.call)));
			} else
			if (query.datetime) {
				request = store.openCursor(IDBKeyRange.lowerBound(query.datetime), 'prev');
			} else {
				request = store.openCursor(null, 'prev');
			}

			request.onsuccess = function (e) {
				var cursor = e.target.result;
				if (cursor) {
					if (!cursor.value._deleted) {
						array.push(cursor.value);
						if (limit-- > 0) {
							cursor.continue(); // no warnings
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
			chrome.syncFileSystem.setConflictResolutionPolicy('last_write_win');
			chrome.syncFileSystem.requestFileSystem(function (fs) {
				if (chrome.runtime.lastError) {
					ret.reject(chrome.runtime.lastError.message);
					return;
				}
				fs.root.getFile(
					'signalreports.txt',
					{ create: true },
					function (entry) {
						var syncedData = $q.defer();
						ret.notify("Reading file...");
						entry.file(function (file) {
							var reader = new FileReader();
							reader.onerror = self.errorHandler(syncedData);
							reader.onloadend = function (e) {
								console.log('onloadend', e.target.result);
								var data = {};
								if (e.target.result) {
									var array = JSON.parse(e.target.result);
									for (var i = 0, it; (it = array[i]); i++) {
										data[ it.datetime ] = it;
									}
								}
								syncedData.resolve(data);
							};
							reader.readAsText(file);
						});

						$q.all({
							synced : syncedData.promise,
							local  : self.dump()
						}).
						then(function syncRemoteToLocal (data) {
							var synced = data.synced, local = data.local;
							console.log(data);

							ret.notify("Update local database with remote database");

							var deferred = $q.defer();

							var txn = self.db.transaction(['reports'], 'readwrite');
							var store = txn.objectStore('reports');

							var count = 0;
							for (var key in synced) if (synced.hasOwnProperty(key)) {
								if (!local[key] || local[key].updated_at < synced[key].updated_at) {
									console.log('will be updated on local: ', synced[key]);
									count++;
									store.put(synced[key]).onerror = self.errorHandler(deferred);
								}
							}

							txn.onerror = self.errorHandler(deferred);

							txn.oncomplete = function () {
								console.log('updated ', count, ' rows');
								deferred.resolve(data);
							};

							return deferred.promise;
						}).
						then(function syncLocalToRemote (data) {
							var synced = data.synced, local = data.local;

							ret.notify("Update remote database with local database");

							var count = 0;
							for (var key in local) if (local.hasOwnProperty(key)) {
								if (!synced[key] || synced[key].updated_at < local[key].updated_at) {
									console.log('will be updated on remote: ', local[key]);
									count++;
									synced[key] = local[key];
								}
							}
							console.log('writing ', count, ' new rows');

							var array = [];
							for (var key in synced) if (synced.hasOwnProperty(key)) {
								array.push(synced[key]);
							}

							array.sort(function (a, b) {
								return a.datetime - b.datetime;
							});

							entry.createWriter(function (writer) {
								writer.onerror = self.errorHandler(ret);
								writer.onwriteend = function () {
									console.log('done dump');
									temporaryStorage.set({ lastSynced: new Date().getTime() }).then(function () {
										self.dispatchEvent('syncStatusChange', { status : 'done' });
										ret.resolve();
									}, self.errorHandler(ret));
								};

								writer.write(new Blob([ JSON.stringify(array) ]));
							});
						});
					},
					function (e) {
						ret.reject(e);
					}
				);
			});
			return ret.promise;
		}
	};

	return new DB();
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
		},

		$save : function (callback) {
			console.log('$save');
			var object = {};
			for (var key in this) if (this.hasOwnProperty(key) && !/\$/.test(key)) {
				var val = this[key];
				object[key] = val;
			}

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
			SignalReportDB.query({
				datetime: query.before
			}, {
				limit : 51
			}).
			then(function (result) {
				Reports.hasMore = (result.length > 50);
				for (var i = 0, it; (it = result[i]); i++) {
					ret.push(new Reports(it));
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

