var express = require('express.io'),
	passport = require('passport'),
	app = express(),
	config = {
		db: require('./config/dbschema'),
		passport: require('./config/passport')
	},
	routes = {
		base: require('./routes/base'),
		account: require('./routes/account'),
		timer: require('./routes/timer')
	},
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
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.session({
		secret: 'amazing application'
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(express.static(__dirname + '/assets'));
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
	var userId = req.session.passport.user._id;
	// join the room
	req.io.join(userId);
});


/* Account routes
------------------------------------------------------------------------- */

// GET /login
app.get('/login', routes.account.getlogin);

// GET /auth/google
app.get('/auth/google', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
	res.redirect('/');
});

// GET /auth/google/return
app.get('/auth/google/return', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
	res.redirect('/');
});

// GET /logout
app.get('/logout', routes.account.logout);


/* Timer routes
------------------------------------------------------------------------- */

// new routes - knockout
app.io.route('get:timers', routes.timer.getTimers);
app.io.route('set:current_timer', routes.timer.setCurrentTimer);
app.io.route('save:timer', routes.timer.saveTimer);

// old routes - nonknockout
app.get('/get/timers/:objectId', routes.timer.getTimer);
app.io.route('/get/timer/data', routes.timer.getTimerData);
app.io.route('/set/timer/data', routes.timer.setTimerData);
app.io.route('/notify/get/timer', routes.timer.notifyGetTimer);
app.io.route('/notify/start/timer', routes.timer.startTimer);
app.io.route('/notify/pause/timer', routes.timer.pauseTimer);
app.io.route('/notify/reset/timer', routes.timer.resetTimer);


/* ----------------------------------------------------------------------
|	-- LISTENER --
------------------------------------------------------------------------- */
app.listen(port, function() {
  console.log("Listening on " + port);
});