var mongoose = require('mongoose'),
	bcrypt = require('bcrypt'),
	SALT_WORK_FACTOR = 10;

exports.mongoose = mongoose;

// Database connect
var uristring = process.env.MONGOLAB_URI || 
				process.env.MONGOHQ_URL || 
				'mongodb://localhost/timer';

var mongoOptions = {
	db: {
		safe: true
	}
};

mongoose.connect(uristring, mongoOptions, function(err, res) {
	if (err) {
		console.log('ERROR connecting to: ' + uristring + '. ' + err);
	} else {
		console.log('Successfully connected to: ' + uristring);
	}
});

/****************************************************************
/
/ USER SCHEMA
/
/ ****************************************************************/
var userSchema = new mongoose.Schema({
	openId: {
		type: String,
		required: true,
		unique: true
	}
});

// Export user model
exports.userModel = mongoose.model('User', userSchema);

/****************************************************************
/
/ TIMER SCHEMA
/
/ ****************************************************************/

var timerSchema = new mongoose.Schema({
	userId : {
		type: mongoose.Schema.ObjectId,
		required: true
	},
	name: {
		type: String,
		unique: true
	},
	timerLength: {
		type: Number
	},
	state: {
		type: String,
		enum: 'started paused stopped'.split(' ')
	},
	timeElapsed: {
		type: Number,
		default: 0
	}
});

// Export timer model
exports.timerModel = mongoose.model('Timer', timerSchema);

/****************************************************************
/
/ TOKEN SCHEMA
/
/ ****************************************************************/
var tokenSchema = new mongoose.Schema({
	token: {
		type: String,
		required: true,
		unique: true
	},
	userId: {
		type: String,
		required: true
	}
});

// Export user model
exports.tokenModel = mongoose.model('Token', tokenSchema);