function arrayFirstIndexOf(array, predicate, predicateOwner) {
    for (var i = 0, j = array.length; i < j; i++) {
        if (predicate.call(predicateOwner, array[i])) {
            return i;
        }
    }
    return -1;
}

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
	self.soundModule = document.getElementById('audio-handle');
	self.counter = null;
	self.timerSubscription = null;

	self.computedData.hours = ko.computed(function() {
		var hours = Math.floor( (self.data.timerLength() - self.data.timeElapsed()) / 3600 );
		return hours;
	});

	self.computedData.minutes = ko.computed(function() {
		var minutes = Math.floor( ((self.data.timerLength() - self.data.timeElapsed()) / 60) % 60 );
		if (minutes < 10 && self.computedData.hours() > 0) {
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
				differenceInSeconds = self.getDifferenceInSeconds(timeStarted, currentTime);

			self.data.timeElapsed( self.data.timeElapsed() + differenceInSeconds );

			if (self.data.timeElapsed() >= self.data.timerLength()) {

				self.resetTimer();

			} else {

				self.startTimer();

			}

		}

	};

	self.getDifferenceInSeconds = function(timeStarted, currentTime) {

		var differenceInSeconds = Math.floor((currentTime - timeStarted) / 1000);

		return differenceInSeconds;

	};

	self.timerCountdown = function() {

		var timeStarted = new Date(self.data.timeStarted()).getTime(),
			currentTime = new Date().getTime(),
			differenceInSeconds = self.getDifferenceInSeconds(timeStarted, currentTime);

		// we need to know how much time has already elapsed when we started this timer
		self.data.timeElapsed( self.data.timeElapsedAtStart + differenceInSeconds );

	};

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

		self.soundModule.load();

		self.timerSubscription = self.data.timeElapsed.subscribe(function() {
			if (self.data.timeElapsed() > self.data.timerLength()) {

				self.soundModule.play();

				self.trigger.resetTimer();

			}
		});

		clearInterval(self.counter);

		self.data.timeStarted(new Date());

		self.data.state("started");

		// record how much time had already elapsed when we started the timer
		self.data.timeElapsedAtStart = self.data.timeElapsed();

		// 1000 will  run it every 1 second
		self.counter = setInterval(self.timerCountdown, 1000);

	};

	self.pauseTimer = function() {

		self.data.timeStarted("");

		self.data.state("paused");

		clearInterval(self.counter);

		self.timerSubscription.dispose();

	};

	self.resetTimer = function() {

		self.data.timeElapsed(0);

		self.data.timeStarted("");

		clearInterval(self.counter);

		self.data.state("stopped");

		self.timerSubscription.dispose();

	};

	self.getServerReadyData = function() {

		return ko.toJS(self.data);

	};

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
			keyCode = event.keyCode,
			currentValue;

		// get the current value
		currentValue = timeOptions[valueToIncrement]();

		// determine if we need to add/subtract
		if (direction == "up" || keyCode == 38) {
		
			timeOptions[valueToIncrement](currentValue+1);

		} else if (direction == "down" || keyCode == 40) {

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
		editing				: ko.observable(false),
		mainMenuOpen		: ko.observable(false)
	};

	// data store
	self.data = {
		currentTimer	: ko.observable(),
		timers			: ko.observableArray([]),
		editor 			: ko.observable("")
	};

	/* Computed data
	------------------------------------------------------------------------- */

	/* Functional methods
	------------------------------------------------------------------------- */

	// will set up all of our server listeners
	self.setupSocketListeners = function() {

		// listen for timer:get:list
		app.modules.socket.on(self.sockets.getTimers, self.setTimers);

		// listen for timer:set:current_timer
		app.modules.socket.on(self.sockets.setCurrentTimer, function(response) {

			self.setTimers(response);

			self.data.currentTimer(response.currentTimerIndex);

		});

		// listen for timer:start
		app.modules.socket.on(self.sockets.startTimer, function() {
			self.data.timers()[self.data.currentTimer()].startTimer();
		})

		// listen for timer:pause
		app.modules.socket.on(self.sockets.pauseTimer, function() {
			self.data.timers()[self.data.currentTimer()].pauseTimer();
		})

		// listen for timer:reset
		app.modules.socket.on(self.sockets.resetTimer, function() {
			self.data.timers()[self.data.currentTimer()].resetTimer();
		})

	};

	self.createNewTimer = function() {

		self.state.editing(true);

		self.data.editor(new app.modules.ko.Editor());

		self.state.mainMenuOpen(false);

		$('.timer-form-name').focus();

	};

	self.editTimer = function() {

		self.state.editing(true);

		// pause the current timer if it is started
		if (self.data.timers()[self.data.currentTimer()].data.state() == "started") {
			self.data.timers()[self.data.currentTimer()].pauseTimer();
		}

		// stage the current timer for editing
		self.data.editor(new app.modules.ko.Editor(ko.toJS(self.data.timers()[self.data.currentTimer()].data)));

	}

	self.saveTimer = function() {

		var editorData = ko.toJS(self.data.editor().data);

		// save the timer to the server with the processed data
		app.modules.socket.emit(self.sockets.saveTimer, editorData, function(response) {

			// we got a good response, close, modal and reload timers
			if (!response.error) {

				self.state.editing(false);

				self.getTimers(response);
				
			} else {
				console.log(response.error);
			}

		});

	};

	self.cancelEdit = function() {

		self.state.editing(false);

		self.data.editor({});

	};

	self.removeTimer = function(timerToRemove) {

		if (confirm('Are you sure you want to remove this timer?')) {

			// notify the server to remove this timer
			app.modules.socket.emit(self.sockets.removeTimer, self.data.timers()[self.data.currentTimer()].data._id(), function(response) {

				// if there is no error set the timer list
				if (response.error) {

					console.log('error');

				} else {

					// set our timer list with the new data
					self.setTimers(response);

					self.setCurrentTimer(0);

				}

			});

		}

	};

	self.fullscreenMode = function() {

		// set fullscreen class on timer zone
		self.elements.timer.$timerZone.toggleClass('fullscreen');

		return true;

	};

	self.toggleMainMenu = function() {

		self.state.mainMenuOpen( !self.state.mainMenuOpen() );

	}


	/* Getters
	------------------------------------------------------------------------- */	
	self.getTimers = function(timerToSetWhenDone) {

		// emit a message to timer:get:list
		app.modules.socket.emit(self.sockets.getTimers, function(response) {

			self.setTimers(response);

			if (timerToSetWhenDone) {

				var index = arrayFirstIndexOf(self.data.timers(), function(item) {
					return item.data._id() === timerToSetWhenDone.data._id;
				});

				self.data.currentTimer(index);

			}

		});

	};


	/* Setters
	------------------------------------------------------------------------- */	
	self.setTimers = function(response) {

		var mappedTimers = $.map(response.data, function(timer) {

			var initialData = {
				data: timer,
				currentDateTime: response.currentDateTime
			}

			return new app.modules.ko.Timer(initialData);

		});

		// assign this mapping to our timers observable
		self.data.timers(mappedTimers);

	};

	self.setCurrentTimer = function(index) {

		app.modules.socket.emit(self.sockets.setCurrentTimer, index, function(response) {

			self.setTimers(response);

			self.state.mainMenuOpen(false);

			self.data.currentTimer(response.currentTimerIndex);

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

		// set the first time initially
		self.data.currentTimer(0);

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