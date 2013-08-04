var mongoose = require('mongoose'),
	Timer = mongoose.model('Timer');

exports.getTimers = function(req, res) {
	// set up our conditions
	var userId = req.session.passport.user,
		conditions = {
			userId: userId
		};

	// what fields do we want to select
	var fields = '-userId';

	// search the db for timers matching this user
	Timer.find(conditions, fields, function(error, timers) {
		
		if (error) {
			// if there was an error, do something
			console.log(err);
		} else {
			// broadcast the message to load this timer to the room
			req.io.room(userId).broadcast('timer:get:list', timers);
		}

		// respond to the request with the timer data, and status
		req.io.respond({
			error: error,
			data: timers
		});

	});
};

exports.setCurrentTimer = function(req) {

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;

	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:set:current_timer', req.data);

	// respond to the client the data
	req.io.respond({
		data: req.data
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

			// get timer list for user
			Timer.findById(userId, function(error,timers) {

				// store the timers in data
				response = {
					error: error,
					data: timers
				};

				// respond to the client with our response
				req.io.respond(response);

			});

		}

	});
};

exports.startTimer = function(req) {

	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update).exec();

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:start', req.data);
	
};

exports.pauseTimer = function(req) {

	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update).exec();

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:pause', req.data);
	
};

exports.resetTimer = function(req) {
	
	var conditions = {
			_id: req.data._id
		},
		update = req.data;

	// delete the _id from the data
	delete update._id;
	
	// update the timer state
	Timer.findOneAndUpdate(conditions, update).exec();

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:reset', req.data);
	
};