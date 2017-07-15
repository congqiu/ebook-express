var express = require('express');
var moment = require('moment');
var router = express.Router();

var bookModel = require('../models/books');
var tools = require('../lib/tools');

var checkLogin = require('../middlewares/check').checkLogin;
var checkNotLogin = require('../middlewares/check.js').checkNotLogin;

/* GET books listing. */
router.get('/', function(req, res, next) {
	res.locals.page = 'book-index';
	res.locals.ebook.title = 'XX小说--你最好的小说伙伴';
	var books = new Array();
	var types = new Array();

	bookModel.getBooks(function (booksResult) {
		if (booksResult.success) {
			if (booksResult.data[0]) {
				books = booksResult.data;
			} else {
				req.flash('message', '居然没有找到书，下次再来吧！');
			}
				
			bookModel.getBookTypes(function (typesResult) {
				if (typesResult.success && typesResult.data[0]) {
					types = typesResult.data;
				}
				return res.render('books/index', {
					books: booksResult.data,
					types: types
				});
			});
		} else {
			return res.render('message', {message: '操作失败！'});
		}
	}, 8, 0, 'id', true);
});

router.get('/category/:category', function (req, res, next) {
	var category = req.params.category;
	var callback = req.query.callback;
	var count = (req.query.count - 0) || 8;
	var page = (req.query.page - 1) || 0;
	count = count < 0 ? 1 : count;
	page = page < 0 ? 0 : page;

	res.locals.page = 'book-category';

	bookModel.getTypeById(category, function (typeResult) {
		if (typeResult.success && typeResult.data[0]) {
			res.locals.ebook.title = typeResult.data[0].name + '--你最好的小说伙伴';
			bookModel.getBooksByType(category, function (booksResult) {
				if (booksResult.success && booksResult.data[0]) {
					var books = booksResult.data;
					if (callback) {
						return res.render('components/books-list', {
							books: books
						});
					} else {
						bookModel.getBooksCountsByType(category, function (countsResult) {
							if (countsResult.success && countsResult.data[0]) {
								allCounts = parseInt(countsResult.data[0]['count(id)']);
								if(allCounts % count == 0){  
		            	counts = parseInt(allCounts / count);  
				        } else {  
			            counts = parseInt(allCounts / count) + 1;  
				        }
				        if (page + 1 > counts) {
				        	return res.render('message', {message: '没有更多了'});
				        }
								return res.render('books/category', {
									baseUrl: req.originalUrl,
									type: typeResult.data[0],
									books: books,
									allCounts: allCounts,
									currentPage: page,
									pageSize: count,
									totalPages: counts
								});
							}
						});
					}
				} else {
					return res.render('message', {message: '操作失败！'});
				}
			}, count, page);
		} else {
			return res.render('message', {message: '没有该类别'});
		}
	});
});

/*
	用户书架
	--查询和处理需要优化--
*/
router.get('/bookcase', checkLogin, function(req, res, next) {
	var user = req.session.user.id;
	var bookcases = new Array();
	var message = '';

	res.locals.page = 'bookcase';
	res.locals.ebook.title = '我的书架--你最好的小说伙伴';

	bookModel.getUserBookcase(user, function (bookcaseResult) {
		if (bookcaseResult.success) {
			if (bookcaseResult.data[0]) {
				bookcaseResult.data.forEach( function(element, index) {
					element.format_time = moment(element.change_time * 1000).format('YYYY-MM-DD HH:mm');
					if (typeof element === 'object') {
						bookcases[element.book] = element;
					}
				});
				bookcases = bookcases.sort(function (property) {
					return function(a,b){
			        var value1 = a[property];
			        var value2 = b[property];
			        return value2 - value1;
			    }
				}('change_time'));
			} else {
				message = '书架居然是空的，赶紧去加几本书吧！';
			}
			return res.render('books/bookcase', {
				bookcases: bookcases,
				message: message
			});
		} else {
			return res.render('message', {message: '操作失败！'});
		}
	});
});

router.all('/search', function (req, res , next) {
	var name = req.query.name;
	var count = (req.query.count - 0) || 8;
	var page = (req.query.page - 1) || 0;
	count = count < 0 ? 1 : count;
	page = page < 0 ? 0 : page;
	
	res.locals.page = 'book-category';
	res.locals.ebook.title = name + ' 的搜索结果';

	var books = new Array();
	bookModel.getBooksByName(name, function (searchResult) {
		if (searchResult.success) {
			books = searchResult.data.books;
			allCounts = parseInt(searchResult.data.counts[0]['count(id)']);
			if(allCounts % count == 0){  
      	counts = parseInt(allCounts / count);  
      } else {  
        counts = parseInt(allCounts / count) + 1;  
      }
      if (allCounts === 0) {
      	return res.render('message', {message: '没有找到相关书籍，要不换个名字试试？'});
      }
      if (page + 1 > counts) {
      	return res.render('message', {message: '没有更多了'});
      }
		}
		return res.render('books/search', {
			baseUrl: req.originalUrl,
			books: books,
			allCounts: allCounts,
			currentPage: page,
			pageSize: count,
			totalPages: counts
		});
	}, true, true, count, page);
});

router.get('/:bookId', function(req, res, next) {
	var paramsId = req.params.bookId;
	var bookId = tools.decodeHex(2, paramsId, 'ebook-id', 6)[0];
	if (!bookId) {
		return res.render('message', {message: '暂无该书'});
	}

	res.locals.page = 'book-catalog';

	bookModel.getBookById(bookId, function (book) {
		if (book.success) {
			if (book.data[0]) {
				res.locals.ebook.title = book.data[0].name + '--精彩小说';
				bookModel.getBookCatalog(bookId, function (catalog) {
					if (catalog.success) {
						// catalogs = catalog.data.map(function(item) {
						// 	item.create_time = moment(item.create_time * 1000).format('YYYY-MM-DD');
						// 	return item;
						// })
						latest = null;
						message = '';
						if (catalog.data[catalog.data.length-1]) {
							latest = catalog.data[catalog.data.length-1];
							latest.create_time = moment(latest.create_time * 1000).format('YYYY-MM-DD');
						} else {
							message = '暂无该书内容，敬请期待！'
						}
						
						return res.render('books/book', {
							message: message,
							book: book.data[0],
							latest: latest,
							catalogs: catalog.data
						});
					} else {
						return res.render('message', {message: '操作失败'});
					}
				});
			} else {
				return res.render('message', {message: '暂无该书'});
			}
		} else {
			return res.render('message', {message: '操作失败'});
		}
	});
});

router.get('/:bookId/:pageId', function(req, res, next) {
	var ebookId = req.params.bookId;
	var epageId = req.params.pageId;
	var is_cookie = false;

	var bookId = tools.decodeHex(2, ebookId, 'ebook-id', 6)[0];
	var pageId = tools.decodeHex(2, epageId, 'ebook-id', 6)[0];
	if (!bookId || !pageId) {
		return res.render('message', {message: '没有该章节'});
	}

	if (req.session.user) {
		is_cookie = req.session.user.is_cookie;
		var userId = req.session.user.id;
	}

	res.locals.page = 'book-page';

	bookModel.getBookPageByNum(bookId, pageId, function (bookpage) {
		if (bookpage.success) {
			if (bookpage.data[0]) {
				res.locals.ebook.title = bookpage.data[0].title + '--精彩小说';
				if (is_cookie) {
					bookModel.addBookmark(bookId, bookpage.data[0].id, userId, function (result) {
						var message;
						if (result.success) {
							message = '自动添加书签成功！'
						} else {
							message = '自动添加书签失败！'
						}
						console.log(message)
					});
				}
				res.render('books/bookpage', {
					bookpage: bookpage.data[0]
				});
			} else {
				return res.render('message', {message: '没有该章节！'});
			}
		} else {
			return res.render('message', {message: '操作失败！'});
		}
	});
});


module.exports = router;