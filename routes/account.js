var passport = require('passport');

exports.getlogin = function(req, res) {
	res.render('account/login', {
		user: req.user
	});
};

exports.logout = function(req, res) {
	res.clearCookie('remember_me');
	req.logout();
	res.redirect('/');
};