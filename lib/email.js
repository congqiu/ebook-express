var Mailgun = require('mailgun-js');
var config = require('config-lite')(__dirname);

module.exports = {
   sendMail: function (to_mail, subject, html, cb, from_mail) {
      var mailgun = new Mailgun({apiKey: config.mailgun.apikey, domain: config.mailgun.domain});

      var data = {
         from: from_mail || config.mailgun.from,
         to: to_mail,
         subject: subject,
         html: html
      }

      mailgun.messages().send(data, function (err, body) {
         if (err) {
            cb({success: false, data: err});
         }
         //Else we can greet    and leave
         else {
            cb({success: true, data: body});
         }
      });
   }
}