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
	username: {
		type: String,
		required: true,
		unique: true
	},
	email: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true
	},
	admin: {
		type: Boolean,
		required: true
	}
});

// Bcrypt middleware
userSchema.pre('save', function(next) {
	var user = this;

	if (!user.isModified('password')) return next();

	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if (err) return next(err);

		bcrypt.hash(user.password, salt, function(err, hash) {
			if (err) return next(err);
			user.password = hash;
			next();
		});
	});
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
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