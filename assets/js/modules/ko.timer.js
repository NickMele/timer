// set up some global sockets
app.modules.ko.sockets = {
	getTimers			: 'timer:get:list',
	setCurrentTimer		: 'timer:set:current_timer',
	startTimer			: 'timer:start',
	pauseTimer			: 'timer:pause',
	resetTimer			: 'timer:reset',
	saveTimer			: 'timer:save',
	removeTimer			: 'timer:remove'
};

/* ----------------------------------------------------------------------
|	-- TimeViewModel --
------------------------------------------------------------------------- */
app.modules.ko.Timer = function(initialData) {

	var self = this;

	self.sockets = app.modules.ko.sockets;

	self.data = {
		_id			: ko.observable(""),
		name		: ko.observable(""),
		timerLength	: ko.observable(0),
		timeElapsed	: ko.observable(0),
		state		: ko.observable(""),
		timeStarted	: ko.observable("")
	};

	self.computedData = {
		hours		: null,
		minutes		: null,
		seconds		: null
	};

	self.trigger = {
		startTimer: null,
		pauseTimer: null,
		resetTimer: null
	}

	// this is where we will store our interval function
	self.counter = null;

	self.computedData.hours = ko.computed(function() {
		var hours = Math.floor( (self.data.timerLength() - self.data.timeElapsed()) / 3600 );
		if (hours < 10) {
			hours = "0" + hours;
		}
		return hours;
	});

	self.computedData.minutes = ko.computed(function() {
		var minutes = Math.floor( ((self.data.timerLength() - self.data.timeElapsed()) / 60) % 60 );
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		return minutes;
	});

	self.computedData.seconds = ko.computed(function() {
		var seconds =  Math.floor( (self.data.timerLength() - self.data.timeElapsed()) % 60 );
		if (seconds < 10) {
			seconds = "0" + seconds;
		}
		return seconds;
	});

	self.init = function() {

		if (typeof initialData !== "undefined") {

			self.data._id(initialData.data._id);
			self.data.name(initialData.data.name);
			self.data.timerLength(initialData.data.timerLength);
			self.data.timeElapsed(initialData.data.timeElapsed);
			self.data.state(initialData.data.state);
			self.data.timeStarted(initialData.data.timeStarted);

		}

		if (self.data.timeStarted()) {

			var timeStarted = new Date(initialData.data.timeStarted).getTime(),
				currentTime = new Date(initialData.currentDateTime).getTime(),
				differenceInSeconds = Math.floor((currentTime - timeStarted) / 1000);

			self.data.timeElapsed( self.data.timeElapsed() + differenceInSeconds );

			if (self.data.timeElapsed() >= self.data.timerLength()) {

				self.resetTimer();

			} else {

				self.startTimer();

			}

		}

	};

	self.timerCountdown = function() {

		self.data.timeElapsed( self.data.timeElapsed() + 1 );

	}

	self.trigger = {
		startTimer: function() {

			self.startTimer();

			var data = self.getServerReadyData();

			app.modules.socket.emit(self.sockets.startTimer, data, self.startTimer);
		},
		pauseTimer: function() {

			
			
			self.pauseTimer();

			var data = self.getServerReadyData();

			app.modules.socket.emit(self.sockets.pauseTimer, data, self.pauseTimer);
		},
		resetTimer: function() {

			
			
			self.resetTimer();

			var data = self.getServerReadyData();

			app.modules.socket.emit(self.sockets.resetTimer, data, self.resetTimer);
		}
	}

	self.startTimer = function() {

		clearInterval(self.counter);

		self.data.timeStarted(new Date());

		self.data.state("started");

		// 1000 will  run it every 1 second
		self.counter = setInterval(self.timerCountdown, 1000);

	};

	self.pauseTimer = function() {

		self.data.timeStarted("");

		self.data.state("paused");

		clearInterval(self.counter);

	};

	self.resetTimer = function() {

		self.data.timeElapsed(0);

		self.data.timeStarted("");

		clearInterval(self.counter);

		$('.timer-clock span, .timer-name').removeClass('final-countdown');

		self.data.state("stopped");

	};

	self.muteTimer = function() {

		
	};

	self.getServerReadyData = function() {

		return ko.toJS(self.data);

	};

	self.data.timeElapsed.subscribe(function(value) {

		if (self.data.timeElapsed() >= self.data.timerLength()) {

			document.getElementById('audio-handle').play();

			clearInterval(self.counter);

			setTimeout(self.trigger.resetTimer, 5000);

		} else if (self.data.timeElapsed() > (self.data.timerLength() - 5)) {

			// start warning the user we are in the final countdown
			$('.timer-clock span, .timer-name').addClass('final-countdown');

		}

	});

	self.getTimers = function() {

		// emit a message to timer:get:list
		app.modules.socket.emit(self.sockets.getTimers, self.setTimers);

	};

	self.setTimers = function(response) {

		// assign this mapping to our timers observable
		self.data.timers(response.data);

	};

	self.init();

};

/* ----------------------------------------------------------------------
|	-- EditorViewModel --
------------------------------------------------------------------------- */
app.modules.ko.Editor = function(data) {

	var self = this;

	if (typeof data == "undefined") {
		data = {}
	}

	self.data = {
		_id			: ko.observable(data._id || ""),
		name		: ko.observable(data.name || ""),
		timerLength	: ko.observable(data.timerLength || "")
	}

	self.hours = ko.computed({
		read: function () {
			var hours = Math.floor( self.data.timerLength() / 3600 );
			if (hours === 0) {
				hours = "";
			}
			
			return hours;
		},
		write: function (value) {
			// calculate our total length with the new hours
			self.data.timerLength(self.reverserCalculateTime(parseInt(value), self.minutes(), self.seconds()));
		},
		owner: self
	});

	self.minutes = ko.computed({
		read: function () {
			var minutes = Math.floor( (self.data.timerLength() / 60) % 60 );
			if (minutes === 0) {
				minutes = "";
			}
			
			return minutes;
		},
		write: function (value) {
			// calculate our total length with the new minutes
			self.data.timerLength(self.reverserCalculateTime(self.hours(), parseInt(value), self.seconds()));
		},
		owner: self
	});

	self.seconds = ko.computed({
		read: function () {
			var seconds = Math.floor( self.data.timerLength() % 60 );
			if (seconds === 0) {
				seconds = "";
			}
			
			return seconds;
		},
		write: function (value) {
			self.data.timerLength(self.reverserCalculateTime(self.hours(), self.minutes(), parseInt(value)));
		},
		owner: self
	});

	self.reverserCalculateTime = function(hours, minutes, seconds) {

		// we need to make sure that if we receive undefined that we set that var to 0
		if (typeof hours == "undefined") {
			hours = 0;
		}
		if (typeof minutes == "undefined") {
			minutes = 0;
		}
		if (typeof seconds == "undefined") {
			seconds = 0;
		}

		// calculate the total length of the timer from the hours, minutes, and seconds provided
		var length = ( hours * 3600 ) + ( minutes * 60 ) + seconds;

		return parseInt(length);

	};

	self.incrementTime = function(valueToIncrement, direction, data, event) {
		
		// let increment the time according to what was passed
		var timeOptions = {
				'hours': self.hours,
				'minutes': self.minutes,
				'seconds': self.seconds
			},
			currentValue;

		// get the current value
		currentValue = timeOptions[valueToIncrement]();

		// determine if we need to add/subtract
		if (direction == "up") {
		
			timeOptions[valueToIncrement](currentValue+1);

		} else if (direction == "down") {

			timeOptions[valueToIncrement](currentValue-1);

		}

	};

};

/* ----------------------------------------------------------------------
|	-- TimerListViewModel --
------------------------------------------------------------------------- */
app.modules.ko.TimerListViewModel = function() {

	"use strict";

	var self = this;

	/* Data
	------------------------------------------------------------------------- */	

	// urls used by socket.io
	self.sockets = app.modules.ko.sockets;

	// cache dom elements
	self.elements = {
		timer: {
			$timerEditControls: $('.timer-edit-controls'),
			$timerControls: $('.timer-controls'),
			$timerStart: $('.timer-start'),
			$timerPause: $('.timer-pause'),
			$timerReset: $('.timer-reset'),
			$timerZone: $('.timer-zone')
		}
	};

	// store the state of the application
	self.state = {
		editingCurrentTimer	: ko.observable(false)
	};

	// data store
	self.data = {
		currentTimer	: ko.observable(new app.modules.ko.Timer()),
		timers			: ko.observableArray([]),
		// staged timer represents the timer currently being edited, regardless of new/old
		stagedTimer		: ko.observable(""),
		editor 			: ko.observable("")
	};

	/* Computed data
	------------------------------------------------------------------------- */	
	// dynamically create the editor title based on editing
	self.state.editorTitle = ko.computed(function() {
		if (self.state.editingCurrentTimer()) {
			return "Edit timer";
		} else {
			return "New timer";
		}
	});

	// dynamically create the save button for the editor
	self.state.editorSaveButton = ko.computed(function() {
		if (self.state.editingCurrentTimer()) {
			return "Save changes";
		} else {
			return "Create";
		}
	});

	/* Functional methods
	------------------------------------------------------------------------- */

	// will set up all of our server listeners
	self.setupSocketListeners = function() {

		// listen for timer:get:list
		app.modules.socket.on(self.sockets.getTimers, self.setTimers);

		// listen for timer:set:current_timer
		app.modules.socket.on(self.sockets.setCurrentTimer, function(response) {

			console.log('heard', response);

			self.data.currentTimer( new app.modules.ko.Timer(response) );

		});

		// listen for timer:start
		app.modules.socket.on(self.sockets.startTimer, function() {
			self.data.currentTimer().startTimer();
		})

		// listen for timer:pause
		app.modules.socket.on(self.sockets.pauseTimer, function() {
			self.data.currentTimer().pauseTimer();
		})

		// listen for timer:reset
		app.modules.socket.on(self.sockets.resetTimer, function() {
			self.data.currentTimer().resetTimer();
		})

	};

	self.createNewTimer = function() {

		self.data.editor(new app.modules.ko.Editor());

		// empty out the current timer observable
		self.data.stagedTimer({});

	};

	self.editTimer = function() {

		// pause the current timer if it is started
		if (self.data.currentTimer().data.state() == "started") {
			self.data.currentTimer().pauseTimer();
		}

		// stage the current timer for editing
		// self.data.stagedTimer(self.data.currentTimer());
		self.data.editor(new app.modules.ko.Editor(ko.toJS(self.data.currentTimer().data)));

		self.state.editingCurrentTimer(true);

	}

	self.saveTimer = function() {

		var editorData = ko.toJS(self.data.editor().data);

		// save the timer to the server with the processed data
		app.modules.socket.emit(self.sockets.saveTimer, editorData, function(response) {

			// we got a good response, close, modal and reload timers
			if (!response.error) {

				$('#timer-editor').modal('hide');

				self.getTimers();

				self.setCurrentTimer(response.data);
				
			} else {
				console.log(response.error);
			}

		});

	};

	self.removeTimer = function(timerToRemove) {

		// notify the server to remove this timer
		app.modules.socket.emit(self.sockets.removeTimer, timerToRemove.data._id(), function(response) {

			// if there is no error set the timer list
			if (response.error == null) {

				// set our timer list with the new data
				self.setTimers(response);

			} else {

				console.log('no error!');

			}

		});

	};

	self.fullscreenMode = function() {

		// set fullscreen class on timer zone
		self.elements.timer.$timerZone.toggleClass('fullscreen');

	};


	/* Getters
	------------------------------------------------------------------------- */	
	self.getTimers = function() {

		// emit a message to timer:get:list
		app.modules.socket.emit(self.sockets.getTimers, self.setTimers);

	};


	/* Setters
	------------------------------------------------------------------------- */	
	self.setTimers = function(response) {

		// assign this mapping to our timers observable
		self.data.timers(response.data);

	};

	self.setCurrentTimer = function(timer) {

		app.modules.socket.emit(self.sockets.setCurrentTimer, timer, function(response) {

			console.log(response);

			self.data.currentTimer( new app.modules.ko.Timer(response) );

		});

	};


	/* Subscriptions
	------------------------------------------------------------------------- */	


	/* Init controller
	------------------------------------------------------------------------- */	
	self.init = function() {

		// set up our socket listeners
		self.setupSocketListeners();

		// get the list of timers
		self.getTimers();

	};

};

/* Apply bindings when window loads
------------------------------------------------------------------------- */
$(window).on("load", function() {

	"use strict";

	// set up socket io
	app.modules.socket = io.connect();

	// let the server know this client is ready
	app.modules.socket.emit('ready');

	// create a new TimerListViewModel
	app.viewModel = new app.modules.ko.TimerListViewModel();

	// apply ko bindings to our view model
	ko.applyBindings(app.viewModel);

	// initialize our view model
	app.viewModel.init();

	// let the app know ko has binded
	$(window).trigger("ko.binded");

});