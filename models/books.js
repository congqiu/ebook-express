var moment = require('moment');

var mysqlQuery = require('../lib/mysql');

module.exports = {
	getBookById: function (id, cb) {
		var bookId = parseInt(id);
		mysqlQuery('SELECT * FROM book WHERE id = ?', bookId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},

	getBooks: function (cb, limit, offset, order, desc) {
		var sql = 'SELECT * FROM book';
		if (order) {
			if (desc) {
				sql += ' ORDER BY ' + order + ' desc'
			} else {
				sql += ' ORDER BY ' + order + ' asc'
			}
		}
		if (limit) {
			sql += ' limit ?';
		}
		if (offset || offset === 0) {
			sql += ' offset ?'
		}
		mysqlQuery(sql, [limit*1, offset*1], function (errs, rows) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},

	getBooksByName: function (name, cb, like = false, counts = false, limit, offset, order, desc) {
		var sql = 'SELECT * FROM book WHERE name LIKE ? ';
		if (order) {
			if (desc) {
				sql += ' ORDER BY ' + order + ' desc'
			} else {
				sql += ' ORDER BY ' + order + ' asc'
			}
		}
		if (limit) {
			sql += ' limit ?';
		}
		if (offset || offset === 0) {
			sql += ' offset ?'
		}
		if (like) {
			name = '%' + name + '%';
		}

		if (counts === false) {
			mysqlQuery(sql, [name, limit*1, offset*1], function (errs, rows) {
				if (errs) {
					cb({data: errs, success: false});
				}
				if (rows) {
					cb({data: {books: rows}, success: true});
				}
			});
		} else {
			mysqlQuery('SELECT count(id) FROM book WHERE name LIKE ?', [name], function (errs, rows) {
				if (errs) {
					cb({data: errs, success: false});
				}
				if (rows) {
					mysqlQuery(sql, [name, limit*1, offset*1], function (errs1, rows1) {
						if (errs1) {
							cb({data: errs, success: false});
						}
						if (rows1) {
							cb({data: {counts: rows, books: rows1}, success: true});
						}
					});
				}
			});
		}
	},

	getBookTypes: function (cb, limit, offset, order, desc) {
		var sql = 'SELECT * FROM booktype';
		if (order) {
			if (desc) {
				sql += ' ORDER BY ' + order + ' desc'
			} else {
				sql += ' ORDER BY ' + order + ' asc'
			}
		}
		if (limit) {
			sql += ' limit ?';
		}
		if (offset || offset === 0) {
			sql += ' offset ?'
		}
		mysqlQuery(sql, [limit*1, offset*1], function (errs, rows) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},
	
	getBooksByType: function (type, cb, limit, offset, order, desc) {
		var sql = 'SELECT * FROM book WHERE type = ?';
		if (order) {
			if (desc) {
				sql += ' ORDER BY ' + order + ' desc'
			} else {
				sql += ' ORDER BY ' + order + ' asc'
			}
		}
		if (limit) {
			sql += ' limit ?';
		}
		if (offset || offset === 0) {
			sql += ' offset ?'
		}
		mysqlQuery(sql, [type, limit*1, offset*1], function (errs, rows) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},
	
	getBooksCountsByType: function (type, cb) {
		var sql = 'SELECT count(id) FROM book WHERE type = ?';
		mysqlQuery(sql, [type], function (errs, rows) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},

	getTypeById: function (id, cb) {
		var typeId = parseInt(id);
		mysqlQuery('SELECT * FROM booktype WHERE id = ?', typeId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},

	getBookLatestPage: function (id, cb) {
		var bookId = parseInt(id);
		mysqlQuery('SELECT * FROM bookpage WHERE nex = -2 AND book = ?', bookId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getBookCatalog: function (id, cb) {
		var bookId = parseInt(id);
		mysqlQuery('SELECT title,create_time,num,pre,nex FROM bookpage WHERE book = ? ORDER BY num ASC', bookId, function (errs, rows, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},
	getBookAllPage: function (id, cb) {
		var bookId = parseInt(id);
		mysqlQuery('SELECT title,content,num,pre,nex FROM bookpage WHERE book = ? ORDER BY num ASC', bookId, function (errs, rows, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (rows) {
				cb({data: rows, success: true});
			}
		});
	},
	getBookPageByNum: function (book, num, cb) {
		var bookId = parseInt(book);
		var num = parseInt(num);
		mysqlQuery('SELECT * FROM bookpage WHERE book = ? AND num = ?', [bookId, num], function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getBooksByUser: function (user, cb) {
		var userId = parseInt(user);
		mysqlQuery('SELECT * FROM bookcase WHERE status = 1 AND user = ?', userId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getBookPageById: function (id, cb) {
		var pageId = parseInt(id);
		mysqlQuery('SELECT * FROM bookpage WHERE id = ?', pageId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	getUserBookcase: function (id, cb) {
		var userId = parseInt(id);
		// mysqlQuery('SELECT book.id AS book, book.name, bookpage1.num, bookpage1.title, bookpage2.title AS title2, bookpage2.num AS num2, bookcase.change_time FROM bookpage as bookpage1 right JOIN bookcase ON bookcase.bookmark = bookpage1.id left join book ON book.id = bookcase.book left join bookpage AS bookpage2 ON book.id = bookpage2.book WHERE bookcase.status = 1 AND bookcase.user = ? AND bookpage2.nex = -2 ORDER BY bookcase.change_time DESC', userId, function (errs, row, fieds) {
		mysqlQuery('SELECT book.id AS book, book.name, bookpage1.num, bookpage1.title, bookpage2.title AS title2, bookpage2.num AS num2, bookcase.change_time FROM bookcase left JOIN bookpage as bookpage1 ON bookcase.bookmark = bookpage1.id left join book ON book.id = bookcase.book left join bookpage AS bookpage2 ON book.id = bookpage2.book WHERE bookcase.status = 1 AND bookcase.user = ? AND (bookpage2.nex = -2 OR bookpage2.nex IS NULL) ORDER BY bookcase.change_time DESC', userId, function (errs, row, fieds) {
			if (errs) {
				cb({data: errs, success: false});
			}
			if (row) {
				cb({data: row, success: true});
			}
		});
	},
	addBookmark: function (book, page, user, cb) {
		var bookId = parseInt(book);
		var pageId = parseInt(page);
		var userId = parseInt(user);
		var date = moment().unix();

		mysqlQuery('SELECT * FROM bookcase WHERE book = ? AND user = ?', [bookId, userId], function (err, row, fieds) {
			if (err) {
				cb({data: err, success: false});
			}
			if (row) {
				if (row[0]) {
					mysqlQuery('UPDATE bookcase SET bookmark = ?, change_time = ? WHERE id = ?', [pageId, date, row[0].id], function (err1, row1, fieds) {
						if (err1) {
							cb({data: err1, success: false});
						}
						if (row1) {
							cb({data: row1, success: true});
						}
					});
				} else {
					mysqlQuery('INSERT INTO bookcase(book, user, bookmark, status, create_time, change_time) VALUES(?, ?, ?, ?, ?, ?)', [bookId, userId, pageId, 1, date, date], function (err2, row2, fieds) {
						if (err2) {
							cb({data: err2, success: false});
						}
						if (row2) {
							cb({data: row2, success: true});
						}
					});
				}
			}
		});
	},
	addBookToBookcase: function (book, user, cb) {
		var bookId = parseInt(book);
		var userId = parseInt(user);
		var date = moment().unix();

		mysqlQuery('SELECT * FROM bookcase WHERE book = ? AND user = ?', [bookId, userId], function (err, row, fieds) {
			if (err) {
				cb({data: {message : '查询书架信息失败'}, success: false});
			}
			if (row) {
				if (row[0]) {
					if (row[0].status == 0) {
						mysqlQuery('UPDATE bookcase SET status = 1, change_time = ? WHERE id = ?', [date, row[0].id], function (err1, row1, fieds) {
							if (err1) {
								cb({data: {message : '更新书架失败'}, success: false});
							}
							if (row1) {
								cb({data: {message : '更新书架成功'}, success: true});
							}
						});
					}else {
						cb({data: {message : '已经在书架'}, success: true});
					}
				} else {
					mysqlQuery('INSERT INTO bookcase(book, user, bookmark, status, create_time, change_time) VALUES(?, ?, ?, ?, ?, ?)', [bookId, userId, null, 1, date, date], function (err2, row2, fieds) {
						if (err2) {
							cb({data: {message : '添加书架失败'}, success: false});
						}
						if (row2) {
							cb({data: {message : '添加书架成功'}, success: true});
						}
					});
				}
			}
		});
	},
	removeBookFromBookcase: function (book, user, cb) {
		var bookId = parseInt(book);
		var userId = parseInt(user);
		var date = moment().unix();

		mysqlQuery('SELECT * FROM bookcase WHERE book = ? AND user = ?', [bookId, userId], function (err, row, fieds) {
			if (err) {
				cb({data: {message : '查询书架信息失败'}, success: false});
			}
			if (row) {
				if (row[0]) {
					if (row[0].status == 1) {
						mysqlQuery('UPDATE bookcase SET status = 0, bookmark = null, change_time = ? WHERE id = ?', [date, row[0].id], function (err1, row1, fieds) {
							if (err1) {
								cb({data: {message : '移除失败'}, success: false});
							}
							if (row1) {
								cb({data: {message : '移除成功'}, success: true});
							}
						});
					}else {
						cb({data: {message : '已经从书架移除'}, success: true});
					}
				} else {
					cb({data: {message : '该书不在书架'}, success: false});
				}
			}
		});
	}
}