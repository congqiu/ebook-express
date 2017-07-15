module.exports = {
	checkLogin: function (req, res, next) {
		if (!req.session.user) {
			req.flash('errors', '未登录, 现在登录');
			return res.redirect('/login?return_to=' + encodeURIComponent(req.originalUrl));
		}
		next();
	},
	checkNotLogin: function (req, res, next) {
		if (req.session.user) {
			req.flash('errors', '已登录');
			return res.redirect('back');
		}
		next();
	}
}