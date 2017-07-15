var mysqlQuery = require('../lib/mysql');

module.exports = {
	getTokenByToken: function (token, cb, status = null) {
		var sql = 'SELECT * FROM token WHERE token = ?';
		if (status !== null) {
			sql += ' AND status = ?' 
		}
		mysqlQuery(sql, [token, status], function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},

	addToken: function (token, cb, interim = false) {
		mysqlQuery('SELECT * FROM token WHERE status = 1 AND email = ?', token.email, function (errs, row, fieds) {
			if (errs) {
				cb({data: {message: '系统出错，请稍后再试！'}, success: false});
			}
			if (row) {
				if (interim !== false && row[0] && (token.date - row[0].create_time < interim)) {
					cb({data: {message: '请等待' + (interim - token.date + row[0].create_time) + '秒后再试！'}, success: false});
				} else if (row[0]) {
					mysqlQuery('UPDATE token SET status = ?, change_time = ? WHERE status = 1 AND email = ?', [-1, token.date, token.email], function (errs1, row1, fieds1) {
						if (errs1) {
							cb({data: errs1, success: false});
						}
						if (row1) {
							mysqlQuery('INSERT INTO token(token, email, create_time, change_time, type, status) VALUES(?, ?, ?, ?, ?, ?)', [token.token, token.email, token.date, token.date, token.type, 1], function (errs2, row2, fieds2) {
								if (errs2) {
									cb({data: {message: '系统出错，请稍后再试！'}, success: false});
								}
								if (row2) {
									cb({data: row2, success: true});
								}
							});
						}
					});
				} else {
					mysqlQuery('INSERT INTO token(token, email, create_time, change_time, type, status) VALUES(?, ?, ?, ?, ?, ?)', [token.token, token.email, token.date, token.date, token.type, 1], function (errs, row, fieds) {
						if (errs) {
							cb({data: {message: '系统出错，请稍后再试！'}, success: false});
						}
						if (row) {
							cb({data: row, success: true});
						}
					});
				}
			}
		});
	},

	updateToken: function (token, cb) {
		var sql = 'UPDATE token SET ';
		var val = new Array();

		for (item in token) {
			if (item !== 'token') {
				sql += item + '= ?, ';
				val.push(token[item]);
			}
		}
		sql = sql.substring(0, sql.length - 2)
		sql += ' WHERE token.token = ?';
		val.push(token.token);
		mysqlQuery(sql, val, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		})
	}
}