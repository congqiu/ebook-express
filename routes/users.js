var express = require('express');
var crypto = require('crypto');
var moment = require('moment');
var config = require('config-lite')(__dirname);
var formidable = require('formidable');
var fs = require('fs');
var validator = require('validator');

var router = express.Router();

var userModel = require('../models/users');
var tokenModel = require('../models/token');
var tools = require('../lib/tools');
var emailLib = require('../lib/email');

var checkLogin = require('../middlewares/check').checkLogin;
var checkNotLogin = require('../middlewares/check.js').checkNotLogin;


router.get('/home', checkLogin, function (req, res, next) {
  var userId = req.session.user.id;
  res.locals.page = 'home-page';
  res.locals.ebook.title = '我的信息';
  userModel.getUserById(userId, function (userResult) {
    var user = userResult.data[0];
    delete user.password;
    delete user.md5pwd;
    req.session.user = user;
    res.render('users/index', {user: user})
  });
});

router.get('/login', checkNotLogin, function(req, res, next) {
  res.locals.page = 'login-page';
  res.locals.ebook.title = '用户登录';

  var referer = req.headers.referer;
  if (referer && referer.indexOf('/login') < 0) {
    referer = encodeURIComponent(referer);
  } else {
    referer = null;
  }
  res.render('login', {referer: referer});
});

router.post('/login', checkNotLogin, function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var target = req.query.return_to || decodeURIComponent(req.body.referer);
  var md5 = crypto.createHash('md5');

  res.locals.page = 'login-page';
  res.locals.ebook.title = '用户登录';
  
  var isEmail = validator.isEmail(username);
  if (!isEmail) {
    req.checkBody('username', '用户名格式不正确')
      .notEmpty().withMessage('用户名必填')
      .len(3, 20).withMessage('用户名长度在3和20之间');
  }

  req.checkBody('password', '密码格式不正确')
      .notEmpty().withMessage('密码必填')
      .len(6, 60).withMessage('密码长度在6和60之间');
  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
      if (isEmail) {
        userModel.getUserByEmail(username, function (userResult) {
          loginAction(userResult);
        });
      } else {
        userModel.getUserByUsername(username, function (userResult) {
          loginAction(userResult);
        });
      }
    } else {
      console.log(result.useFirstErrorOnly().mapped());
      res.render('login', {errors: result.useFirstErrorOnly().mapped()});
    }
  });
  function loginAction(userResult) {
    if (userResult.success) {
      user = userResult.data[0];
      if (!user) {
        req.flash('errors', '用户名或密码错误');
        return res.redirect('/login');
      }
      var md5pwd = md5.update(new Buffer(user.username + password + user.create_time)).digest('hex');
     
      if (user.md5pwd !== md5pwd) {
        req.flash('errors', '用户名或密码错误');
        return res.redirect('/login');
      }
      delete user.password;
      delete user.md5pwd;
      req.session.user = user;
      if (target) {
        res.redirect(target);
      } else {
        res.redirect('/book');
      }
    }
  }
});

router.get('/register', checkNotLogin, function (req, res, next) {
  res.locals.page = 'register-page';
  res.locals.ebook.title = '用户注册';
  res.render('register');
});

router.post('/register', checkNotLogin, function (req, res, next) {
  var md5 = crypto.createHash('md5');
  var date = moment().unix();

  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;

  var isEmail = validator.isEmail(username);
  if (isEmail) {
    return res.render('register', {errors: '用户名不能是邮箱'});
  }

  req.checkBody('username', '用户名格式不正确')
      .notEmpty().withMessage('用户名必填')
      .len(3, 20).withMessage('用户名长度在3和20之间');
  req.sanitize('username').trim();

  req.checkBody('password', '密码格式不正确')
      .notEmpty().withMessage('密码必填')
      .len(6, 60).withMessage('密码长度在6和60之间');

  req.checkBody('email', '邮箱格式不正确')
      .notEmpty().withMessage('邮箱必填')
      .isEmail();

  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
        var md5pwd = md5.update(new Buffer(username + password + date)).digest('hex');
        var user = {username: username, md5pwd: md5pwd, email: email, date: date};

        userModel.getUserByUsername(username, function (usernameResult) {
          if (usernameResult.success && usernameResult.data[0]) {
            req.flash('errors', '用户名已存在');
            return res.redirect('/register');
          }
          userModel.getUserByEmail(email, function (emailResult) {
            if (emailResult.success && emailResult.data[0]) {
              req.flash('errors', '邮箱已存在');
              return res.redirect('/register');
            }
            userModel.addUser(user, function (addResult) {
              if (! addResult.success) {
                req.flash('errors', '注册失败');
                return res.redirect('/register');
              }

              var token_str = tools.random_str(7);
              var token = {token: token_str, email: email, type: 'register_confirm', date: date};
              tokenModel.addToken(token, function (addResult) {
                if (addResult.success) {
                  var url = config.baseUrl + '/token/' + tools.random_str(2) + '?type=register&check=' + tools.random_str(6, 16, 'register_confirm', 8, token_str)[1];
                  var cont = '欢迎注册，请在48小时内点击以下链接确认邮箱。<a href="' + url + '" target="_blank">' + url + "</a>如果您的浏览器不能直接点击，请复制该链接直接使用。<p>如该邮件不是你本人发出，请忽略！</p>"
                  emailLib.sendMail(email, user.username + '进行注册', cont, function (sendResult) {
                    if (sendResult.success) {
                      return res.render('message', {message: '注册确认邮件已发送到邮箱，去邮箱打开链接吧！'});
                    } else {
                      return res.render('message', {message: '邮件发送失败！如需验证，请在用户个人信息页重新验证'});
                    }
                  });
                } else {
                  return res.render('register', {message: '系统出错，请稍后再试！'});
                }
              });
              
              // delete user.password;
              // req.session.user = user;
              // res.redirect('/book');
            });
          });
        });
      } else {
        console.log(result.useFirstErrorOnly().mapped());
        res.render('register', {errors: result.useFirstErrorOnly().mapped()});
    }
  });
});

router.get('/logout', checkLogin, function(req, res, next) {
  req.session.user = null;
  res.redirect('/book');
});

router.get('/forgot-password', checkNotLogin, function(req, res, next) {
  res.locals.ebook.title = '找回密码';

  var captcha = tools.captcha();
  req.session.captcha = captcha.text;
  res.render('users/forgot-password', {captcha: captcha.base64 });
});

router.post('/forgot-password', checkNotLogin, function(req, res, next) {
  var captchaText = req.session.captcha || '';
  var email = req.body.email;
  var captcha = req.body.captcha;
  var md5 = crypto.createHash('md5');
  var date = moment().unix();

  res.locals.ebook.title = '找回密码';

  req.checkBody('email', '邮箱格式不正确')
      .notEmpty().withMessage('邮箱必填')
      .isEmail();
  req.checkBody('captcha', '验证码不正确')
      .notEmpty().withMessage('验证码必填')
      .lowerToEqual(captchaText);

  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
      userModel.getUserByEmail(email, function (userResult) {
        if (userResult.success) {
          var user = userResult.data[0];
          if (user) {
            var token_str = tools.random_str(7);
            var token = {token: token_str, email: email, type: 'forgot_pwd', date: date};
            tokenModel.addToken(token, function (addResult) {
              if (addResult.success) {
                var url = config.baseUrl + '/token/' + tools.random_str(2) + '?type=forgot&check=' + tools.random_str(6, 16, 'forgot_pwd', 8, token_str)[1];
                var cont = '您在使用找回密码密码功能，请在30分钟内点击以下链接进行重置密码。<a href="' + url + '" target="_blank">' + url + "</a>如果您的浏览器不能直接点击，请复制该链接直接使用。"
                emailLib.sendMail(email, user.username + '进行密码重置', cont, function (sendResult) {
                  if (sendResult.success) {
                    console.log(sendResult.data)
                    return res.render('message', {message: '重置密码链接已发送到邮箱，去邮箱打开链接吧！'});
                  } else {
                    console.log(sendResult.data)
                    return res.render('message', {message: '邮件发送失败！'});
                  }
                });
              } else {
                var captcha = tools.captcha();
                req.session.captcha = captcha.text;
                return res.render('users/forgot-password', {captcha: captcha.base64, errors: addResult.data.message});
              }
            }, 120);
          } else {
            var captcha = tools.captcha();
            req.session.captcha = captcha.text;
            return res.render('users/forgot-password', {captcha: captcha.base64, errors: '请输入正确的邮箱'});
          }
        } else {
          var captcha = tools.captcha();
          req.session.captcha = captcha.text;
          return res.render('users/forgot-password', {captcha: captcha.base64, errors: '系统出错，请稍后再试！'});
        }
      });
    } else {
      console.log(result.mapped());
      var captcha = tools.captcha();
      req.session.captcha = captcha.text;
      res.render('users/forgot-password', {captcha: captcha.base64, errors: result.useFirstErrorOnly().mapped()});
    }
  });
});

router.get('/token/:tokenId', checkNotLogin, function (req, res, next) {
  var rand_str = req.params.tokenId;
  var type = req.query.type;
  var check = req.query.check;
  var date = moment().unix();

  res.locals.ebook.title = '用户验证';

  var time_str = tools.decodeHex(2, rand_str)[0];

  if (!time_str || date - time_str > 3600*30) {
    return res.render('message', {message: '链接已失效，请重新操作！'});
  }

  if (type === 'register') {
    var token_str = tools.decodeHex(1, check, 'register_confirm');
  } else if (type === 'forgot') {
    var token_str = tools.decodeHex(1, check, 'forgot_pwd');
  } else {
    return res.render('message', {message: '链接已失效，请重新操作！'});
  }

  
  tokenModel.getTokenByToken(token_str, function (tokenResult) {
    if (tokenResult.success && tokenResult.data[0]) {
      var token = tokenResult.data[0];
      if (token.type == 'forgot_pwd') {
        if (date - token.create_time < 1800) {
          userModel.getUserByEmail(token.email, function  (userResult) {
            if (userResult.success && userResult.data[0]) {
              var user = userResult.data[0];
              return res.render('users/change-pwd', {this_user: user, token: check});
            } else {
              return res.render('message', {message: '该用户不存在'});
            }
          })
        } else {
          return res.render('message', {message: '链接已失效，请重新操作！'});
        }
      }
      if (token.type == 'register_confirm') {
        if (date - token.create_time < 3600*48) {
          userModel.getUserByEmail(token.email, function  (userResult) {
            if (userResult.success && userResult.data[0]) {
              var user = {status: 1, change_time: date};
              userModel.updateUser(user, {email: token.email}, function (userResult) {
                if (userResult.success) {
                  tokenModel.updateToken({token: token_str, status: 0, change_time: date}, function (updateResult) {});
                  return res.render('message', {message: '注册成功，去登录吧'});
                } else {
                  return res.render('message', {message: '操作失败'});
                }
              });
            } else {
              return res.render('message', {message: '该用户不存在'});
            }
          })
        } else {
          return res.render('message', {message: '链接已失效，请重新操作！'});
        }
      }
    } else {
      return res.render('message', {message: '该链接不存在'});
    }
  }, 1);
});

router.post('/reset/password', checkNotLogin, function (req, res, next) {
  var check = req.body.token;
  var username = req.body.username;
  var password = req.body.password;
  var passconf = req.body.passconf;
  var create_time = req.body.create_time;
  var md5 = crypto.createHash('md5');
  var date = moment().unix();

  res.locals.ebook.title = '重置密码';

  var token_str = tools.decodeHex(1, check, 'forgot_pwd');

  if (token_str.length === 0) {
    return res.render('message', {message: '链接已失效，请重新操作！'});
  }

  req.checkBody('username', '不要修改默认用户名')
      .notEmpty()
      .len(3, 20);

  req.checkBody('password', '密码格式不正确')
      .notEmpty().withMessage('密码必填')
      .len(6, 60).withMessage('密码长度在6和60之间')
      .equals(passconf).withMessage('两次密码不相同');

  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
      var token = {token: token_str, status: 0, change_time: date};
      tokenModel.getTokenByToken(token_str, function (tokenResult) {
        if (tokenResult.success && tokenResult.data[0]) {
          var exit_token = tokenResult.data[0];
          tokenModel.updateToken(token, function (updateResult) {
            if (updateResult.success) {
              if (exit_token.type == 'forgot_pwd') {
                var md5pwd = md5.update(new Buffer(username + password + create_time)).digest('hex');
                var user = {md5pwd: md5pwd, change_time: date}
                userModel.updateUser(user, {email: exit_token.email}, function (userResult) {
                  if (userResult.success) {
                    return res.render('message', {message: '密码重置成功，去登录吧'});
                  } else {
                    return res.render('message', {message: '操作失败'});
                  }
                });
              } else {
                return res.render('message', {message: '操作失败'});
              }
            } else {
              return res.render('message', {message: '操作失败'});
            }
          });
        } else {
          return res.render('message', {message: '该链接不存在！'});
        }
      });
    } else {
      console.log(result.mapped());
      tokenModel.getTokenByToken(token_str, function (tokenResult) {
        if (tokenResult.success && tokenResult.data[0]) {
          var token = tokenResult.data[0];
          if (token.type == 'forgot_pwd') {
            if (date - token.create_time < 1800) {
              userModel.getUserByEmail(token.email, function  (userResult) {
                if (userResult.success && userResult.data[0]) {
                  var user = userResult.data[0];
                  return res.render('users/change-pwd', {this_user: user, token: check, errors: result.useFirstErrorOnly().mapped()});
                } else {
                  return res.render('message', {message: '该用户不存在'});
                }
              })
            } else {
              return res.render('message', {message: '链接已失效，请重新操作！'});
            }
          }
        } else {
          return res.render('message', {message: '该链接不存在'});
        }
      }, 1);
    }
  });
});

router.get('/home/password', checkLogin, function (req, res, next) {
  res.locals.ebook.title = '修改密码';
  var user = req.session.user;
  res.render('users/update-pwd', {user: user});
});

router.post('/home/password', checkLogin, function (req, res, next) {
  var user = req.session.user;
  var passold = req.body.passold;
  var password = req.body.password;
  var passconf = req.body.passconf;
  var md5 = crypto.createHash('md5');
  var date = moment().unix();
  var username = user.username;

  res.locals.ebook.title = '修改密码';

  req.checkBody('passold', '原始密码格式不正确')
      .notEmpty().withMessage('原始密码必填')
      .len(6, 60).withMessage('原始密码长度在6和60之间');

  req.checkBody('password', '新密码格式不正确')
      .notEmpty().withMessage('新密码必填')
      .len(6, 60).withMessage('新密码长度在6和60之间')
      .equals(passconf).withMessage('新密码和确认密码不相同');

  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
      userModel.getUserByUsername(username, function (userResult) {
        if (userResult.success) {
          console.log(userResult.success[0]);
          if (userResult.success[0] && userResult.success[0].md5pwd === md5.update(new Buffer(username + passold + user.create_time)).digest('hex')) {
            var md5pwd = md5.update(new Buffer(username + password + user.create_time)).digest('hex');
            var new_user = {md5pwd: md5pwd, change_time: date}
            userModel.updateUser(new_user, {email: user.email}, function (updateResult) {
              if (updateResult.success) {
                return res.render('message', {message: '密码重置成功，去登录吧'});
              } else {
                return res.render('message', {message: '操作失败'});
              }
            });
          } else {
            return res.render('users/update-pwd', {errors: {'passold': {'msg': '原始密码错误'}}});
          }
        } else {
          return res.render('message', {message: '操作失败'});
        }
      })
      
    } else {
      console.log(result.mapped());
      return res.render('users/update-pwd', {user: user, errors: result.useFirstErrorOnly().mapped()});
    }
  });
});

router.get('/home/update', checkLogin, function (req, res, next) {
  res.locals.ebook.title = '修改个人信息';

  var user = req.session.user;
  res.render('users/update-info', {user: user});
});

router.post('/home/update', checkLogin, function (req, res, next) {
  var user = req.session.user;
  var nickname = req.body.nickname;
  var sex = req.body.sex;
  var date = moment().unix();
  var username = user.username;

  res.locals.ebook.title = '修改个人信息';

  req.checkBody('nickname', '昵称格式不正确')
      .optional({ checkFalsy: true })
      .len(2, 20).withMessage('昵称长度在2和20之间(可不填)');
  req.checkBody('sex', '请选择')
      .notEmpty()
      .inArray(['保密', '男', '女']);

  req.getValidationResult().then(function(result) {
    if (result.isEmpty()) {
      userModel.getUserByUsername(username, function (userResult) {
        if (userResult.success) {
          var new_user = {nickname: nickname, sex: sex, change_time: date}
          userModel.updateUser(new_user, {email: user.email}, function (updateResult) {
            if (updateResult.success) {
              return res.redirect('/home');
            } else {
              return res.render('message', {message: '操作失败'});
            }
          });
        } else {
          return res.render('message', {message: '操作失败'});
        }
      })
      
    } else {
      console.log(result.mapped());
      return res.render('users/update-info', {user: user, errors: result.useFirstErrorOnly().mapped()});
    }
  });
});

router.get('/home/avatar', checkLogin, function (req, res, next) {
  res.locals.ebook.title = '修改头像';

  var userId = req.session.user.id;
  res.locals.page = 'uplaod-avatar-page';
  userModel.getUserById(userId, function (userResult) {
    res.render('users/update-avatar', {user: userResult.data[0]})
  });
});

module.exports = router;
