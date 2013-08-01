// Timer
app.modules.ko.Timer = function(data) {

	var self = this;

	self._id = ko.observable(data._id);
	self.name = ko.observable(data.name);
	self.timerLength = ko.observable(data.timerLength);
	self.timeElapsed = ko.observable(data.timeElapsed);
	self.state = ko.observable(data.state);

	self.hours = ko.computed(function() {
		var hours = Math.floor( (self.timerLength() - self.timeElapsed()) / 3600 );
		if (hours < 10) {
			hours = "0" + hours;
		}
		return hours;
	});

	self.minutes = ko.computed(function() {
		var minutes = Math.floor( ((self.timerLength() - self.timeElapsed()) / 60) % 60 );
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		return minutes;
	});

	self.seconds = ko.computed(function() {
		var seconds =  Math.floor( (self.timerLength() - self.timeElapsed()) % 60 );
		if (seconds < 10) {
			seconds = "0" + seconds;
		}
		return seconds;
	});	

};

app.modules.ko.Editor = function(data) {

	var self = this;

	if (typeof data == "undefined") {
		data = {}
	}

	self._id = ko.observable(data._id || "");
	self.name = ko.observable(data.name || "");
	self.timerLength = ko.observable(data.timerLength || "");

	self.hours = ko.computed(function() {
		var hours = Math.floor( self.timerLength() / 3600 );
		if (hours < 10 && hours !== 0) {
			hours = "0" + hours;
		} else if (hours === 0) {
			hours = "";
		}
		return hours;
	});

	self.minutes = ko.computed(function() {
		var minutes = Math.floor( (self.timerLength() / 60) % 60 );
		if (minutes < 10 && minutes !== 0) {
			minutes = "0" + minutes;
		} else if (minutes == 0) {
			minutes = "";
		}
		return minutes;
	});

	self.seconds = ko.computed(function() {
		var seconds =  Math.floor( self.timerLength() % 60 );
		if (seconds < 10 && seconds !== 0) {
			seconds = "0" + seconds;
		} else if (seconds == 0) {
			seconds = "";
		}
		return seconds;
	});	

};

// TimerListViewModel
app.modules.ko.TimerListViewModel = function() {

	"use strict";

	var self = this;

	/* ----------------------------------------------------------------------
	|	-- Parameters, options, data, etc --
	------------------------------------------------------------------------- */

	// urls used by socket.io
	self.sockets = {
		getTimers			: 'get:timers',
		setCurrentTimer		: 'set:current_timer',
		startTimer			: 'start:timer',
		pauseTimer			: 'pause:timer',
		resetTimer			: 'reset:timer',
		saveTimer			: 'save:timer'
	};

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
		currentTimer	: ko.observable(""),
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

		// listen for get:timers
		self.socket.on(self.sockets.getTimers, self.setTimers);

		// listen for set:current_timer
		self.socket.on(self.sockets.setCurrentTimer, self.setCurrentTimer);

		// listen for start:timer

		// listen for pause:timer

		// listen for reset:timer


	};

	self.createNewTimer = function() {

		self.data.editor(new app.modules.ko.Editor());

		// empty out the current timer observable
		self.data.stagedTimer({});

	};

	self.editTimer = function() {

		// stage the current timer for editing
		// self.data.stagedTimer(self.data.currentTimer());
		self.data.editor(new app.modules.ko.Editor(ko.toJS(self.data.currentTimer)));

		self.state.editingCurrentTimer(true);

	}

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
		var length = ( parseInt(hours) * 3600 ) + ( parseInt(minutes) * 60 ) + parseInt(seconds);

		return length;

	};

	self.saveTimer = function() {

		var editorData = ko.toJS({ timer: self.data.stagedTimer }),
			processedData = {};

		processedData = {
			name: editorData.timer.name,
			timerLength: self.reverserCalculateTime(editorData.timer.hours, editorData.timer.minutes, editorData.timer.seconds)
		}

		// save the timer to the server with the processed data
		self.socket.emit(self.sockets.saveTimer, processedData, function(data) {

			// we got a good response, close, modal and reload timers
			if (data.timer) {

				$('#timer-editor').modal('hide');

				self.getTimers();

				self.setCurrentTimer(data.timer);
				
			} else {
				console.log(data.err);
			}

		});

	};


	/* Setters
	------------------------------------------------------------------------- */	
	self.getTimers = function() {

		// emit a message to get:timers
		self.socket.emit(self.sockets.getTimers, self.setTimers);

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
	self.data.currentTimer.subscribe(function(newValue) {

		self.socket.emit(self.sockets.setCurrentTimer, self.data.currentTimer);

		self.state.timerZoneVisible(true);

	});

	/* Init controller
	------------------------------------------------------------------------- */	
	self.init = function() {

		// set up the socket
		self.socket = io.connect();

		// let the server know this client is ready
		self.socket.emit('ready');

		// get the list of timers
		self.getTimers();

	};

};

/* Apply bindings when window loads
------------------------------------------------------------------------- */
$(window).on("load", function() {

	"use strict";

	// create a new TimerListViewModel
	app.viewModel = new app.modules.ko.TimerListViewModel();

	// apply ko bindings to our view model
	ko.applyBindings(app.viewModel);

	// initialize our view model
	app.viewModel.init();

	// let the app know ko has binded
	$(window).trigger("ko.binded");

});