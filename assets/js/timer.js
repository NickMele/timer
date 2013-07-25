(function( $, window, document ) {

	'use strict';

	// master object
	var timer = window.timer = {};

	// setup our socket listeners that will route incoming socket requests
	timer.initializeSocketListeners = function() {

		var properties = timer.properties;

		// will listen for updated information about timer
		timer.socket.on(properties.urls.getTimerData, timer.setTimerZone);

		timer.socket.on(properties.urls.notifyStartTimer, timer.startTimer);
		timer.socket.on(properties.urls.notifyPauseTimer, timer.pauseTimer);
		timer.socket.on(properties.urls.notifyResetTimer, timer.resetTimer);

	};

	// this method will load the list of timers for this user
	timer.loadTimers = function() {

		var properties = timer.properties;

		// load the list of timers
		$(properties.cache.timerList).load(properties.urls.getTimers, function() {

			// set the active item in our timer list
			timer.setActiveItem();

			// once the timers are loaded bind the events
			timer.bindEvents();

		});

	};

	// bind events to the elements
	timer.bindEvents = function() {

		var properties = timer.properties;

		// bind click event to timer links
		$(properties.cache.timerListLink).off('click').on('click', function(e) {

			// prevent the default action of the link
			e.preventDefault();

			// get the currenttimer id from the link
			properties.currentTimer.id = $(this).data('timer-id');

			// notify others to load this timer
			// timer.socket.emit(properties.urls.notifyGetTimer, properties.currentTimer.id);

			// load this timer
			timer.getTimerData();
		});

		$(properties.cache.newTimerLink).off('click').on('click', function(e) {

			// prevent the default action of the link
			e.preventDefault();

			timer.newTimer();

		});

		// emit a message for other clients to start their timer
		$(properties.cache.timerStart).off('click').on('click', function(e) {
			// prevent the default action of the link
			e.preventDefault();

			timer.socket.emit(properties.urls.notifyStartTimer, properties.currentTimer.id, function(data) {
				timer.startTimer();
			});
		});

		// emit a message for other clients to pause their timer
		$(properties.cache.timerPause).off('click').on('click', function(e) {
			// prevent the default action of the link
			e.preventDefault();

			timer.socket.emit(properties.urls.notifyPauseTimer, properties.currentTimer.id, function(data) {
				timer.pauseTimer();
			});
		});

		// emit a message for other clients to reset their timer
		$(properties.cache.timerReset).off('click').on('click', function(e) {
			// prevent the default action of the link
			e.preventDefault();

			timer.socket.emit(properties.urls.notifyResetTimer, properties.currentTimer.id, function(data) {
				timer.resetTimer();
			});
		});

		$(document).off('keydown').on('keydown', function(event) {

			var escape = event.which == 27,
				enter = event.which == 13,
				element = event.target,
				isInput = element.nodeName != 'INPUT' && element.nodeName != 'TEXTAREA',
				data = {};

			if (isInput) {
				if (escape) {
					// restore state
					document.execCommand('undo');
					element.blur();

					timer.editMode();

				} else if (enter) {
					
					timer.saveTimer();

					element.blur();
					event.preventDefault();
				}
			}
		});

		$(properties.cache.timerEdit + ', ' + properties.cache.timerEditCancel).off('click').on('click', function(e) {

			// prevent the default action of the link
			e.preventDefault();

			// turn on/off edit mode
			timer.editMode();

		});

		$(properties.cache.timerEditSave).off('click').on('click', function(e) {

			// prevent the default action of the link
			e.preventDefault();

			// save the timer
			timer.saveTimer();

		});

	};

	timer.saveTimer = function() {

		// extract timer data from timer zone
		timer.getTimerDataFromZone();

		// save the timer data to the db
		timer.setTimerData();

		// reload timer list
		timer.loadTimers();

		timer.editMode();

	};

	timer.editMode = function() {

		var properties = timer.properties,
			isEditing = properties.currentTimer.isEditing;

		if (!isEditing) {
			
			properties.currentTimer.isEditing = true;

			// turn all editable elements on
			$('[data-editable="true"]').attr('contenteditable','true');

			// show the save/cancel buttons
			$(properties.cache.timerEditControls).fadeIn(100);

			$(properties.cache.timerEdit).addClass('active');

		} else {

			properties.currentTimer.isEditing = false;

			// turn all editable elements on
			$('[data-editable="true"]').attr('contenteditable','false');

			// show the save/cancel buttons
			$(properties.cache.timerEditControls).fadeOut(100);

			$(properties.cache.timerEdit).removeClass('active');
		}

	};

	timer.calculateTime = function(length) {

		var seconds = Math.floor( length % 60 ),
			minutes = Math.floor(( length / 60 ) % 60),
			hours = Math.floor( length / 3600 );

		if (seconds < 10) {
			seconds = '0' + seconds;
		}
		if (minutes < 10) {
			minutes = '0' + minutes;
		}
		if (hours < 10) {
			hours = '0' + hours;
		}

		return {
			hours: hours,
			minutes: minutes,
			seconds: seconds
		};

	};

	timer.reverserCalculateTime = function(hours, minutes, seconds) {

		var length = ( hours * 3600 ) + (minutes * 60 ) + seconds;

		return length;

	};

	// this method will load a specific timer from url
	timer.setTimerZone = function(data) {

		var properties = timer.properties,
			currentTimer = properties.currentTimer,
			cache = properties.cache,
			calculatedTime;

		timer.cacheTimerData(data);

		$(cache.timerName).html(currentTimer.currentTimerData.name);

		timer.setTimerZoneClock();

		timer.bindEvents();

		// set the active item in our timer list
		timer.setActiveItem();

	};

	timer.setActiveItem = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer,
			currentTimerId = currentTimer.currentTimerData._id;

		$(properties.cache.timerListLink).parent().removeClass('active');

		console.log($(properties.cache.timerList).find("[data-timer-id='" + currentTimerId + "']"));

		$(properties.cache.timerList).find("[data-timer-id='" + currentTimerId + "']").parent().addClass('active');

	};

	timer.getTimerDataFromZone = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer,
			cache = properties.cache,
			hours, minutes, seconds;

		// get the timer name
		currentTimer.currentTimerData.name = $(cache.timerName).text();

		// get hours, minutes, seconds
		hours = parseInt($(cache.timerDuration).find('.timer-clock-hours').text());
		minutes = parseInt($(cache.timerDuration).find('.timer-clock-minutes').text());
		seconds = parseInt($(cache.timerDuration).find('.timer-clock-seconds').text());

		// we need to calculate these times into seconds
		currentTimer.currentTimerData.length = timer.reverserCalculateTime(hours, minutes, seconds);

	};

	timer.setTimerZoneClock = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer,
			cache = properties.cache,
			calculatedTime;

		// calculate the time to get seconds, minutes, hours
		calculatedTime = timer.calculateTime(currentTimer.currentTimerData.length - currentTimer.currentTimerData.timeElapsed);

		$(cache.timerDuration).find('.timer-clock-hours').html(calculatedTime.hours);
		$(cache.timerDuration).find('.timer-clock-minutes').html(calculatedTime.minutes);
		$(cache.timerDuration).find('.timer-clock-seconds').html(calculatedTime.seconds);

	};

	timer.newTimer = function() {

		var properties = timer.properties;

		// clear out the current timer data
		properties.currentTimer = {
			id: null,
			currentTimerData: {
				userId: null,
				length: 0,
				name: null,
				timeElapsed: 0
			},
			counter: null
		};

		// update timer zone
		timer.setTimerZone(properties.currentTimer.currentTimerData);

		timer.editMode();

		$(properties.cache.timerName).focus();

	};

	timer.getTimerData = function() {

		var properties = timer.properties;

		// emit a message to get updated timer data
		timer.socket.emit(properties.urls.getTimerData, properties.currentTimer.id, function(data) {
			
			timer.setTimerZone(data.timer);

		});

	};

	timer.setTimerData = function() {

		var properties = timer.properties;

		// emit a message to save the data for this timer
		timer.socket.emit(properties.urls.setTimerData, properties.currentTimer, function(data) {
			
			// check for errors, if none update the timer
			if (data.timerData) {
				timer.setTimerZone(data.timerData);
			} else {
				console.log(data.err);
			}

		});

	};

	timer.cacheTimerData = function(data) {

		var properties = timer.properties,
			currentTimer = properties.currentTimer;

		currentTimer.id = data._id;
		currentTimer.currentTimerData = data;

	};

	timer.showStartButton = function() {

		var properties = timer.properties,
			cache = properties.cache;

		// show the start button
		$(cache.timerStart).removeClass('hidden');

		// hide the pause button
		$(cache.timerPause).addClass('hidden');

	};

	timer.showPauseButton = function() {

		var properties = timer.properties,
			cache = properties.cache;

		// hide the start button
		$(cache.timerStart).addClass('hidden');

		// show the pause button
		$(cache.timerPause).removeClass('hidden');

	};

	timer.startTimer = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer;

		console.log('start timer');

		timer.showPauseButton();

		clearInterval(properties.currentTimer.counter);
		currentTimer.counter = setInterval(timer.timerCountdown, 1000); //1000 will  run it every 1 second
	};

	timer.pauseTimer = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer;

		console.log('pause timer');

		clearInterval(currentTimer.counter);

		// save the timer state in the db
		timer.setTimerData();

		timer.showStartButton();

	};

	timer.resetTimer = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer;

		console.log('reset timer');

		clearInterval(currentTimer.counter);

		currentTimer.currentTimerData.timeElapsed = 0;

		// save the timer state in the db
		timer.setTimerData();

		timer.setTimerZoneClock();

		timer.showStartButton();
	};

	timer.timerCountdown = function() {

		var properties = timer.properties,
			currentTimer = properties.currentTimer;

		currentTimer.currentTimerData.timeElapsed++;

		if (currentTimer.currentTimerData.timeElapsed > currentTimer.currentTimerData.length)
		{
			timer.resetTimer();
			//counter ended, do something here
			return;
		}

		timer.setTimerZoneClock();

	};

	/* --------------------------------------------------------------------------
	|   -- Initializer --
	-------------------------------------------------------------------------- */
	$(window).on('load', function(){

		// properties
		timer.properties = {
			currentTimer: {
				id: null,
				currentTimerData: {
					_id: null,
					length: null,
					name: null,
					userId: null,
					timeElapsed: null
				},
				counter: null
			},
			cache: {
				timerZone: '.timer-zone',
				timerName: '.timer-zone .timer-name',
				timerDuration: '.timer-zone .timer-clock',
				timerList: '.timer-list',
				timerListLink: '.timer-link',
				newTimerLink: '.new-timer',
				timerStart: '.timer-start',
				timerPause: '.timer-pause',
				timerReset: '.timer-reset',
				timerEditControls: '.timer-edit-controls',
				timerEdit: '.timer-edit',
				timerDelete: '.timer-delete',
				timerEditCancel: '.timer-edit-cancel',
				timerEditSave: '.timer-edit-save'
			},
			urls: {
				getTimers: '/get/timers',
				getTimerData: '/get/timer/data',
				setTimerData: '/set/timer/data',
				notifyGetTimer: '/notify/get/timer',
				notifyStartTimer: '/notify/start/timer',
				notifyPauseTimer: '/notify/pause/timer',
				notifyResetTimer: '/notify/reset/timer'
			}
		};

		// set up the socket
		timer.socket = io.connect();

		// let the server know this client is ready
		timer.socket.emit('ready');

		// initialize socket listeners
		timer.initializeSocketListeners();

		// load the list of timers for this user
		timer.loadTimers();

	});


}( jQuery, window, document ));