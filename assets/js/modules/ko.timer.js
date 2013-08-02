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
app.modules.ko.Timer = function(data) {

	var self = this;

	if (typeof data == "undefined") {
		data = {};
	}

	self.sockets = app.modules.ko.sockets;

	self.data = {
		_id			: ko.observable(data._id),
		name		: ko.observable(data.name),
		timerLength	: ko.observable(data.timerLength),
		timeElapsed	: ko.observable(data.timeElapsed),
		state		: ko.observable(data.state)
	};

	self.computedData = {
		hours		: null,
		minutes		: null,
		seconds		: null
	};

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

	self.timerCountdown = function() {

		self.data.timeElapsed( self.data.timeElapsed() + 1 );

		if (self.data.timeElapsed() > self.data.timerLength())
		{
			self.resetTimer();
			//counter ended, do something here
			return;
		}

	}

	self.startTimer = function() {

		clearInterval(self.counter);

		// 1000 will  run it every 1 second
		self.counter = setInterval(self.timerCountdown, 1000);

		self.data.state("started");

		// prepare our data to send to the server
		var data = self.getServerReadyData();
			
		// notify server of start
		app.modules.socket.emit(self.sockets.startTimer, data);

	};

	self.pauseTimer = function() {

		clearInterval(self.counter);

		self.data.state("paused");

		// prepare our data to send to the server
		var data = self.getServerReadyData();
			
		// notify server of pause
		app.modules.socket.emit(self.sockets.pauseTimer, data);

	};

	self.resetTimer = function() {

		clearInterval(self.counter);

		self.data.timeElapsed(0);

		self.data.state("stopped");

		// prepare our data to send to the server
		var data = self.getServerReadyData();
			
		// notify server of reset
		app.modules.socket.emit(self.sockets.resetTimer, data);

	};

	self.muteTimer = function() {

		
	};

	self.getServerReadyData = function() {

		return ko.toJS(self.data);

	};

};

/* ----------------------------------------------------------------------
|	-- EditorViewModel --
------------------------------------------------------------------------- */
app.modules.ko.Editor = function(data) {

	var self = this;

	if (typeof data == "undefined") {
		data = {}
	}

	self._id = ko.observable(data._id || "");
	self.name = ko.observable(data.name || "");
	self.timerLength = ko.observable(data.timerLength || "");

	self.hours = ko.computed({
		read: function () {
			var hours = Math.floor( self.timerLength() / 3600 );
			if (hours === 0) {
				hours = "";
			}
			
			return hours;
		},
		write: function (value) {
			// calculate our total length with the new hours
			self.timerLength(self.reverserCalculateTime(parseInt(value), self.minutes(), self.seconds()));
		},
		owner: self
	});

	self.minutes = ko.computed({
		read: function () {
			var minutes = Math.floor( (self.timerLength() / 60) % 60 );
			if (minutes === 0) {
				minutes = "";
			}
			
			return minutes;
		},
		write: function (value) {
			// calculate our total length with the new minutes
			self.timerLength(self.reverserCalculateTime(self.hours(), parseInt(value), self.seconds()));
		},
		owner: self
	});

	self.seconds = ko.computed({
		read: function () {
			var seconds = Math.floor( self.timerLength() % 60 );
			if (seconds === 0) {
				seconds = "";
			}
			
			return seconds;
		},
		write: function (value) {
			self.timerLength(self.reverserCalculateTime(self.hours(), self.minutes(), parseInt(value)));
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
			$timerReset: $('.timer-reset')
		}
	};

	// store the state of the application
	self.state = {
		timerZoneVisible	: ko.observable(false),
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
		self.socket.on(self.sockets.getTimers, self.setTimers);

		// listen for timer:set:current_timer
		self.socket.on(self.sockets.setCurrentTimer, function(data) {

			self.data.currentTimer( new app.modules.ko.Timer(data) );

		});

		// listen for timer:start

		// listen for timer:pause

		// listen for timer:reset

	};

	self.setCurrentTimer = function(timer) {

		timer = ko.toJS(timer.data);

		app.modules.socket.emit(self.sockets.setCurrentTimer, timer, function(response) {

			self.data.currentTimer( new app.modules.ko.Timer(response.data) );

			self.state.timerZoneVisible(true);

		});

	}

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

		var editorData = ko.toJS(self.data.editor);
			
		// remove the hours, minutes and seconds from data
		delete editorData.hours;
		delete editorData.minutes;
		delete editorData.seconds;

		// save the timer to the server with the processed data
		app.modules.socket.emit(self.sockets.saveTimer, editorData, function(data) {

			// we got a good response, close, modal and reload timers
			if (data.timer) {

				$('#timer-editor').modal('hide');

				//self.getTimers();

				self.setCurrentTimer(data.timer);
				
			} else {
				console.log(data.err);
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


	/* Getters
	------------------------------------------------------------------------- */	
	self.getTimers = function() {

		// emit a message to timer:get:list
		app.modules.socket.emit(self.sockets.getTimers, self.setTimers);

	};


	/* Setters
	------------------------------------------------------------------------- */	
	self.setTimers = function(response) {

		var mappedTimers = $.map(response.data, function(timer) { return new app.modules.ko.Timer(timer) });
		
		// assign this mapping to our timers observable
		self.data.timers(mappedTimers);

	};


	/* Subscriptions
	------------------------------------------------------------------------- */	
	// self.data.currentTimer.subscribe(function(currentTimer) {

	// 	app.modules.socket.emit(self.sockets.setCurrentTimer, ko.toJS(currentTimer.data), function(data) {
	// 		console.log(data);
	// 	});

	// 	self.state.timerZoneVisible(true);

	// });

	/* Init controller
	------------------------------------------------------------------------- */	
	self.init = function() {

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