(function($) {
	
$.clChat = function(options) {
  this.socket = options.socket || null;
  this.beforeEmoji = options.beforeEmoji || false;
  this.currentUser = options.currentUser || null;
  this.showUserLists = options.showUserLists || false;
  var self = this;
  self.init = function() {
    self.socket.on('connect', function() {
      self.socket.emit('init');
    });
  	$('.send-board .btn-send').click(function(event) {
  		var msg = $('.send-board div.message')[0].innerHTML;
  		var color = $('.send-board input[name=color]').val();
      var reg = /[^(<div>)?<br>(</div>)?]/;
      if (msg.trim().length != 0 && reg.test(msg)) {
        setCookie('chat_color', color);
        self.socket.emit('postMsg', msg);
        $('.send-board div.message')[0].innerHTML = '';
      };
  	});
    $('.send-board .message').keyup(function(event) {
      var msg = $('.send-board div.message')[0].innerHTML;
      var color = $('.send-board input[name=color]').val();
      var reg = /[^(<div>)?<br>(</div>)?]/;
      if (event.keyCode == 13 && !event.ctrlKey && msg.trim().length != 0 && reg.test(msg)) {
        if ($('.send-board div.message').text().length > 1000) {
          self._showNewMsg('系统消息', '消息过长，请多条发送！', {color: 'red'});
          return false;
        }
        event.preventDefault();
        setCookie('chat_color', color);
        self.socket.emit('postMsg', msg);
        $('.send-board div.message')[0].innerHTML = '';
        return false;
      };
      if (event.ctrlKey && event.keyCode == 13) {
        $('.send-board div.message').html($('.send-board div.message').html() + '<br><br>');
        placeCaretAtEnd($('.send-board div.message').get(0));
        return false;
      }
    });
  	$('#sendImage').change(function(event) {
  		previewImage(event.target);
      $('#sendImage').val('');
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
       $('.send-board div.message').html($('.send-board div.message').html() + self._showEmoji('[emoji:' + $(this).attr('title') + ']'));
       $('.emoji-board').hide();
    });
    $('.send-board input[name=clear]').click(function(event) {
      $('#historyMsgs').children().remove();
    });
    $(document).click(function(event) {
      $('.emoji-board').hide();
    });
    $('#historyMsgs').on('dblclick', 'p .nickname.user', function(event) {
      $('.send-board div.message').html($('.send-board div.message').html() + '<span>@' + $(this).text() + '</span> ').focus();
        placeCaretAtEnd($('.send-board div.message').get(0));
    });


    self.socket.on('loginFail', function(msg) {
      $('.before-login').show();
      $('.before-login .info').text(msg);
    });
  	self.socket.on('loginSuccess', function (msg) {
      $('.before-login').hide();
  	});
  	self.socket.on('systemMsg', function (msg) {
  		self._showNewMsg('系统消息', msg, {color: 'red'});
  		// notice(msg);
  	});
  	self.socket.on('newMsg', function (user, msg) {
  		var color = getCookie('chat_color') || $('.send-board input[name=color]').val();
  		self._showNewMsg(user, msg, {color: color});
  	});
    self.socket.on('showOnline', function(msg) {
      var info = msg.user_info;
      $(".users-list").empty();
      var user_account = 0;
      for(var user in info) {
        var username = info[user].username;
        var avatar = (info[user].avatar) ? '/avatar/' + info[user].avatar : "/avatar/default.jpg";
        if(user != self.currentUser) {
          if (self.showUserLists) {
            var image ="<li rel='" + user + "'><span class='chat_photo'><a href='javascript:show_chat(" +user+ ");' class='showChat' title='Click to Chat with " +username+ "' user='"+ user+ "'><image src='" +avatar+ "' alt='" +username+ "' width='28' height='28'></a></span><strong>" +username+ "</strong><span class='cl'></span></li>";
            $(".users-list").append(image);
          }
          user_account++;
        }
      }
      $('#status').text(user_account + 1 + '个用户在线');
    });

  	Notification.requestPermission(function(permission) {});
    
    self.notice = function (msg) {  
      var _notification = new Notification(`消息通知`, {
        body:`${msg}`
      });
      setTimeout(function(){
        _notification.close();
      }, 5000);
    }
  }

  self._showNewMsg = function (user, msg, options) {
  	var date = new Date().toTimeString().substr(0, 8);
  	var msgHtml = document.createElement("p");
    var uclass = user === '系统消息' ? 'system' : 'user';
  	msgHtml.innerHTML = '<span class="nickname ' + uclass + '">' + user + '</span> <span class="timespan">(' + date + '): </span>' + msg;
  	var color = options.color || '#000';
  	$(msgHtml).css('color', color);
  	$('#historyMsgs').append(self._showEmoji(msgHtml));
  }
  self._displayImage = function(user, imgData, options) {
  	var date = new Date().toTimeString().substr(0, 8);
  	var msgHtml = document.createElement("p")
  	msgHtml.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
  	var color = options.color || '#000';
    $('#historyMsgs').append(msgHtml);
  },
  self._initialEmoji = function() {
    if ($('.emoji-board .emoji-body .item img').length > 0) {
      return false;
    }
    for(var k = 0; k < 2; k++){
      var docFragment = document.createDocumentFragment();
      for (var i = 69; i > 0; i--) {
          var emojiItem = document.createElement('img');
          emojiItem.src = '../emoji/' + k + '/' + i + '.gif';
          emojiItem.title =  k + '-' + i;
          docFragment.appendChild(emojiItem);
      };
      $('.emoji-board .emoji-body .item.item-' + k).append(docFragment);
    }
  },
  self._showEmoji = function(msg) {
    var match;
    var result = msg;
    var reg = /\[emoji:(\d+)-(\d+)\]/g;
    var emojiTypes = $('.emoji-body .item').length;
    var totalEmojiNum;
    while (match = reg.exec(msg)) {
      if (match[1] > emojiTypes) {
        result = result.replace(match[0], '[X]');
      } else {
        totalEmojiNum = $('.emoji-body .item-' + match[1] + ' img').length;
        if (match[2] > totalEmojiNum) {
          result = result.replace(match[0], '[X]');
        } else {
          result = result.replace(match[0], '<img class="emoji" src="../emoji/' + match[1] + '/' + match[2] + '.gif" />');
        };
      }
    };
    return result;
  },

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
  if(false && window.URL) {
    img.src = window.URL.createObjectURL(file.files[0]);
    img.onload = function(e) {
      window.URL.revokeObjectURL(this.src); //图片加载后，释放object URL
    }
  } else if (window.FileReader) {
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