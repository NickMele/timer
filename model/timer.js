var mongoose = require('mongoose'),
	Timer = mongoose.model('Timer');

exports.getTimersByUserId = function getTimersByUserId(userId, callback) {
	Timer.find({userId: userId}, function(err, timers) {
		if (err) {
			console.log(err);
		} else {
			callback(err, timers);
		}
	});
};

exports.getTimerData = function getTimerData(objectId, callback) {
	Timer.findById(objectId, function(err, timer) {
		if (err) {
			console.log(err);
		} else {
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
			if (typeof callback == "function") {
				callback(error, doc);
			}
		}
	);
	
};

exports.removeTimer = function removeTimer(conditions, callback) {
	Timer.remove(conditions, callback);
};