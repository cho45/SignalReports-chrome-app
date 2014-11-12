
function cleanupDatabase (version, callback) {
	var onerror = function (e) { callback(e) };

	var request = indexedDB.open('signal_report', version);
	request.onsuccess = function (e) {
		var db = e.target.result;
		var txn = db.transaction(['reports'], 'readwrite');
		var store = txn.objectStore('reports');
		var request = store.clear();
		request.onsuccess = function () {
			db.close();
			callback();
		};
		request.onerror = onerror;
	};
	request.onerror = onerror;
}


describe("DB", function () {
	var $rootScope;
	beforeEach(module('signalReportsApp'));
	beforeEach(inject(function(_$rootScope_) {
		$rootScope = _$rootScope_;
	}));

	setInterval(function () { try { $rootScope.$apply(); $browser.defer.flush(); } catch (e) {} }, 10);

	it("should open / insert / update / delete", function (done) {
		inject(function (SignalReportDB, $q, $browser) { cleanupDatabase(SignalReportDB.version, function (error) {
			console.log(error);

			expect(SignalReportDB).toBeDefined();
			expect(SignalReportDB.db).toBeNull();

			SignalReportDB.open().
			then(function (db) {

				return $q.when().
				then(function () {
					return SignalReportDB.insertReport({
						call: 'JH1UMV',
						memo: 'test'
					}).
					then(function (data) {
						console.log('inserted');
						return SignalReportDB.get(data.datetime).then(function (row) {
							expect(row.memo).toEqual('test');
						});
					});
				}).
				then(function () {
					console.log('query1');
					return SignalReportDB.query({}).then(function (array) {
						console.log(array);
						expect(array.length).toEqual(1);
						expect(array[0].memo).toEqual('test');
					});
				}).
				then(function () {
					console.log('query2');
					return SignalReportDB.query({ call : 'JH1UMV' }).then(function (array) {
						expect(array.length).toEqual(1);
						return array[0];
					});
				}).
				then(function (data) {
					data.memo = 'foobar';
					return SignalReportDB.updateReport(data).then(function() {
						console.log('updated');
					}).
					then(function () {
						return SignalReportDB.get(data.datetime).then(function (row) {
							expect(row.memo).toEqual('foobar');
							return row;
						});
					});
				}).
				then(function (data){
					return SignalReportDB.deleteReport(data).then(function() {
						console.log('deleted');
						return SignalReportDB.get(data.datetime).then(function (row) {
							expect(row).toBeNull();
						});
					});
				}).
				catch(function (e) { // no warnings
					console.log(e);
				});
			}).
			then(done);
		}) });
	});
});

