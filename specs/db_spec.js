

describe("DB", function () {
	var $rootScope;
	beforeEach(module('signalReportsApp'));
	beforeEach(inject(function(_$rootScope_) {
		$rootScope = _$rootScope_;
	}));

	setInterval(function () { try { $rootScope.$apply(); $browser.defer.flush(); } catch (e) {} }, 10);

	it("should open / insert / update / delete", function (done) {
		inject(function (SignalReportDB, $q, $browser) {

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
							expect(row).toBeUndefined();
						});
					});
				}).
				catch(function (e) { // no warnings
					console.log(e);
				});
			}).
			then(done);
		});
	});
});

