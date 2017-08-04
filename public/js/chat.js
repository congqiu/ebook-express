(function($) {
	
$.clChat = function(options) {
  this.socket = options.socket || null;
  this.beforeEmoji = options.beforeEmoji || false;
  this.currentUser = null;
  this.staticUrl = options.staticUrl || null;

  var self = this;
  self.init = function() {
    self.socket.on('connect', function() {
      self.socket.emit('init');
    });
  	$('.send-board .btn-send').click(function(event) {
      var message_dom = $('.send-board div.message');
      var msg = $('.send-board div.message')[0].innerHTML;
      var reg = /[^(<div>)?(&nbsp;)*(\s)?<br>(&nbsp;)*(</div>)?]/;
      if (! reg.test(msg)) {
        message_dom[0].innerHTML = '';
        showToast('不能发送空白消息！');
        message_dom.focus();
        return false;
      }

      if ($('.send-board div.message').text().length > 1000) {
        showToast('消息过长，请多条发送！');
        message_dom.focus();
        return false;
      }
      self._sendMsg(msg);
      return false;
    });
    $('.send-board .message').keyup(function(event) {
      var message_dom = $('.send-board div.message');
      var msg = message_dom[0].innerHTML;

      if (event.ctrlKey && event.keyCode == 13) {
        var msgHtml = message_dom.html();
        if (!/<br>$/.test(msgHtml)) {
          msgHtml += '<br>';
        }
        message_dom.html(msgHtml + '<br>');
        message_dom.scrollTop(message_dom[0].scrollHeight); 
        placeCaretAtEnd(message_dom.get(0));
        return false;
      }
      var reg = /[^(<div>)?(&nbsp;)*(\s)?<br>(&nbsp;)*(</div>)?]/;  //消息中只包含换行或空格，没有其他
      if (event.keyCode == 13 && !event.ctrlKey) {
        if (! reg.test(msg)) {
          message_dom[0].innerHTML = '';
          showToast('不能发送空白消息！');
          return false;
        }
        if (message_dom.text().length > 1000) {
          showToast('消息过长，请多条发送！');
          return false;
        }
        self._sendMsg(msg);
        return false;
      };
    }).keypress(function(e) {
      if (event.keyCode == 13 && !event.ctrlKey) {
        e.preventDefault();
      }
    });
  	$('#sendImage').change(function(event) {
  		var message_dom = $('.send-board div.message');
      previewImage(event.target);
      $('#sendImage').val('');
      message_dom.focus();
      placeCaretAtEnd(message_dom.get(0));
  	});
    if (self.beforeEmoji !== false && parseInt(self.beforeEmoji) > 0) {
      setTimeout(self._initialEmoji, parseInt(self.beforeEmoji));
    }
    $('.send-board input[name=emoji]').click(function(event) {
      self._initialEmoji();
      $('.emoji-board').show();
      event.stopPropagation();
    });
    $('.emoji-tabs span').click(function() {
      $('.emoji-tabs span').removeClass('active');
      var type = $(this).addClass('active').data('type');
      $('.emoji-body .item').hide();
      $('.emoji-body .item-' + type).show();
      event.stopPropagation();
    });
    $('.emoji-body .item').on('click', 'img', function(event) {
      var message_dom = $('.send-board div.message');
      message_dom.focus().html(message_dom.html() + self._showEmoji('[emoji:' + $(this).attr('title') + ']'));
      placeCaretAtEnd(message_dom.get(0));
      $('.emoji-board').hide();
    });
    $('.send-board input[name=clear]').click(function(event) {
      $('#chat-all').empty();
    });
    $(document).click(function(event) {
      $('.emoji-board').hide();
    });


    self.socket.on('loginFail', function(msg) {
      $('.before-login').show();
      $('.before-login .info').text(msg);
    });
  	self.socket.on('loginSuccess', function (user) {
      $('.before-login').hide();
      self.currentUser = user;
  	});
  	self.socket.on('systemMsg', function (msg, count) {
  		self._showNewMsg('系统消息', msg);
      if (count) {
        $('#status').text(count + '个用户在线');
      }
  	});
  	self.socket.on('newMsg', function (user, msg) {
      var nickname = user.nickname || user.username;
  		self._showNewMsg(nickname, msg, {avatar: user.avatar});
  	});
  }

  self._sendMsg = function (msg) {
    self.socket.emit('groupMsg', msg);
    self._showNewMsg('user', msg, {owner: true, avatar: self.currentUser.avatar});
    $('.send-board div.message').focus()[0].innerHTML = '';
    return;
  }
  self._showNewMsg = function (user, msg, options) {
    var options = options || {};
    var date = new Date().toTimeString().substr(0, 8);
    var timeStamp = Date.parse(new Date()) / 1000;

    var msgHtml = document.createElement("li");
    var uclass = user === '系统消息' ? 'system' : 'user';
    var owner = options.owner || false;
    var msgBody = '';
    var avatar = (options.avatar) ? '/avatar/' + options.avatar : "/avatar/default.jpg";
    var owner_class = owner ? 'self' : '';
    var latest_msg = $('#chat-all').find('p.time').last();
    if (latest_msg.length == 0 || (timeStamp - latest_msg.attr('data-time') > 60)) {
      msgBody = '<p class="time" data-time="' + timeStamp + '"><span>' + date + '</span></p>';
    }
    msg = self.dealMsg(msg);
    
    msgBody += '<div class="message-body ' + owner_class + '">\
                <img class="avatar" src="' + avatar + '">\
                <div class="username">' + user + '</div>\
                <div class="text">' + msg + '</div>\
              </div>';

    if (uclass === 'system') {
      msgBody = '<p class="time"><span>' + date + '</span></p>\
              <div class="message-body system">\
                <div class="text">' + msg + '</div>\
              </div>';
    }
    msgHtml.innerHTML = msgBody;
    $('#chat-all').append(self._showEmoji(msgHtml));
    $('.msgs-board').mCustomScrollbar("scrollTo", 'bottom');
  }
  self._initialEmoji = function() {
    if ($('.emoji-board .emoji-body .item img').length > 0) {
      return false;
    }
    var emoji_src = '../emoji/';
    if (self.staticUrl) {
      emoji_src =  self.staticUrl + '/emojis/';
    }
    $.getScript(emoji_src + 'info.js', function(data, textStatus) {
        for(var k = 0; k < emojisInfo.length; k++){
          var docFragment = document.createDocumentFragment();
          var emoji_info = emojisInfo[k];
          for (var i = emoji_info.start; i < emoji_info.len + emoji_info.start; i++) {
              var emojiItem = document.createElement('img');
              emojiItem.src = emoji_src + k + '/' + i + '.gif';
              emojiItem.title =  k + '-' + i;
              docFragment.appendChild(emojiItem);
          };
          $('.emoji-board .emoji-body .item.item-' + k).append(docFragment);
        }
    });
  }
  self._showEmoji = function(msg) {
    var match;
    var result = msg;
    var reg = /\[emoji:(\d+)-(\d+)\]/g;
    var emojiTypes = $('.emoji-body .item').length;
    var totalEmojiNum;
    var emoji_src = '../emoji/';
    if (self.staticUrl) {
      emoji_src =  self.staticUrl + '/emojis/';
    }
    while (match = reg.exec(msg)) {
      if (match[1] > emojiTypes) {
        result = result.replace(match[0], '[X]');
      } else {
        totalEmojiNum = $('.emoji-body .item-' + match[1] + ' img').length;
        if (match[2] > totalEmojiNum) {
          result = result.replace(match[0], '[X]');
        } else {
          result = result.replace(match[0], '<img class="emoji" src="' + emoji_src + match[1] + '/' + match[2] + '.gif" />');
        };
      }
    };
    return result;
  }

  self.dealMsg = function (msg) {
    if (msg.match(/id="preview(\w+)"/)) {
      msg = msg.replace(/id="preview(\w+)"/g,"");
      msg = msg.replace(/class="pre-img"/g,'class="msg-img"');
    }
    return msg;
  }

  self.init();
};

$.fn.clChat = function () {
	return new $.clChat(arguments[0]);
}
})(jQuery);

function previewImage(file) {
  window.URL = window.URL || window.webkitURL;
  var id = 'preview' + ($('.pre-img').length + 1);
  $('.send-board div.message').append('<img class="pre-img" id=' + id + ' src="" alt="">');
  var img = document.getElementById(id);
  if(file.files[0].type.indexOf('image') === -1) { 
    return {result: false, message: "您拖的不是图片！"}; 
  } 
  if(file.files[0].size > 2 * 1024 * 1024) { 
    return {result: false, message: "图片大小不能超过2M"}; 
  } 
  if (window.FileReader) {
    var reader = new FileReader();
    reader.readAsDataURL(file.files[0]);
    reader.onload = function (evt) {
      img.src = evt.target.result;
    }
  } else {  //IE,效果差强人意
    var preview = document.getElementById('preview');
    var sFilter='filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod=scale,src="';
    file.select();
    var src = document.selection.createRange().text;
    preview.innerHTML =  "<div id=showimg style='width: 180px; height: 180px; "+sFilter+src+"\"'></div>";
  }
  return {result: true, message: "成功"}; 
}

function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  else if (typeof document.body.createTextRange != "undefined") {
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(el);
    textRange.collapse(false);
    textRange.select();
  }
}

function showToast(content, dom, time) {
  var toast_dom = dom || $('.toast-board');
  var time = time || 3000;
  toast_dom.html(content).show();
  var t = setTimeout(function () {
    toast_dom.hide();
    clearTimeout(t);
  }, time);
}