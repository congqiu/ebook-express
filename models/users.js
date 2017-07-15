var moment = require('moment');

var mysqlQuery = require('../lib/mysql');

module.exports = {
	getUserById: function (id, cb) {
		var userId = parseInt(id);
		mysqlQuery('SELECT * FROM user WHERE id = ?', userId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getUserByUsername: function (username, cb) {
		mysqlQuery('SELECT * FROM user WHERE username = ?', username, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getUserByEmail: function (email, cb) {
		mysqlQuery('SELECT * FROM user WHERE email = ?', email, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	addUser: function (user, cb) {
		mysqlQuery('INSERT INTO user(username, md5pwd, email, create_time, change_time, type, avatar, status) VALUES(?, ? , ?, ?, ?, ?, ?, ?)', [user.username, user.md5pwd, user.email, user.date, user.date, 'normal', 'default.jpg', 0], function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},

	updateUser: function (user, condition, cb) {
		var sql = 'UPDATE user SET ';
		var val = new Array();

		for (item in user) {
			if (item !== 'id') {
				sql += item + '= ?, ';
				val.push(user[item]);
			}
		}
		sql = sql.substring(0, sql.length - 2);

		sql += ' WHERE ';
		for (cond in condition) {
			sql += cond + ' = ? AND ';
			val.push(condition[cond]);
		}
		sql = sql.substring(0, sql.length - 4);

		mysqlQuery(sql, val, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	}
}