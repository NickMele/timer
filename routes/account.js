var passport = require('passport');

exports.getlogin = function(req, res) {
	res.render('account/login', {
		user: req.user
	});
};

exports.logout = function(req, res) {
	req.logout();
	res.redirect('/');
};