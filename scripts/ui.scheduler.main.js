(function () {
    $.widget('custom.scheduler', {
        options: {
            read: '',
            create: '',
            update: '',
            remove: '',
            readParams: {},
            allowReadSlots: true
        },

        _create: function () {
            this._super();
            this.init(this.options)
        },

        initOptions: function () {
            var self = this;

            return {
                onTimeSlotBusy: function (evt) {
                    messageBox.showQuestion({
                        title: "CAUTION",
                        question: 'You are not allowed to add/edit time slot which overlaps with another one.',
                        buttons: [
                            {
                                buttonText: "OK",
                                isPrimary: true,
                                onClick: function () {
                                    // TODO: do something, for example, reload page
                                }
                            }
                        ]
                    });
                },
                onTimeSlotChange: function (evt, eventId) {
                    var to,
                        that,
                        event,
                        from,
                        windowParams,
                        weekDays,
                        endDataObj,
                        oldSlotInfo,
                        startDataObj;


                    that = $(this).scheduleEvents('instance');
                    event = that._getEventById(eventId.id);
                    from = event.from;
                    to = event.to;
                    startDataObj = {};
                    endDataObj = {};
                    weekDays = that.options.fullWeekDays;
                    oldSlotInfo = that.getTimeSlotInfo(event);

                    startDataObj.days = endDataObj.days = weekDays;
                    startDataObj.defaultDay = weekDays[from.day];
                    endDataObj.defaultDay = weekDays[to.day];

                    startDataObj.defaultTime = that.getFormattedString(from).replace(/\s:\s/g, ':');
                    endDataObj.defaultTime = that.getFormattedString(to).replace(/\s:\s/g, ':');

                    windowParams = {
                        width: '380px',
                        title: "EDIT TIME SLOT",
                        buttons: [
                            {
                                buttonText: 'Cancel',
                            } ,
                            {
                                buttonText : 'Save',
                                isPrimary: true,
                                onClick: function () {
                                    var payload,
                                        updatedEvent,
                                        updatedSlotInfo,
                                        choosedStartTime = new Date(kendoWindow.startDayTimePicker.value()),
                                        choosedEndTime = new Date(kendoWindow.endDayTimePicker.value()),
                                        choosedStartDay = weekDays.indexOf(kendoWindow.startDayDropdown.value()),
                                        choosedEndDay = weekDays.indexOf(kendoWindow.endDayDropdown.value());

                                    self.toggleSpinner(true);

                                    updatedEvent = {
                                        from: {
                                            hour: choosedStartTime.getHours(),
                                            minutes: choosedStartTime.getMinutes(),
                                            day: choosedStartDay
                                        },
                                        to: {
                                            hour: choosedEndTime.getHours(),
                                            minutes: choosedEndTime.getMinutes(),
                                            day: choosedEndDay
                                        },
                                        id: eventId.id

                                    };

                                    updatedEvent.from = that.Date(updatedEvent.from);
                                    updatedEvent.to = that.Date(updatedEvent.to);

                                    updatedSlotInfo = that.getTimeSlotInfo(updatedEvent);

                                    payload = $.extend(
                                        true,
                                        {},
                                        locationSchedulesModule.getActiveScheduleId(),
                                        { OldTimes: oldSlotInfo },
                                        updatedSlotInfo
                                    );

                                    if (that.allowAddEvent(updatedEvent) && that.slotHasChanged(oldSlotInfo, updatedSlotInfo)) {
                                        self._sendHttp({
                                            data: JSON.stringify(payload),
                                            url: self.options.update
                                        });
                                    } else {
                                        that._trigger('onTimeSlotBusy', evt, {});
                                        self.toggleSpinner(false);
                                    }
                                },

                            },
                        ],
                        startDayParams: startDataObj,
                        endDayParams: endDataObj
                    }

                    var kendoWindow = messageBox.showSchedulerPopup(windowParams);
                },
                onTimeSlotMoved: function (evt, changesObj) {
                    var that,
                        event,
                        oldTime,
                        eventId,
                        payload,
                        currentTime;

                    that = $(this).scheduleEvents('instance');
                    oldTime = changesObj.oldTime;
                    currentTime = changesObj.currentTime;
                    event = changesObj.event;

                    payload = $.extend(
                        true,
                        {},
                        locationSchedulesModule.getActiveScheduleId(),
                        currentTime,
                        { OldTimes: oldTime }
                    );

                    if (that.slotHasChanged(oldTime, currentTime)) {
                        self.toggleSpinner(true);

                        self._sendHttp({
                            data: JSON.stringify(payload),
                            url: self.options.update
                        });
                    }

                },
                onTimeSlotAdd: function (evt) {
                    var that,
                        startTime,
                        endTime,
                        weekDays,
                        windowParams,
                        endDataObj = {},
                        startDataObj = {},
                        mousePosition;

                    that = $(this).scheduleEvents('instance');
                    that.updateCoordinates();
                    mousePosition = that.getMousePosition(evt);
                    weekDays = that.options.fullWeekDays;
                    startTime = that._getTimeByPosition(mousePosition);
                    endTime = that._getEndTimeByPosition(mousePosition);

                    startDataObj.days = endDataObj.days = weekDays;
                    startDataObj.defaultDay = endDataObj.defaultDay = weekDays[startTime.day];

                    startDataObj.defaultTime = that.getFormattedString(startTime).replace(/\s:\s/g, ':');
                    endDataObj.defaultTime = that.getFormattedString(endTime).replace(/\s:\s/g, ':');

                    windowParams = {
                        width: '380px',
                        title: "ADD NEW TIME SLOT",
                        buttons: [
                            {
                                buttonText: 'Cancel',
                            } ,
                            {
                                buttonText : 'Save',
                                isPrimary: true,
                                onClick: function () {
                                    var payload,
                                        createdEvent,
                                        createdSlotInfo,
                                        choosedStartTime = new Date(kendoWindow.startDayTimePicker.value()),
                                        choosedEndTime = new Date(kendoWindow.endDayTimePicker.value()),
                                        choosedStartDay = weekDays.indexOf(kendoWindow.startDayDropdown.value()),
                                        choosedEndDay = weekDays.indexOf(kendoWindow.endDayDropdown.value());

                                    self.toggleSpinner(true);

                                    createdEvent = {
                                        from: {
                                            hour: choosedStartTime.getHours(),
                                            minutes: choosedStartTime.getMinutes(),
                                            day: choosedStartDay
                                        },
                                        to: {
                                            hour: choosedEndTime.getHours(),
                                            minutes: choosedEndTime.getMinutes(),
                                            day: choosedEndDay
                                        }
                                    };

                                    createdEvent.from = that.Date(createdEvent.from);
                                    createdEvent.to = that.Date(createdEvent.to);

                                    createdSlotInfo = that.getTimeSlotInfo(createdEvent);

                                    payload = $.extend(
                                        true,
                                        {},
                                        locationSchedulesModule.getActiveScheduleId(),
                                        createdSlotInfo
                                    );

                                    if (that.allowAddEvent(createdEvent)) {
                                        self._sendHttp({
                                            data: JSON.stringify(payload),
                                            url: self.options.create
                                        });
                                    } else {
                                        that._trigger('onTimeSlotBusy', evt, {});
                                        self.toggleSpinner(false);
                                    }
                                },

                            },
                        ],
                        startDayParams: startDataObj,
                        endDayParams: endDataObj
                    }

                    var kendoWindow = messageBox.showSchedulerPopup(windowParams);
                },
                onTimeSlotRemove: function (evt, idObj) {
                    messageBox.showQuestion({
                        title: "DELETE TIME SLOT",
                        question: "You are about to delete the time slot from <b>" + name
                            + "</b> schedule. Are you sure, you want to proceed?",
                        buttons: [
                            {
                                buttonText: "Cancel"
                            },
                            {
                                buttonText: "Delete",
                                loadingText: "Deleting...",
                                isDanger: true,
                                onClick: function () {
                                    var that,
                                        event,
                                        payload,
                                        slotInfo;

                                    self.toggleSpinner(true);
                                    that = $(self.element).scheduleEvents('instance');
                                    event = that._getEventById(idObj.id);
                                    slotInfo = that.getTimeSlotInfo(event);

                                    payload = $.extend(
                                        true,
                                        {},
                                        locationSchedulesModule.getActiveScheduleId(),
                                        slotInfo
                                    );

                                    self._sendHttp({
                                        data: JSON.stringify(payload),
                                        url: self.options.remove
                                    });
                                }
                            }
                        ]
                    });

                }
            }
        },

        toggleSpinner: function (toggle) {
            toggle ? globalModule.startWaitAnimation(this.element) :
                globalModule.stopWaitAnimation(this.element);

            return this;
        },

        allowRead: function () {
            return this.options.allowReadSlots;
        },

        setInProcess: function () {
            this.options.allowReadSlots = false;

            return this;
        },

        setOutOfProcess: function () {
            this.options.allowReadSlots = true;

            return this;
        },

        readSlots: function (params) {
            var self,
                readParams,
                schedulerInst;

            self = this;
            readParams = $.extend(
                true,
                {},
                locationSchedulesModule.getActiveScheduleId(),
                params
            );

            schedulerInst = $(this.element).scheduleEvents('instance');

            if (this.allowRead()) {

                this.toggleSpinner(true)
                    .setInProcess();


                return $.ajax({
                    type: "POST",
                    contentType: "application/json",
                    url: self.options.read,
                    data: JSON.stringify(readParams)
                }).done(function (slots) {

                    slots.forEach(function (timeSlot) {
                        var endHour,
                            endTime,
                            startTime,
                            startHour,
                            endMinutes,
                            startMinutes;

                        startHour = timeSlot.Open.Time / 100;
                        endHour = timeSlot.Close.Time / 100;

                        startTime = {
                            hour: Math.floor(startHour),
                            minutes: ((startHour - Math.floor(startHour)) * 100).toFixed(0)
                        };
                        endTime = {
                            hour: Math.floor(endHour),
                            minutes: ((endHour - Math.floor(endHour)) * 100).toFixed(0)
                        };

                        schedulerInst.addEvent({
                            from: {
                                hour: startTime.hour,
                                minutes: startTime.minutes,
                                day: timeSlot.Open.DayOfWeek
                            },
                            to: {
                                hour: endTime.hour,
                                minutes: endTime.minutes,
                                day: timeSlot.Close.DayOfWeek
                            }
                        });

                    });

                    self._trigger('schedulerDataBound');
                    self.setOutOfProcess();

                }).always(function () {
                    self.toggleSpinner(false);
                });

            } else {
                return $.Deferred().reject();
            }
        },

        cleanSlots: function () {
            var schedulerInst = this.options.schedulerInstance;

            if (this.allowRead()) {
                schedulerInst.cleanSlots();
            }
        },

        _sendHttp: function (params) {
            var self = this;

            params = $.extend(
                true,
                {},
                {
                    type: 'POST',
                    url: '',
                    contentType: "application/json",
                    data: {}
                },
                params
            );

            return $.ajax(params)
                .done(function () {
                    self.toggleSpinner(false);
                    self.cleanSlots();
                    self.readSlots();
                });
        },

        init: function () {
            var self = this,
                schedulerInstance;

            $(self.element).scheduleEvents(self.initOptions());

            schedulerInstance = $(self.element).scheduleEvents('instance');

            this.options.schedulerInstance = schedulerInstance;

            schedulerInstance.disable();

            this.readSlots(this.options.readParams).done(function () {
                schedulerInstance.enable();
            });
        },
        getTimeSlots: function () {

            return this.options.schedulerInstance.getTimeSlots();
        },
        destroy: function () {
            var dataObject,
                schedulerInst;

            schedulerInst = this.options.schedulerInstance;

            if (schedulerInst) {
                schedulerInst.destroy();
                schedulerInst._destroy();
            }
        }

    })
})(messageBox);