// the timer object that will be used as our view model
app.modules.ko.Timer = function() {

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
		resetTimer			: 'reset:timer'
	};

	// cache dom elements
	self.elements = {

	};

	// store the state of the application
	self.state = {
		currentTimer		: ko.observable(""),
		timerZoneVisible	: ko.observable(false)
	};

	// data store
	self.data = {
		timers	: ko.observableArray()
	};


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

	// will set the current timer
	self.setCurrentTimer = function(timer) {

		// set our current timer
		self.state.currentTimer(timer);

		self.socket.emit(self.sockets.setCurrentTimer, timer);

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

		// store the timer data
		self.data.timers(response.data);

	};


	/* Subscriptions
	------------------------------------------------------------------------- */	
	self.state.currentTimer.subscribe(function(newValue) {

		// emit a message that we have selected a new timer
		self.socket.emit(self.sockets.setCurrentTimer);

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

	// create a new Timer object
	app.viewModel = new app.modules.ko.Timer();

	// apply ko bindings to our view model
	ko.applyBindings(app.viewModel);

	// initialize our view model
	app.viewModel.init();

	// let the app know ko has binded
	$(window).trigger("ko.binded");

});