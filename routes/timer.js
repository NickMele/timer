var timerModel = require('../model/timer'),
	mongoose = require('mongoose');

exports.getTimers = function(req, res) {
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;

	console.log(req.session);

	timerModel.getTimersByUserId(userId, function(err,timers) {
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('timer:get:list', timers);
		// respond to the request with the timer data
		req.io.respond({
			data: timers
		});
	});
};

exports.setCurrentTimer = function(req) {

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:set:current_timer', req.data);

	req.io.respond({
		data: req.data
	});
};

exports.saveTimer = function(req) {
	var objectId = req.data._id,
		timerData = req.data;

	// we need to process whether this is a new timer or not
	if (!objectId || objectId == "") {

		objectId = new mongoose.Types.ObjectId();
		// get the user id
		var userId = req.session.passport.user;
		// add it to the data
		timerData.userId = userId;

	}

	// before upserting into mongo we need to remove the _id from the data
	delete timerData._id;

	timerModel.setTimerData(objectId, timerData, function(error,timer) {

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
	
	timerModel.removeTimer(conditions, function(error) {

		// this will be our response object to the client
		var response = {
			error: error,
			data: null
		};

		// if we did not receive an error then lets gather a new timer list and send it back down
		if (response.error == null) {

			// get timer list for user
			timerModel.getTimersByUserId(userId, function(err,timers) {

				// store the timers in data
				response.data = timers;

				// respond to the client with our response
				req.io.respond(response);

			});

		} else {

			// respond to the client with our response
			req.io.respond(response);

		}

	});
};

exports.startTimer = function(req) {

	var objectId = req.data._id,
		data = req.data;

	// delete the _id from the data
	delete data._id;
	
	// save the timer state
	timerModel.setTimerData(objectId, data);

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:start', req.data);
	
};

exports.pauseTimer = function(req) {

	var objectId = req.data._id,
		data = req.data;

	// delete the _id from the data
	delete data._id;
	
	// save the timer state
	timerModel.setTimerData(objectId, data);

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:pause', req.data);
	
};

exports.resetTimer = function(req) {
	
	var objectId = req.data._id,
		data = req.data;

	// delete the _id from the data
	delete data._id;
	
	// save the timer state
	timerModel.setTimerData(objectId, data);

	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('timer:reset', req.data);
	
};