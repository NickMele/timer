var mongoose = require('mongoose'),
	Timer = mongoose.model('Timer');

exports.getTimerList = function getTimerList(userId, callback) {
	Timer.find({userId: userId}, function(err, timers) {
		if (err) {
			console.log(err);
		} else {
			console.log(timers);
			callback(err, timers);
		}
	});
};

exports.getTimerData = function getTimerData(objectId, callback) {
	Timer.findById(objectId, function(err, timer) {
		if (err) {
			console.log(err);
		} else {
			console.log(timer);
			callback(err, timer);
		}
	});
};

exports.setTimerData = function setTimerData(objectId, timerData, callback) {
	Timer.findByIdAndUpdate(
		objectId,
		{ $set: timerData },
		{ upsert: true },
		function(error, doc) {
			callback(error, doc);
		}
	);
};

exports.removeTimer = function removeTimer(objectId, callback) {
	Timer.find({_id: objectId}, function(err) {
		if (err) {
			console.log(err);
		} else {
			callback(err);
		}
	});
};