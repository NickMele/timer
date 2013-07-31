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

// Remember Me implementation helper method
userSchema.methods.generateRandomToken = function () {
  var user = this,
      chars = "_!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
      token = new Date().getTime() + '_';
  for ( var x = 0; x < 16; x++ ) {
    var i = Math.floor( Math.random() * 62 );
    token += chars.charAt( i );
  }
  return token;
};

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
	length: {
		type: Number
	},
	state: {
		type: String,
		enum: 'stopped started paused'.split(' ')
	},
	timeElapsed: {
		type: Number,
		default: 0
	}
});

// Export timer model
exports.timerModel = mongoose.model('Timer', timerSchema);