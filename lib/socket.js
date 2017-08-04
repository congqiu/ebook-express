var redis = require('redis');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var config = require('config-lite')(__dirname);
var redisClient = redis.createClient();

var online_user_chat_key = "ebookchat:";
var online_user_list_key = "ebookuser:list";

var user_info_hash = {};
var break_users = {};
var online_user_count = 0;

var socketLib = function (io) {
  io.set('authorization', function(handshakeData, cb) {
    var cookies = cookie.parse(handshakeData.headers.cookie);
    var connectKey = cookies[config.session.key];
    if (connectKey) {
      var connected = cookieParser.signedCookie(connectKey, config.session.secret);
      if(connected) {
        redisClient.get('sess:' + connected, function (error, session) {
          if (error) {
            cb(error, false);
          } else {
            var session = JSON.parse(session);
            handshakeData.headers.sessions = session;
            if (session && session.user) {
              cb(null, true);
            } else {  
              cb('No login', false);
            }
          }
        });
      } else {
        cb('No session', false);
      }
    }
  });

  io.on('connection', function(socket){
    var id = socket.id;
    socket.on('init', function () {
      if (socket.handshake.headers.sessions) {
        var user = socket.handshake.headers.sessions.user;
        socket.emit('loginSuccess', user);
        delete break_users[user.id];
        socket.nickname = user.nickname || user.username;
        socket.user = user;
        if (user_info_hash[user.id]) {
          return;
        }
        online_user_count ++;
        redisClient.sadd(online_user_list_key, user.id, function(err, res){
        });
        user_info_hash[user.id] = user;
        io.sockets.emit('systemMsg', socket.nickname + '加入房间！', online_user_count);
      } else {
        return socket.emit('loginFail', '请先登录！');
      }
    });
    socket.on('groupMsg', function (msg) {
      if (!socket.nickname) {
        socket.emit('loginFail', '请先登录！');
      } else {
        socket.broadcast.emit('newMsg', socket.user, msg);
        var id_user = socket.user.id;
        var json = JSON.stringify({'id_user': id_user, 'type': 'group', 'message': msg, 'date': (Date.parse(new Date())/1000)});
        redisClient.lpush(online_user_chat_key + id_user, json, function(err, res){
          
        });
      }
    });
    socket.on('error', (error) => {
      console.log(error)
    });
    socket.on('disconnect', function(reason) {
      if (socket.user) {
        var user_id = socket.user.id;
        break_users[user_id] = socket.id;
        setTimeout(function () {
          if(user_id && break_users[user_id]) {
            online_user_count--;
            socket.broadcast.emit('systemMsg', socket.nickname + '离开！', online_user_count);
            redisClient.srem(online_user_list_key, user_id, function(){
            });
            delete user_info_hash[user_id];
            delete break_users[user_id];
          }
        }, 10000);
      }
    });
  });
}

module.exports = socketLib;