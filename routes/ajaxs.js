var express = require('express');
var crypto = require('crypto');
var moment = require('moment');
var config = require('config-lite')(__dirname);
var formidable = require('formidable');
var fs = require('fs');

var router = express.Router();

var userModel = require('../models/users');
var bookModel = require('../models/books');
var tools = require('../lib/tools');

router.post('/user/is-auto-login', function (req, res, next) {
	var user = req.session.user;
	if (!user) {
		return res.jsonp({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}
	var active = parseInt(req.body.active);
  var date = moment().unix();

	if (active != 1 && active != 0) {
  	return res.jsonp({message: '请不要修改参数！'});
	}

	var new_user = {is_cookie: active, change_time: date}
  userModel.updateUser(new_user, {id: user.id}, function (updateResult) {
    if (updateResult.success) {
      return res.jsonp({message: '修改成功！'});
    } else {
      return res.jsonp({message: '操作失败！'});
    }
  });
});

router.post('/user/is-auto-bookmark', function (req, res, next) {
	var user = req.session.user;
	if (!user) {
		return res.jsonp({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}
	var active = parseInt(req.body.active);
  var date = moment().unix();

	if (active != 1 && active != 0) {
  	return res.jsonp({message: '请不要修改参数！'});
	}

	var new_user = {is_auto_bookmark: active, change_time: date}
  userModel.updateUser(new_user, {id: user.id}, function (updateResult) {
    if (updateResult.success) {
      return res.jsonp({message: '修改成功！'});
    } else {
      return res.jsonp({message: '操作失败！'});
    }
  });
});

router.post('/user/upload/avatar', function (req, res, next) {
  var user = req.session.user;
	if (!user) {
		return res.json({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}

  var date = moment().unix();
  var form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.uploadDir = __dirname + '/../public/tmp/';
  form.keepExtensions = true;
  form.maxFieldsSize = 2 * 1024 * 1024;
  form.parse(req, function(err, fields, files) {
    if (err) {
      console.log(err);
      res.json({message: '上传出错'});
    }
    var extName = '';
    switch (files.avatar.type) {
      case 'image/pjpeg':
        extName = 'jpg';
        break;
      case 'image/jpeg':
        extName = 'jpg';
        break;
      case 'image/png':
        extName = 'png';
        break;
      case 'image/gif':
        extName = 'gif';
        break;
      case 'image/x-png':
        extName = 'png';
        break;
    }

    if(extName.length == 0){
      return res.json({message: '只支持png,jpg,gif格式'});
    }

    var avatarName = moment().format('YYYYMMDD') + tools.random_str(1, 4) + date.toString(16) + '.' + extName;
    var newPath = form.uploadDir + '../avatar/' + avatarName;
    
    fs.renameSync(files.avatar.path, newPath);
    var new_user = {avatar: avatarName, change_time: date};
    userModel.updateUser(new_user, {email: user.email}, function (updateResult) {
      if (updateResult.success) {
        return res.json({message: '更换头像成功', redirect: '/home'});
      } else {
        return res.json({message: '更换头像失败'});
      }
    });
    fs.unlink(files.avatar.path, function () {
    });
  });
});



router.post('/book/add/bookmark', function (req, res, next) {
	if (!req.session.user) {
		return res.jsonp({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}

	var ebookId = req.body.book;
	var epageId = req.body.page;
	var userId = req.session.user.id;

	var bookId = tools.decodeHex(2, ebookId, 'ebook-id', 6)[0];
	var pageId = tools.decodeHex(2, epageId, 'ebook-id', 6)[0];
	if (!bookId || !pageId) {
		return res.jsonp({ message: '没有该章节！', success: false });
	}

	bookModel.addBookmark(bookId, pageId, userId, function (result) {
		var message;
		if (result.success) {
			message = '添加书签成功！'
		} else {
			message = '添加书签失败！'
		}
		req.flash('message', message)
		res.jsonp({ message: message });
	});
});

router.post('/book/add/bookcase', function (req, res, next) {
	if (!req.session.user) {
		return res.jsonp({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}
	var ebookId = req.body.book;
	var userId = req.session.user.id;

	var bookId = tools.decodeHex(2, ebookId, 'ebook-id', 6)[0];
	if (!bookId) {
		return res.jsonp({ message: '没有该书！', success: false });
	}

	bookModel.addBookToBookcase(bookId, userId, function (result) {
		var message = result.data.message;
		req.flash('message', message)
		res.jsonp({ message: message });
	})
});

router.post('/book/remove/bookcase', function (req, res, next) {
	if (!req.session.user) {
		return res.jsonp({ message: '请先登录！<br /> 现在就去<a href="/login?target=' + req.headers.referer + '">登录</a>' });
	}

	var paramsId = req.body.book;
	var userId = req.session.user.id;

	var bookId = tools.decodeHex(2, paramsId, 'ebook-id', 6)[0];
	if (!bookId) {
		return res.jsonp({ message: '没有该书！', success: false });
	}

	bookModel.removeBookFromBookcase(bookId, userId, function (result) {
		var message = result.data.message;
		req.flash('message', message)
		res.jsonp({ message: message, success: result.success });
	})
});

router.get('/book/get/books', function (req, res, next) {
	var category = req.query.category;
	var categories = req.query.categories;
	var callback = req.query.callback;
	var count = (req.query.count - 0) || 8;
	var page = (req.query.page - 1) || 0;
	count = count < 0 ? 1 : count;
	page = page < 0 ? 0 : page;

	res.end();
});

module.exports = router;