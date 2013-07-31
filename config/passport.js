var passport = require('passport'),
	GoogleStrategy = require('passport-google').Strategy,
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	url = process.env.URL || 'http://localhost:5000';

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


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