var ccap = require('ccap');
var Hashids = require('hashids');
var crypto = require('crypto');
var uuid = require('uuid');

module.exports = {
	captcha: createCaptcha,
  random_str: createRandomStr,
  uuidV4: () => (uuid.v4()),
  decodeHex: function (type = 1, str = '', name = 'ebook', len2 = 0) {
    var hashids = new Hashids(name, len2);
    switch (type) {
      case 2:
        return hashids.decode(str);
        break;
      default:
        return hashids.decodeHex(str);
        break;
    }
  }
}

function createCaptcha() {
	var captcha = ccap({
    width:190,
    height:50,　
    offset:30,
    quality:100,
    fontsize:40,
    // generate:function(){
    //   var str = "qQ";
    //   return str;
    // }
  });
  var ary = captcha.get();
  return {
  	text: ary[0],
  	buf: ary[1],
  	base64: `data:image/png;base64,${ary[1].toString('base64')}`
  }
}

function createRandomStr(type = 1, len1 = 16, name = 'ebook', len2 = 0, str = '', date = Date.parse(new Date())/1000) {
  var hashids = new Hashids(name, len2);

  var str1 = crypto.randomBytes(len1).toString('hex');

  switch (type) {
    case 1:
      return str1;
      break;
    case 2:
      return hashids.encode(date, parseInt(Math.random() * 1000), parseInt(Math.random() * 100));
      break;
    case 3:
      return str1 + hashids.encode(date, parseInt(Math.random() * 1000), parseInt(Math.random() * 100));
      break;
    case 4:
      return hashids.encode(date, parseInt(Math.random() * 1000), parseInt(Math.random() * 100)) + '/' + str1;
      break;
    case 5:
      return [str1, hashids.encodeHex(str1)];
      break;
    case 6:
      return [str, hashids.encodeHex(str)];
      break;
    case 7:
      return crypto.randomBytes(len1 - 4).toString('hex') + (Date.parse(new Date())/1000).toString(16);
      break;
    default:
      return str1;
      break;
  }
  return false;
}