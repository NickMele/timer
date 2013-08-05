var express = require('express.io'),
	passport = require('passport'),
	app = express(),
	MongoStore = require('connect-mongo')(express),
	config = {
		db: require('./config/dbschema'),
		passport: require('./config/passport')
	},
	routes = {
		base: require('./routes/base'),
		account: require('./routes/account'),
		timer: require('./routes/timer')
	},
	Token = require('./model/token'),
	port = process.env.PORT || 5000;

/* ----------------------------------------------------------------------
|	-- CONFIGURATION --
------------------------------------------------------------------------- */

// set up socket io
app.http().io();

// configure socket io to work on heroku
app.io.configure(function () { 
	app.io.set("transports", ["xhr-polling"]); 
	app.io.set("polling duration", 10); 
});

// configure Express
app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.logger('dev'));
	app.use(express.static(__dirname + '/assets'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	// app.use(express.session({
	// 	secret: 'amazing application'
	// }));
	app.use(express.session({
		store: new MongoStore({
			url: process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/timer'
		}),
		secret: '1234567890QWERTY'
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(passport.authenticate('remember-me'));
	app.use(app.router);
});

/* ----------------------------------------------------------------------
|	-- ROUTING --
------------------------------------------------------------------------- */

/* Basic routes
------------------------------------------------------------------------- */
// main page
app.get('/', config.passport.ensureAuthenticated, routes.base.index);

// when the client is ready, have them join a user room
app.io.route('ready', function(req) {
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// join the room
	req.io.join(userId);
});


/* Account routes
------------------------------------------------------------------------- */

// GET /login
app.get('/login', routes.account.getlogin);

// GET /auth/google
app.get('/auth/google', passport.authenticate('google', { failureRedirect: '/login' }),  function(req, res) {
	res.redirect('/');
});

// GET /auth/google/return
app.get(
	'/auth/google/return',
	passport.authenticate('google', {
		failureRedirect: '/login'
	}),
	function(req, res, next) {
		var token = Token.generateRandomToken();
		Token.save(token, req.user._id, function(err) {
			if (err) {
				return done(err);
			}
			res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
			return next();
		});
	},
	function(req, res) {
		res.redirect('/');
	}
);

// GET /logout
app.get('/logout', routes.account.logout);


/* Timer routes
------------------------------------------------------------------------- */

app.io.route('timer:get:list', routes.timer.getTimers);
app.io.route('timer:set:current_timer', routes.timer.setCurrentTimer);
app.io.route('timer:save', routes.timer.saveTimer);
app.io.route('timer:remove', routes.timer.removeTimer);
app.io.route('timer:start', routes.timer.startTimer);
app.io.route('timer:pause', routes.timer.pauseTimer);
app.io.route('timer:reset', routes.timer.resetTimer);


/* ----------------------------------------------------------------------
|	-- LISTENER --
------------------------------------------------------------------------- */
app.listen(port, function() {
  console.log("Listening on " + port);
});