var mongoose = require('mongoose'),
	Timer = mongoose.model('Timer');

var getTimers = function(req, res) {
	// set up our conditions
	var userId = req.session.passport.user,
		conditions = {
			userId: userId
		},
		response = {};

	// what fields do we want to select
	var fields = '-userId';

	// search the db for timers matching this user
	Timer.find(conditions, fields).sort({name:'asc'}).exec(function(error, timers) {

		response = {
			error: error,
			data: timers,
			currentDateTime: new Date()
		}
		
		if (error) {
			// if there was an error, do something
			console.log(err);
		} else {
			// broadcast the message to load this timer to the room
			req.io.room(userId).broadcast('timer:get:list', response);
		}

		// respond to the request with the timer data, and status
		req.io.respond(response);

	});
};
exports.getTimers = getTimers;

exports.setCurrentTimer = function(req) {

	// set up our conditions
	var userId = req.session.passport.user,
		conditions = {
			userId: userId
		},
		response = {};

	// what fields do we want to select
	var fields = '-userId';

	// search the db for timers matching this user
	Timer.find(conditions, fields).sort({name:'asc'}).exec(function(error, timers) {

		response = {
			error: error,
			data: timers,
			currentDateTime: new Date(),
			currentTimerIndex: req.data
		}
		
		if (error) {
			// if there was an error, do something
			console.log(err);
		} else {
			// broadcast the message to load this timer to the room
			req.io.room(userId).broadcast('timer:set:current_timer', response);

			// respond to the client the data
			req.io.respond(response);
		}

	});

};

exports.saveTimer = function(req) {

	var conditions = {},
		update = req.data,
		options = {
			upsert: true
		};

	// if we are not given an _id, this is a new timer
	if (!req.data._id || req.data._id == "") {

		// create new _id
		conditions._id = new mongoose.Types.ObjectId();

		// get the user id
		update.userId = req.session.passport.user;

	} else {

		conditions._id = req.data._id;

	}

	console.log(req.data,conditions,update);

	// before upserting into mongo we need to remove the _id from the data
	delete update._id;

	// update the model
	Timer.findOneAndUpdate(conditions, update, options, function(error, timer) {
		// this will be our response object to the client
		var response = {
			error: error,
			data: timer
		};

		// respond to the request with the timer data
		req.io.respond(response);
	});

};

exports.removeTimer = function(req) {

	// get the user id
	var userId = req.session.passport.user,
		conditions = {
			_id: req.data,
			userId: userId
		};
	
	Timer.remove(conditions, function(error) {

		// this will be our response object to the client
		var response = {
			error: error,
			data: null
		};

		// if we did not receive an error then lets gather a new timer list and send it back down
		if (error) {

			// respond to the client with our response
			req.io.respond(response);

		} else {

			getTimers(req);

		}

	});
};

exports.startTimer = function(req) {

	console.log(req.data);

	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update, function(error, timer) {

		// the user id is going to be used at the room identifier
		var userId = req.session.passport.user;
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('timer:start', req.data);

	});
	
};

exports.pauseTimer = function(req) {

	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update, function(error, timer) {

		// the user id is going to be used at the room identifier
		var userId = req.session.passport.user;
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('timer:pause', req.data);

	});
	
};

exports.resetTimer = function(req) {
	
	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update, function(error, timer) {

		// the user id is going to be used at the room identifier
		var userId = req.session.passport.user;
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('timer:reset', req.data);

	});
	
};