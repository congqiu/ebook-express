var redis = require('redis');
var cookie = require('cookie');
var cookieParser = require('cookie-parser');
var config = require('config-lite')(__dirname);
var redisClient = redis.createClient();

var online_user_chat_key = "chat:";
var online_user_list_key = "user:list";

var socket_users = [];
var user_info_hash = {};
var break_users = {};

var socketLib = function (io, sessionStore) {
  io.set('authorization', function(handshakeData, cb) {
    var cookies = cookie.parse(handshakeData.headers.cookie);
    var connectKey = cookies[config.session.key];
    if (connectKey) {
      var connected = cookieParser.signedCookie(connectKey, config.session.secret);
      if(connected) {
        sessionStore.client.get('sess:' + connected, function (error, session) {
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
        socket.emit('loginSuccess');
        var user = socket.handshake.headers.sessions.user;
        delete break_users[user.id];
        socket.nickname = user.nickname || user.username;
        socket.user = user;
        socket_users.push(socket.nickname);
        redisClient.sadd(online_user_list_key, user.id, function(err, res){
          update_user_list(user.id, socket);
        });
        if (user_info_hash[user.id]) {
          return;
        }
        user_info_hash[user.id] = user;
        io.sockets.emit('systemMsg', socket.nickname + '加入房间！', socket_users.length);
      } else {
        return socket.emit('loginFail', '请先登录！');
      }
    });
    socket.on('postMsg', function (msg) {
      if (!socket.nickname) {
        socket.emit('loginFail', '请先登录！');
      } else {
        if (msg.match(/id="preview(\w+)"/)) {
          msg = msg.replace(/id="preview(\w+)"/g,"");
          msg = msg.replace(/class="pre-img"/g,"");
        }
        var id_user = socket.user.id;
        var json = JSON.stringify({'id_user': id_user, 'type': 'group', 'message': msg, 'date': (Date.parse(new Date())/1000)});
        redisClient.lpush(online_user_chat_key + id_user, json, function(err, res){
          
        });
        io.sockets.emit('newMsg', socket.nickname, msg);
      }
    });
    socket.on('error', (error) => {
      console.log(error)
    });
    socket.on('disconnect', function(reason) {
      if (socket.nickname) {
      }
      var user_id = socket.user.id;
      break_users[user_id] = socket.id;
      setTimeout(function () {
        if(user_id && break_users[user_id]) {
          socket_users.shift(socket.nickname);
          socket.broadcast.emit('systemMsg', socket.nickname + '离开！', socket_users.length);
          redisClient.srem(online_user_list_key, user_id, function(){
            update_user_list(user_id, socket);
          });
          delete user_info_hash[user_id];
          delete break_users[user_id];
        }
      }, 10000);
    });
  });

  function update_user_list(id_user, socket) {
    redisClient.smembers(online_user_list_key, function(error, users) {
      if(users.length > 0) {
        var user_info = {};
        for(var i in users) {
          var user_id = users[i];
          if(undefined != user_info_hash[user_id]) {
            user_info[user_id] = user_info_hash[user_id];
          }
        }
        show_online_users(user_info, id_user, socket);
      }
    });
  }

  function show_online_users(user_info, id_user, socket) {
    var reply = {id_user: id_user, user_info: user_info};
    io.sockets.emit('showOnline', reply);
  }

}

module.exports = socketLib;