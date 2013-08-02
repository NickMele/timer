var passport = require('passport'),
	GoogleStrategy = require('passport-google').Strategy,
	RememberMeStrategy = require('passport-remember-me').Strategy,
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Token = require('../model/token'),
	url = process.env.URL || 'http://localhost:5000';

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
	console.log('serialize: ', user._id);
	done(null, user._id);
});

passport.deserializeUser(function(user, done) {
	console.log('deserialize: ', user._id);
	User.findById(user._id, function(err, user) {
		done(null, user);
	})
});

passport.use(new RememberMeStrategy(
	function(token, done) {
		Token.consume(token, function (err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false);
			}
			return done(null, user);
		});
	},
	function(user, done) {
		var token = Token.generateRandomToken();
		Token.save(token, user, function(err) {
			if (err) {
				return done(err);
			}
			return done(null, token);
		});
	}
));

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
	returnURL: url + '/auth/google/return',
	realm: url + '/'
  },
  function(identifier, profile, done) {
	process.nextTick(function () {
		User.findOneAndUpdate(
			{ openId: identifier },
			{ openId: identifier },
			{ upsert: true },
			function(err, user) {
				console.log('from db: ', user);
				done(err, user);
			}
		);
	});
  }
));

// Simple route middleware to ensure user is authenticated.  Otherwise send to login page.
exports.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login')
}