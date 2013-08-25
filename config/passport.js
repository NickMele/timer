var passport = require('passport'),
	GoogleStrategy = require('passport-google').Strategy,
	RememberMeStrategy = require('passport-remember-me').Strategy,
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Token = require('../model/token'),
	url = process.env.URL || 'http://192.168.1.135:5000';

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
	console.log('serialize: ', user);
	done(null, user._id);
});

passport.deserializeUser(function(userId, done) {
	console.log('deserialize: ', userId);
	User.findById(userId, function(err, user) {
		done(null, user);
	});
});

passport.use(new RememberMeStrategy(
	function(token, done) {
		Token.consume(token, function (err, userId) {
			if (err) {
				return done(err);
			}
			if (!userId) {
				return done(null, false);
			}
			User.findById(userId, function(err, user) {
				if (err) { return done(err); }
		        if (!user) { return done(null, false); }
		        return done(null, user);
			});
		});
	},
	function(user, done) {
		var token = Token.generateRandomToken();
		Token.save(token, user._id, function(err) {
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
		console.log('google id: ' + identifier);

		var user = new User({
			openId: identifier
		});

		// Convert the Model instance to a simple object using Model's 'toObject' function
		// to prevent weirdness like infinite looping...
		var upsertData = user.toObject();

		// Delete the _id property, otherwise Mongo will return a "Mod on _id not allowed" error
		delete upsertData._id;

		User.findOneAndUpdate(
			{ openId: identifier },
			upsertData,
			{ upsert: true },
			function(err, user) {
				console.log(err);
				return done(null, user);
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