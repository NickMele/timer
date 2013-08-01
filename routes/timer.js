var timerModel = require('../model/timer'),
	mongoose = require('mongoose');

exports.getTimers = function(req, res) {
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user._id;

	timerModel.getTimersByUserId(userId, function(err,timers) {
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('get:timers', timers);
		// respond to the request with the timer data
		req.io.respond({
			data: timers
		});
	});
};

exports.setCurrentTimer = function(req) {
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user._id;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('set:current_timer', req.data);
};



exports.getTimer = function(req, res) {
	timerModel.getTimerData(req.params.objectId, function(err,timer) {
		res.render('zones/_timer-zone', {
			user: req.user,
			timer: timer
		});
	});
};

exports.getTimerData = function(req) {
	timerModel.getTimerData(req.data, function(err,timer) {
		// the user id is going to be used at the room identifier
		var userId = req.session.passport.user;
		// broadcast the message to load this timer to the room
		req.io.room(userId).broadcast('/get/timer/data', timer);
		// respond to the request with the timer data
		req.io.respond({
			timer: timer
		});
	});
};

exports.saveTimer = function(req) {
	var objectId = req.data._id,
		timerData = req.data;

	// we need to process whether this is a new timer or not
	if (!objectId) {

		objectId = new mongoose.Types.ObjectId();
		// get the user id
		var userId = req.session.passport.user._id;
		// add it to the data
		timerData.userId = userId;

	} else {

		// before upserting into mongo we need to remove the _id from the data
		delete timerData._id;

	}

	timerModel.setTimerData(objectId, timerData, function(err,doc) {
		if (doc) {
			// respond to the request with the timer data
			req.io.respond({
				timer: doc
			});
		} else {
			req.io.respond({
				err: err
			});
		}
	});
};

exports.removeTimer = function(req) {
	timerModel.removeTimer(req.data, function(err) {
		// respond to the request with err
		req.io.respond({
			err: err
		});
	});
};

exports.notifyGetTimer = function(req) {
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('/notify/get/timer', req.data);
};

exports.startTimer = function(req) {
	console.log('start');
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('/notify/start/timer', req.data);
	// return success response
	req.io.respond({
		success: true
	});
};

exports.pauseTimer = function(req) {
	console.log('pause');
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('/notify/pause/timer', req.data);
	// return success response
	req.io.respond({
		success: true
	});
};

exports.resetTimer = function(req) {
	console.log('reset');
	// the user id is going to be used at the room identifier
	var userId = req.session.passport.user;
	// broadcast the message to load this timer to the room
	req.io.room(userId).broadcast('/notify/reset/timer', req.data);
	// return success response
	req.io.respond({
		success: true
	});
};