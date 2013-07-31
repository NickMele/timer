// Timer
app.modules.ko.Timer = function(data) {

	if (typeof data == "undefined") {
		data = {};
	}

	this._id = ko.observable(data._id);
	this.name = ko.observable(data.name);
	this.length = ko.observable(data.length);
	this.state = ko.observable(data.state);

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
		resetTimer			: 'reset:timer'
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
		currentTimer		: ko.observable(""),
		timerZoneVisible	: ko.observable(false),
		editingCurrentTimer	: ko.observable(false)
	};

	// data store
	self.data = {
		timers	: ko.observableArray([])
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

		self.state.timerZoneVisible(true);

	};

	self.createNewTimer = function() {

		// empty out the current timer observable
		self.state.currentTimer(new app.modules.ko.Timer());

		// tell the ui we are editing our timer
		self.state.editingCurrentTimer(true);

		// make sure the timer zone is visible
		self.state.timerZoneVisible(true);

	};

	self.toggleEditMode = function() {
		self.state.editingCurrentTimer(!self.state.editingCurrentTimer());
	}

	self.cancelEdit = function() {

		// undo any edits that were made
		document.execCommand('undo', false, null);

		self.toggleEditMode();

	};

	self.saveTimer = function() {

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

		// map our timers
		var mappedTimers = $.map(response.data, function(timer) {
			return new app.modules.ko.Timer(timer);
		});
        
		// assign this mapping to our timers observable
        self.data.timers(mappedTimers);

	};


	/* Subscriptions
	------------------------------------------------------------------------- */	


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