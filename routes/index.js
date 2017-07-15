var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var moment = require('moment');
var ccap = require('ccap');
var path = require('path');
var fs = require('fs');

var email = require('../lib/email');

var userModel = require('../models/users');
var bookModel = require('../models/books');

var checkLogin = require('../middlewares/check').checkLogin;
var checkNotLogin = require('../middlewares/check.js').checkNotLogin;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/book');
});

router.get('/captcha', (req, res) => {
  const captcha = ccap();
  const ary = captcha.get();
  const binaryData = `data:image/png;base64,${ary[1].toString('base64')}`;

  console.log('text', ary[0]);

  res.json({
    text: ary[0],
    buffer: binaryData,
  });
});

router.get(/^\/download\/(([0-9a-zA-Z%]+)\.txt)$/, function (req, res, next) {
  var name = req.params[0];
  var bookname = req.params[1];
  var file = path.join(__dirname, '/../public/resource/' + name);
  var exist = fs.existsSync(file);
  if (exist) {
    res.download(file, name, function (err) {
      if (err) {
        return res.redirect('back');
      }
    });
  } else {
    bookModel.getBooksByName(bookname, function (bookResult) {
      if (bookResult.success && bookResult.data.books[0]) {
        var book = bookResult.data.books[0];
        bookModel.getBookAllPage(book.id, function (pagesResult) {
          if (pagesResult.success && pagesResult.data[0]) {
            var pages = pagesResult.data;
            var str = '';
            pages.forEach( function(page, index) {
              if (index === 0) {
                str += bookname + '\r\n';
              }
              var con = page.content.replace(/<br(\s*)(\/)?>/ig, '\r\n');
              str += '\r\n' + page.title + '\r\n\r\n' + con + '\r\n\r\n\r\n';
              if (index === pages.length-1 && book.status !== 2) {
                str += '\r\n' + page.num;
              }
            });
            if (book.status !== 2) {
              name = bookname + '--未完结.txt';
            }
            fs.writeFile(path.join(__dirname, '/../public/resource/' + name), str, (err) => {
              if (err) throw err;
              res.download(path.join(__dirname, '/../public/resource/' + name), name, function (err) {
                if (err) {
                  return res.redirect('back');
                }
              });
            });
          } else {
            console.log('该书暂时还没有内容');
            return res.redirect('back');
          }
        });
      } else {
        console.log('没有该书');
        return res.redirect('back');
      }
    });
  }
});

router.get('/test', function (req, res, next) {
	res.send('hah');
})

module.exports = router;
