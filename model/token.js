var mongoose = require('mongoose'),
	Token = mongoose.model('Token');

exports.consume = function consume(token, done) {
	console.log(token);
	Token.findOneAndRemove({token: token}, function(err, doc) {
		var userId;

		console.log(err, doc);

		if (err == null) {
			userId = doc.userId;
		}
		return done(null, {_id: userId});
	});
};

exports.save = function save(token, userId, done) {
	Token.create({token: token, userId: userId}, function(err) {
		console.log('error: ', err);
		return done();
	});
};

exports.generateRandomToken = function () {
  var user = this,
      chars = "_!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
      token = new Date().getTime() + '_';
  for ( var x = 0; x < 16; x++ ) {
    var i = Math.floor( Math.random() * 62 );
    token += chars.charAt( i );
  }
  return token;
};