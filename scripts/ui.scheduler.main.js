$.widget('custom.scheduler', {
    options: {
        read: '',
        create: '',
        update: '',
        remove: '',
        readParams: {}
    },

    _create: function () {
        this.init(this.options)
    },

    initOptions: function () {
        var self = this;

        return {
            onTimeSlotBusy: function (evt) {
                var kendoDialogInstance = $('<div>').kendoDialog({
                    anchor: 'body',
                    title: "TIME SLOT BUSY",
                    buttonLayout: "normal",
                    closable: false,
                    content: 'Sorry, time slot busy!',
                    actions: [
                        {
                            text: 'OK',
                            primary: true

                        },
                    ],
                }).data('kendoDialog');

                kendoDialogInstance.open();
            },
            onTimeSlotChange: function (evt, eventId) {
                var to,
                    that,
                    event,
                    from,
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

                self.updateModalContentParams(startDataObj, endDataObj);



                var kendoDialogInstance = $('<div>').kendoDialog({
                    width: "400px",
                    anchor: 'body',
                    title: "EDIT TIME SLOT",
                    closable: false,
                    modal: true,
                    buttonLayout: "normal",
                    content: self.modalWindowContent,
                    actions: [
                        {
                            text: 'Save',
                            action: function () {
                                var payload,
                                    updatedEvent,
                                    updatedSlotInfo,
                                    choosedStartTime = new Date(self.getStartTimePicker().value()),
                                    choosedEndTime = new Date(self.getEndTimePicker().value()),
                                    choosedStartDay = weekDays.indexOf(self.getStartDropdownInstance().value()),
                                    choosedEndDay = weekDays.indexOf(self.getEndDropdownInstance().value());

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
                            primary: true

                        },
                        {
                            text: 'Cancel'
                        }
                    ],

                }).data('kendoDialog');

                kendoDialogInstance.open()
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

                self.updateModalContentParams(startDataObj, endDataObj);

                var kendoDialogInstance = $('<div>').kendoDialog({
                    width: "400px",
                    anchor: 'body',
                    title: "ADD NEW TIME SLOT",
                    closable: false,
                    modal: true,
                    buttonLayout: "normal",
                    content: self.modalWindowContent,
                    actions: [
                        {
                            text: 'Save',
                            action: function () {
                                var payload,
                                    createdEvent,
                                    createdSlotInfo,
                                    choosedStartTime = new Date(self.getStartTimePicker().value()),
                                    choosedEndTime = new Date(self.getEndTimePicker().value()),
                                    choosedStartDay = weekDays.indexOf(self.getStartDropdownInstance().value()),
                                    choosedEndDay = weekDays.indexOf(self.getEndDropdownInstance().value());

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
                            primary: true

                        },
                        {
                            text: 'Cancel'
                        }
                    ],
                }).data('kendoDialog');

                kendoDialogInstance.open()
            },
            onTimeSlotRemove: function (evt, idObj) {

                var kendoDialogInstance = $('<div>').kendoDialog({
                    width: "400px",
                    anchor: 'body',
                    title: "DELETE TIME SLOT",
                    closable: false,
                    modal: true,
                    content: 'Are you sure, you want to proceed?',
                    buttonLayout: "normal",
                    actions: [
                        {
                            text: 'Delete',
                            action: function () {
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
                            },
                            primary: true

                        },
                        {
                            text: 'Cancel'
                        }
                    ],

                }).data('kendoDialog');

                kendoDialogInstance.open();

            }
        }
    },

    _get$StartDayDropdown: function () {
        return this.modalWindowContent.find('.start-day');
    },
    _get$EndDayDropdown: function () {
        return this.modalWindowContent.find('.end-day');
    },
    _get$StartDayTimePicker: function () {
        return this.modalWindowContent.find('.start-time');
    },
    _get$EndDayTimePicker: function () {
        return this.modalWindowContent.find('.end-time');
    },


    initStartDayDropdown: function (params) {
        var options,
            startDay$Dropdown;

        options = {
            autoWidth: false
        }

        options = $.extend(true, {}, options, params);

        startDay$Dropdown = this._get$StartDayDropdown();

        startDay$Dropdown.kendoDropDownList(options);

        this.options.startDayDropdownInst = startDay$Dropdown.data('kendoDropDownList');
    },

    initEndDayDropdown: function (params) {
        var options,
            endDay$Dropdown;

        options = {
            autoWidth: false
        };

        options = $.extend(true, {}, options, params);

        endDay$Dropdown = this._get$EndDayDropdown();

        endDay$Dropdown.kendoDropDownList(options);

        this.options.endDayDropdownInst = endDay$Dropdown.data('kendoDropDownList');
    },

    initStartDayTimePicker: function (params) {
        var options = {
            format: 't',
        }

        options = $.extend(true, {}, options, params);

        startDay$TimePicker = this._get$StartDayTimePicker();

        startDay$TimePicker.kendoTimePicker(options);

        this.options.startDayTimePicker = startDay$TimePicker.data('kendoTimePicker');
    },

    initEndDayTimePicker: function (params) {
        var options = {
            format: 't',
        }

        options = $.extend(true, {}, options, params);

        endDay$TimePicker = this._get$EndDayTimePicker();

        endDay$TimePicker.kendoTimePicker(options);

        this.options.endDayTimePicker = endDay$TimePicker.data('kendoTimePicker');
    },

    initModalContent: function () {
        this.initStartDayDropdown();
        this.initEndDayDropdown();
        this.initStartDayTimePicker();
        this.initEndDayTimePicker();
    },

    updateModalContentParams: function (startDayParams, endDayParams) {
        var startDropdownInst = this.getStartDropdownInstance(),
            endDropdownInst = this.getEndDropdownInstance();

        startDropdownInst.setDataSource(startDayParams.days);
        startDropdownInst.value(startDayParams.defaultDay);

        endDropdownInst.setDataSource(endDayParams.days);
        endDropdownInst.value(endDayParams.defaultDay);

        this.getStartTimePicker().value(startDayParams.defaultTime);
        this.getEndTimePicker().value(endDayParams.defaultTime);
    },

    getStartDropdownInstance: function () {
        return this.options.startDayDropdownInst;
    },

    getEndDropdownInstance: function () {
        return this.options.endDayDropdownInst;
    },

    getStartTimePicker: function () {
        return this.options.startDayTimePicker;
    },

    getEndTimePicker: function () {
        return this.options.endDayTimePicker;
    },

    updateTimePickerValue: function (timePickerInst, value) {
        timePickerInst.value(value);
    },

    toggleSpinner: function (toggle) {
        toggle ? globalModule.startWaitAnimation(this.element) :
            globalModule.stopWaitAnimation(this.element);
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

        this.toggleSpinner(true);

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
        }).always(function () {
            self.toggleSpinner(false);
        });
    },

    cleanSlots: function () {
        var schedulerInst = $(this.element).scheduleEvents('instance');

        schedulerInst.cleanSlots();
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

            if(this.element.data('scheduler')){
                return this;
            }

        self.modalWindowContent = $($('#scheduler-modal-content').html());

        $(self.element).scheduleEvents(self.initOptions());
        schedulerInstance = $(self.element).scheduleEvents('instance');
        
        schedulerInstance.disable();
        self.initModalContent();

        this.readSlots(this.options.readParams).done(function () {
            schedulerInstance.enable();
        });
    },
    getTimeSlots: function(){
        var schedulerInst = $(this.element).scheduleEvents('instance');

        return schedulerInst.getTimeSlots();
    },
    destroy: function () {
        var schedulerInst = $(this.element).scheduleEvents('instance');

        if (schedulerInst) {
            schedulerInst.destroy();
            schedulerInst._destroy();
        }

    }

});