$.widget('custom.scheduleEvents', $.custom.scheduleTable, {
    options: {
        eventClass: 'event-item',
        eventStartClass: 'event-item__start',
        eventEndClass: 'event-item__end',
        eventHelperClass: 'event-item__helper',
        eventContinueClass: 'event-item__continue',
        eventIdAttr: 'data-event-id',
        startDateHandleClass: 'event-item__change-start',
        endDateHandleClass: 'event-item__change-finish',
        eventHelperOverlappedClass: 'event-item__helper-overlapped',
        eventTemplate: '<div class="event-item__template"></div>',
        helperTimeTemplate: '<div class="event-Iitem__helper-time"><span class="event-item__start-time"></span><span class="event-item__end-time"></span></div>',
        helperStartTimeClass: 'event-item__start-time',
        helperEndTimeClass: 'event-item__end-time',
        removeBtnTemplate: '<div class="event-item_remove-btn"></div>',
        removeEventBtn: 'event-item_remove-btn',
        disabledClass: 'schedule-table__disabled',
        disabled: false,
        eventId: 0,
        onTimeSlotBusy: false,
        onTimeSlotMoved: false,
        onTimeSlotRemove: false,
        onTimeSlotChange: false,
        onTimeSlotAdd: false
    },

    store: {
        events: []
    },

    _create: function () {
        this._super();
        this._initEvents();
    },

    _initEvents: function () {
        var self = this;
        var store = self.store;
        var o = this.options;

        $(window).on('resize', function () {
            self.updateCoordinates();
            $('.' + o.eventClass).remove();
            self.store.daysSchedule = undefined;
            store.events.forEach(function (event) {
                self.renderEvent(event);
            });
        });

        $(this.element).on('click', '.' + o.removeEventBtn, function (evt) {
            var event = $(evt.target).closest('.' + o.eventClass);
            var eventId = event.attr(o.eventIdAttr);

            if (!self.isDisabled()) {
                self._trigger('onTimeSlotRemove', evt, {
                    id: eventId
                });
            }
        });

        $(this.element).on('dblclick', '.' + o.eventClass, function (evt) {
            var event = $(evt.currentTarget);
            var eventId = event.attr(o.eventIdAttr);

            if (!self.isDisabled()) {
                self._trigger('onTimeSlotChange', evt, {
                    id: eventId
                });
            }
        });

        this._get$EventSection().on('dblclick', 'td', function (evt) {
            if (!self.isDisabled()) {
                self._trigger('onTimeSlotAdd', evt);
            }
        });
    },

    addEvent: function (event) {
        var store,
            fromHourObj,
            toHourObj;

        store = this.store;
        store.events = store.events || [];
        this.updateCoordinates();

        fromHourObj = this.Date(event.from);
        toHourObj = this.Date(event.to);

        $.extend(event.from, fromHourObj);
        $.extend(event.to, toHourObj);

        if (this.allowAddEvent(event)) {
            event.id = this.options.eventId++;

            store.events.push(event);
            this.renderEvent(event);

        } else {
            this._trigger('onTimeSlotBusy', undefined, event);
        };

        return this;
    },

    removeEvent: function (eventId) {
        var self,
            store;

        self = this;
        store = self.store;

        if (this.isDisabled()) {
            return;
        }

        store.events = store.events.filter(function (event) {
            return event.id != eventId
        });

        $('.' + this.options.eventClass).remove();
        store.daysSchedule = undefined;


        store.events.forEach(function (event) {
            self.renderEvent(event);
        });
    },

    allowAddEvent: function (event) {
        var o,
            to,
            from,
            self,
            store,
            isAllow;


        o = this.options;
        self = this;
        store = self.store;
        from = event.from;
        to = event.to;

        var eventRenderOptions = self.getEventRenderOptions(event);
        var eventObjs = eventRenderOptions.map(function (renderOptions) {
            var eventPosition = self.getEventGeometry(renderOptions);
            return {
                position: function () {
                    return {
                        top: eventPosition.top,
                        left: eventPosition.left
                    }
                },
                outerHeight: function () {
                    return eventPosition.height;
                },
                day: renderOptions.from.day,
                id: renderOptions.id
            }
        });

        isAllow = !self.checkOverlapping(eventObjs);
        self._discardValues();

        return isAllow;

    },

    getTimeSlots: function () {
        return this.store.events;
    },

    getEventSequenceId: function (event) {
        var o,
            store,
            eventId,
            eventEnd,
            eventStart,
            sequenceId;

        o = this.options;
        store = this.store;
        eventId = event.id;
        eventStart = event.from;
        eventEnd = event.to;

        sequenceId = store.events.filter(function (event) {
                return event.id != eventId;
            })
            .filter(function (evt) {
                return eventStart.day == evt.to.day;
            })
            .concat(event)
            .sort(function (a, b) {
                if (eventStart.day == b.to.day) {
                    if (eventStart.fullHour == b.to.fullHour) {
                        return eventStart.minutes > b.from.minutes
                    }
                    return eventStart.fullHour > b.from.fullHour
                }

                if (eventEnd.day == b.from.day) {
                    if (eventEnd.fullHour == b.from.fullHour) {
                        return eventEnd.minutes < b.from.minutes
                    }
                    return eventEnd.fullHour < b.from.fullHour
                }

            })
            .reduce(function (memo, evt, sequenceId) {
                if (event.id == evt.id) {
                    memo = sequenceId;
                }
                return memo;
            }, -1);

        if (this.eventStartsLate(event)) {
            ++sequenceId;
        };

        return sequenceId;
    },

    addHelper: function (helper, day) {
        var store = this.store;
        var helpers = store.helpers;

        if (!helpers) {
            helpers = store.helpers = {};
        }

        if (helpers[day]) {
            helpers[day] = [].concat(helpers[day]).concat(helper);
        } else {
            helpers[day] = helper;
        }

        return this;

    },

    isDisabled: function () {
        return this.options.disabled;
    },

    disable: function () {
        var o = this.options;

        if (this.isDisabled()) {
            return this;
        }

        o.disabled = true;

        this.forEachEvent(function (eventObj) {
            var $event,
                dragEventsInst,
                resizeEventsInst;

            $event = eventObj.$event;
            dragEventsInst = $event.data('customDragEvents');
            resizeEventsInst = $event.data('customResizeEvents');

            if (dragEventsInst && dragEventsInst.disable) {
                dragEventsInst.disable();
            };

            if (resizeEventsInst && resizeEventsInst.disable) {
                resizeEventsInst.disable();
            };

        });

        $(this.element).addClass(o.disabledClass);

        return this;
    },

    slotHasChanged: function (oldSlot, newSlot) {
        var isDeepEqual = function isDeepEqual(objA, objB) {
            return Object.keys(objA).every(function (prop) {

                if (typeof objA[prop] == 'object') {
                    return isDeepEqual(objA[prop], objB[prop]);
                };
                return objA[prop] == objB[prop]
            });
        }

        return !isDeepEqual(oldSlot, newSlot);
    },

    enable: function () {
        var o = this.options;

        if (!this.isDisabled()) {
            return this;
        };

        o.disabled = false;

        this.forEachEvent(function (eventObj) {
            var $event,
                dragEventsInst,
                resizeEventsInst;

            $event = eventObj.$event;
            dragEventsInst = $event.data('customDragEvents');
            resizeEventsInst = $event.data('customResizeEvents');

            if (dragEventsInst && dragEventsInst.disable) {
                dragEventsInst.enable();
            };

            if (resizeEventsInst && resizeEventsInst.disable) {
                resizeEventsInst.enable();
            };

        });

        $(this.element).removeClass(o.disabledClass);

        return this;
    },

    forEachHelper: function (cb) {
        var store,
            helpers,
            currentHelper;

        store = this.store;
        helpers = store.helpers;

        Object.keys(helpers).forEach(function (dayOrder) {
            currentHelper = helpers[dayOrder];

            if (currentHelper instanceof Array) {
                currentHelper.forEach(function (helper) {
                    cb(helper, dayOrder);
                })
            } else {
                cb(currentHelper, dayOrder);
            }
        });
    },

    forEachEvent: function (cb, id) {
        id = id ? id.toString() : undefined;

        var store,
            dayKeys,
            currentEvent,
            daysSchedule,
            invokeCallBack;

        store = this.store;
        daysSchedule = store.daysSchedule;

        if (!daysSchedule) {
            return;
        };

        dayKeys = Object.keys(daysSchedule);
        invokeCallBack = function (event, dayOrder) {
            if (id) {
                id == event.id ? cb(event, dayOrder) : null;
                return;
            }
            cb(event, dayOrder);
        };

        Object.keys(daysSchedule).forEach(function (dayOrder) {
            currentEvent = daysSchedule[dayOrder];

            currentEvent.forEach(function (event) {
                if (event instanceof Array) {
                    event.forEach(function (evt) {
                        invokeCallBack(evt, dayOrder);
                    })
                } else {
                    invokeCallBack(event, dayOrder);
                }

            });
        })
    },

    toggleHelpersOverlapped: function (toggle) {
        var self = this;

        this.forEachHelper(function (helper, _) {
            helper.toggleClass(self.options.eventHelperOverlappedClass, toggle);
        });
    },


    getDefaultRenderOptions: function (currentDay, id) {
        var options,
            hoursArray,
            toHourObj,
            fromHourObj;

        hoursArray = this.getHoursArray();
        fromHourObj = hoursArray[0];
        toHourObj = hoursArray[hoursArray.length - 1];

        options = {
            from: fromHourObj,
            to: toHourObj,
            resize: {
                top: false,
                bottom: false
            },
            isStart: false,
            isEnd: false,
            continue: true,
            id: id
        };

        options.from.day = currentDay;
        options.to.day = currentDay;
        options.from.minutes = '00';
        options.to.minutes = '00';

        return options;

    },

    eventEndsAtMidnight: function (event) {
        return this.isMidnight(event.to);
    },

    eventEndsAtSameDay: function (event) {
        return event.from.day == event.to.day;
    },

    eventStartsLate: function (event) {
        var eventStartsLate,
            eventStartsAtSameDay;

        eventStartsAtSameDay = this.eventEndsAtSameDay(event);
        eventStartsLate = this._getHourOrder(event.from) > this._getHourOrder(event.to);

        return eventStartsAtSameDay && eventStartsLate;
    },

    getEventStartDay: function (evt) {
        return evt.from.day;
    },

    isEventStartEqualEnd: function (event) {
        var to,
            from,
            isSameDay,
            isSameHour,
            isSameMinutes,
            isSameTimePeriod;

        from = event.from;
        to = event.to;

        isSameDay = from.day == to.day;
        isSameHour = from.hour == to.hour;
        isSameMinutes = from.minutes == to.minutes;
        isSameTimePeriod = from.timePeriod == to.timePeriod;

        return isSameDay && isSameHour && isSameMinutes && isSameTimePeriod;
    },

    /*TODO: hotfix to right render slots when end == 00 : 00 */

    getEventEndDayToRender: function (evt) {
        var endDay = evt.to.day;

        if (this.eventEndsAtMidnight(evt)) {
            --endDay;
        }

        return endDay < 0 ? this.options.weekDays.length - 1 : endDay;
    },

    getEventRenderOptions: function (event) {
        var to,
            from,
            weekDays,
            startHour,
            finishHour,
            eventClone,
            weekDaysLen,
            startMinutes,
            finishMinutes,
            renderOptions,
            startDayIndex,
            endDayIndex,
            eventRenderOptions;

        weekDays = this.options.weekDays;
        weekDaysLen = weekDays.length;
        eventClone = $.extend(true, {}, event);
        from = eventClone.from;
        to = eventClone.to;
        eventRenderOptions = [];

        startDayIndex = from.day;
        endDayIndex = to.day;

        endDayIndex = this.getEventEndDayToRender(event);


        if (startDayIndex != endDayIndex) {
            event.isOneDayEvent = false;

            if (startDayIndex < endDayIndex) {
                for (var dayIdx = startDayIndex; dayIdx <= endDayIndex; dayIdx++) {
                    //default params
                    renderOptions = this.getDefaultRenderOptions(dayIdx, event.id);

                    if (dayIdx == endDayIndex) {

                        renderOptions.to = to;
                        renderOptions.resize.bottom = true;
                        renderOptions.isEnd = true;

                        eventRenderOptions.push(renderOptions);
                        break;

                    };

                    if (dayIdx == startDayIndex) {
                        renderOptions.from = from;
                        renderOptions.resize.top = true;
                        renderOptions.isStart = true;

                    };

                    eventRenderOptions.push(renderOptions);
                }
            } else {
                for (var dayIdx = startDayIndex; true; dayIdx++) {
                    if (dayIdx == weekDaysLen) {
                        dayIdx = 0;
                    }

                    renderOptions = this.getDefaultRenderOptions(dayIdx, event.id);

                    if (dayIdx == startDayIndex) {
                        renderOptions.resize.top = true;
                        renderOptions.from = from;
                        renderOptions.isStart = true;
                    };

                    if (dayIdx == endDayIndex) {
                        renderOptions.resize.bottom = true;
                        renderOptions.to = to;
                        renderOptions.isEnd = true;

                        eventRenderOptions.push(renderOptions);
                        break;
                    }

                    eventRenderOptions.push(renderOptions);
                }
            }
        } else if (this.eventStartsLate(eventClone) && !this.eventEndsAtMidnight(eventClone)) {
            event.isOneDayEvent = false;

            for (var dayIdx = startDayIndex, i = 0; i <= weekDaysLen; i++, dayIdx++) {
                dayIdx = dayIdx % weekDaysLen;

                renderOptions = this.getDefaultRenderOptions(dayIdx, event.id);

                if (i == 0) {
                    renderOptions.from = from;
                    renderOptions.isStart = true;
                    renderOptions.resize.top = true;
                }

                if (i == weekDaysLen) {
                    renderOptions.to = to;
                    renderOptions.isEnd = true;
                    renderOptions.resize.bottom = true;
                }

                eventRenderOptions.push(renderOptions);
            }

        } else {
            eventClone.resize = {
                top: true,
                bottom: true
            };
            eventClone.isStart = true;
            eventClone.isEnd = true;
            eventClone.continue = false;
            eventClone.isOneDayEvent = true;
            eventRenderOptions.push(eventClone);
        }

        return eventRenderOptions;
    },

    renderEvent: function (event) {
        var self,
            eventRenderOptions;

        self = this;
        eventRenderOptions = this.getEventRenderOptions(event);

        eventRenderOptions.forEach(function (renderOptions) {
            self.prepareForRender(renderOptions);
        });

        this.placeEvents();

        return this;

    },

    getMinutesFactor: function (minutes) {
        return Number(
            (Number(minutes) / 60).toFixed(1)
        );
    },

    getEventGeometry: function (renderOptions) {
        var hoursArray,
            parentHeight,
            lastHourObj,
            firstHourObj,
            startCellTop,
            firstCellData,
            lastCellData,
            cellBorderWidth,
            finalCellHeight,
            toMinutesFactor,
            startCellCoords,
            finishCellCoords,
            fromMinutesFactor,
            to = renderOptions.to,
            from = renderOptions.from;

        hoursArray = this.getHoursArray();
        firstHourObj = hoursArray[0];
        lastHourObj = hoursArray[hoursArray.length - 1];
        parentHeight = this._get$EventSection().height();
        cellBorderWidth = this.getBorderWidth();
        firstCellData = this.getCellByTime(from);
        lastCellData = this.getCellByTime(to);

        startCellCoords = this.getCellCoords(firstCellData);
        finishCellCoords = this.getCellCoords(lastCellData);

        startCellTop = startCellCoords.top;

        if (from.minutes) {
            fromMinutesFactor = this.getMinutesFactor(from.minutes);
            startCellTop = startCellCoords.top + (startCellCoords.height * fromMinutesFactor);
        };

        finalCellHeight = (finishCellCoords.top - startCellTop) - cellBorderWidth;

        if (this.eventHasMinutes(to)) {
            toMinutesFactor = this.getMinutesFactor(to.minutes);
            finalCellHeight = (finishCellCoords.top - startCellTop) + (finishCellCoords.height * toMinutesFactor);
        };

        if (renderOptions.isEnd && this.eventEndsAtMidnight(renderOptions)) {
            finalCellHeight = (parentHeight - cellBorderWidth) - (startCellTop + cellBorderWidth);
        };

        if (renderOptions.continue && !renderOptions.isEnd && (to.hour == lastHourObj.hour) && (to.timePeriod == lastHourObj.timePeriod)) {
            finalCellHeight += (finishCellCoords.height - cellBorderWidth);
        }

        return {
            top: startCellTop + cellBorderWidth,
            left: startCellCoords.left,
            width: startCellCoords.width,
            height: finalCellHeight - cellBorderWidth
        }
    },

    getTimeSlotInfo: function (event) {
        var eventEnd,
            eventStart,
            sequenceId;

        eventStart = event.from;
        eventEnd = event.to;

        sequenceId = this.getEventSequenceId(event);

        return {
            SequenceId: sequenceId,
            Open: {
                DayOfWeek: eventStart.day,
                Time: String(eventStart.fullHour) + String(eventStart.minutes)
            },
            Close: {
                DayOfWeek: eventEnd.day,
                Time: String(eventEnd.fullHour) + String(eventEnd.minutes)
            }
        };

    },

    _getEventsObjsById: function (id) {
        var store,
            eventObjects;

        store = this.store;
        eventObjects = {};

        this.forEachEvent(function (eventObj, dayOrder) {
            if (eventObjects[dayOrder] && eventObj.id == id) {
                eventObjects[dayOrder] = [].concat(eventObjects[dayOrder]).concat(eventObj);
                return;
            }

            if (eventObj.id == id) {
                eventObjects[dayOrder] = eventObj;
            }
        });

        return eventObjects;
    },

    _getEventById: function (id) {
        var store = this.store;

        return store.events.filter(function (eventObj) {
            return eventObj.id == id;
        })[0]
    },

    _get$EventsById: function (id) {
        var $eventSection = this._get$EventSection();

        return $eventSection.find('.' + this.options.eventClass + '[' + this.options.eventIdAttr + '=' + id + ']');
    },

    getFormattedString: function (timeObj) {
        var hour,
            minutes,
            timePeriod;

        hour = timeObj.hour;
        minutes = timeObj.minutes;
        timePeriod = timeObj.timePeriod;

        return hour + ' : ' + minutes + ' ' + timePeriod;
    },

    checkOverlapping: function (elems) {
        var self,
            store,
            eventId,
            evtCoords,
            helperHeight,
            helperPosition,
            isOverlapped,
            isOverlappedFunc;


        self = this;
        store = this.store;
        isOverlapped = [];

        isOverlappedFunc = function (helperPosition, helperHeight, evtDayOrder, eventId) {

            if (!store.events.length) {
                isOverlapped.push(false);
                return;
            };

            self.forEachEvent(function (event, hlpDayOrder) {
                evtCoords = event.coordinates;

                if (evtDayOrder == hlpDayOrder && eventId != event.id) {
                    if (
                        (helperPosition.top >= evtCoords.top) &&
                        (helperPosition.top < (evtCoords.top + evtCoords.height)) ||
                        ((helperPosition.top + helperHeight) > evtCoords.top) &&
                        ((helperPosition.top + helperHeight) <= (evtCoords.top + evtCoords.height)) ||
                        (evtCoords.top >= helperPosition.top) &&
                        ((evtCoords.top + evtCoords.height) <= (helperPosition.top + helperHeight))
                        //kill me please
                    ) {
                        isOverlapped.push(true);
                    }
                } else {
                    isOverlapped.push(false);
                }

            });
        };


        if (elems && elems instanceof Array) {
            elems.forEach(function (eventObj) {
                var eventPosition = eventObj.position();
                var eventHeight = eventObj.outerHeight();
                var dayOrder = eventObj.day;

                isOverlappedFunc(eventPosition, eventHeight, dayOrder, eventObj.id);

            });

            return isOverlapped.some(function (overlapped) {
                return overlapped == true
            });
        };

        this.forEachHelper(function (helper, evtDayOrder) {
            helperPosition = helper.position();
            helperHeight = helper.outerHeight();
            eventId = helper.attr(self.options.eventIdAttr);

            isOverlappedFunc(helperPosition, helperHeight, evtDayOrder, eventId);
        });

        store.isOverlapped = isOverlapped.some(function (overlapped) {
            return overlapped == true
        });
    },

    setEventClasses: function (eventObj, $eventElem) {
        var o = this.options;

        if (eventObj.isStart) {
            $eventElem.addClass(o.eventStartClass);

            if (eventObj.isEnd) {
                $eventElem.addClass(o.eventEndClass);
            } else if (eventObj.continue) {
                $eventElem.addClass(o.eventContinueClass);
            }

        } else if (eventObj.isEnd) {
            $eventElem.addClass(o.eventEndClass);

            if (eventObj.continue) {
                $eventElem.addClass(o.eventContinueClass);
            }

        } else {
            $eventElem.addClass(o.eventContinueClass);
        }

        return $eventElem;
    },

    getEventOptions: function (renderOptions) {
        var top,
            bottom,
            resize,
            options,
            isOneDayEvent;

        resize = renderOptions.resize;
        isOneDayEvent = renderOptions.isOneDayEvent;

        options = {
            axis: null,
            handles: null
        };

        if (isOneDayEvent) {
            options.axis = 'x, y';
        } else {
            options.axis = 'x';
        }

        if (resize) {
            top = resize.top;
            bottom = resize.bottom;

            options.handles = top && bottom ? 'top, bottom' : top ? 'top' : bottom ? 'bottom' : null;
        }

        return options;
    },

    prepareForRender: function (renderOptions) {
        var store = this.store;

        if (!store.preparedForRender) {
            store.preparedForRender = [];
        }

        store.preparedForRender.push(renderOptions);
    },

    getPreparedForRender: function () {
        var to,
            from,
            $event,
            removeBtn,
            originalEvent,
            eventOptions,
            eventTemplate,
            eventGeometry,
            $eventsFragment,
            store = this.store,
            eventClass = this.options.eventClass,
            eventIdAttr = this.options.eventIdAttr,
            o = this.options;

        store.daysSchedule = store.daysSchedule || {};
        $eventsFragment = $(document.createDocumentFragment());
        eventTemplate = o.eventTemplate;
        removeBtn = o.removeBtnTemplate;

        store.preparedForRender.forEach(function (renderOptions) {
            to = renderOptions.to;
            from = renderOptions.from;


            originalEvent = this._getEventById(renderOptions.id);
            eventOptions = this.getEventOptions(renderOptions);
            eventGeometry = this.getEventGeometry(renderOptions);
            $event = $('<div>').addClass(eventClass);
            this.setEventClasses(renderOptions, $event);

            $eventsFragment.append(
                $event.append(
                    $(eventTemplate).append(
                        $(removeBtn)
                    )
                )
            );

            $event.attr(eventIdAttr, renderOptions.id);
            $event.css(eventGeometry);

            store.daysSchedule[from.day] = store.daysSchedule[from.day] || [];

            store.daysSchedule[from.day].push({
                $event: $event,
                coordinates: eventGeometry,
                id: renderOptions.id
            });

            this.set$EventDraggable($event, $.extend(true, {}, originalEvent, eventOptions));

            this.set$EventResizable($event, $.extend(true, {}, originalEvent, eventOptions));


        }, this);


        delete store.preparedForRender;

        return $eventsFragment;
    },


    placeEvents: function () {
        this._get$EventSection().append(
            this.getPreparedForRender()
        );
        return this;
    },

    getValidTopPosition: function (topPosition) {
        var borderWidth,
            parentHeight,
            validTopPosition;

        borderWidth = this.getBorderWidth();
        parentHeight = this._get$EventSection().height();

        if (topPosition < borderWidth) {
            validTopPosition = borderWidth;
        } else if (topPosition >= parentHeight) {
            validTopPosition = parentHeight - borderWidth;
        } else {
            validTopPosition = topPosition;
        }

        return validTopPosition;
    },

    getValidLeftPosition: function (leftPosition) {
        var borderWidth,
            parentWidth,
            validLeftPosition;

        borderWidth = this.getBorderWidth();
        parentWidth = this._get$EventSection().width();

        if (leftPosition < borderWidth) {
            validLeftPosition = borderWidth;
        } else if (leftPosition >= parentWidth) {
            validLeftPosition = parentWidth - borderWidth;
        } else {
            validLeftPosition = leftPosition;
        }

        return validLeftPosition;
    },

    getValidPosition: function (position) {
        var props,
            borderWidth,
            parentHeight,
            validPosition;

        props = Object.keys(position);
        borderWidth = this.getBorderWidth();
        parentHeight = this._get$EventSection().height();

        validPosition = {};

        if (position.top !== undefined) {
            validPosition.top = this.getValidTopPosition(position.top);
        };

        if (position.left !== undefined) {
            validPosition.left = this.getValidLeftPosition(position.left);
        }

        return validPosition;
    },

    getCeilPosition: function (position) {
        var props,
            validPosition,
            ceilPosition;

        props = Object.keys(position);
        validPosition = this.getValidPosition(position);

        ceilPosition = props.reduce(function (updPosition, prop) {
            updPosition[prop] = Math.ceil(validPosition[prop]);

            return updPosition;
        }, {});

        return ceilPosition;
    },

    getFloorPosition: function (position) {
        var props,
            leftPosition,
            validPosition,
            floorPosition;

        props = Object.keys(position);
        validPosition = this.getValidPosition(position);
        leftPosition = Math.ceil(validPosition.left);

        floorPosition = props.reduce(function (updPosition, prop) {
            updPosition[prop] = Math.floor(validPosition[prop]);

            return updPosition;
        }, {});

        floorPosition.left = leftPosition;

        return floorPosition;
    },

    isTheSamePosition: function (positionA, positionB) {
        if (!positionA || !positionB) {
            return false;
        }
        return Object.keys(positionA).reduce(function (isTheSame, prop) {
            if (!positionB[prop]) {
                isTheSame = false;
            } else if (positionA[prop] != positionB[prop]) {
                isTheSame = false;
            }

            return isTheSame;
        }, true)
    },

    _get$StartHelper: function (id) {
        var o,
            eventSection,
            eventStartSearch;

        o = this.options;
        eventSection = this._get$EventSection();
        eventStartSearch = '.' + o.eventStartClass + '.' + o.eventHelperClass;

        if (id) {
            eventStartSearch += '[' + o.eventIdAttr + '=' + id + ']';
        };

        return eventSection.find(eventStartSearch);
    },

    _get$EndHelper: function (id) {
        var o,
            eventSection,
            eventEndSearch;

        o = this.options;
        eventSection = this._get$EventSection();
        eventEndSearch = '.' + o.eventEndClass + '.' + o.eventHelperClass;

        if (id) {
            eventEndSearch += '[' + o.eventIdAttr + '=' + id + ']';
        };

        return eventSection.find(eventEndSearch);
    },

    eventHasMinutes: function (event) {
        return Number(event.minutes) != 0 && Number(event.minutes) > 0;
    },

    set$EventDraggable: function ($event, options) {
        var self = this;

        $event.dragEvents({
            containment: "parent",
            parent: this._get$EventSection(),
            helper: function () {
                return $(this)
                    .clone()
                    .empty()
                    .removeClass(self.options.eventClass)
                    .addClass(self.options.eventHelperClass);
            },
            axis: options.axis,
            grid: [],
            start: function (evt, ui) {
                var that,
                    store,
                    event,
                    eventId;

                that = $(this).dragEvents("instance");
                store = self.store;
                eventId = $(this).attr(self.options.eventIdAttr);
                event = self._getEventById(eventId);


                that._trigger('updateGridCoordinates', evt, ui);
                that._trigger('updateOriginalPosition', evt, ui);
                that._trigger('initHelpers', evt, ui);
                that._trigger('displayTime', evt, ui);

                store.oldTime = self.getTimeSlotInfo(event);
            },
            updateOriginalPosition: function (evt, ui) {
                var store = self.store;
                store.originalDragPosition = ui.position;
            },
            updateGridCoordinates: function (evt, ui) {
                var that,
                    cellData,
                    mousePosition;

                that = $(this).dragEvents("instance");
                mousePosition = self.getMousePosition(evt);
                cellData = self._getCellDataByPosition(mousePosition);

                if (cellData) {
                    that.options.grid = [cellData.cell.outerWidth(), cellData.cell.outerHeight()];
                }
            },
            initHelpers: function (evt, ui) {
                var o,
                    that,
                    store,
                    events,
                    eventId,
                    $element,
                    daysArr,
                    $parent,
                    borderWidth,
                    currentEvent;

                $element = $(this);
                o = self.options;
                that = $(this).dragEvents("instance");
                store = self.store;
                borderWidth = self.getBorderWidth();
                eventId = options.id.toString() || ui.element.attr(self.options.eventIdAttr);
                currentEvent = self._getEventById(eventId);
                $parent = $element.parent();

                self.forEachEvent(function (event, dayOrder) {
                    var topCellData,
                        bottomCellData,
                        bottomCoords,
                        currentHelper,
                        helperPosition,
                        helperHeight,
                        recalculatedHeight;


                    if (!event.$event.is($element)) {
                        var $helperclone = event.$event.clone()
                            .empty()
                            .removeClass(o.eventClass)
                            .addClass(o.eventHelperClass)
                            .append($(o.helperTimeTemplate));

                        $parent.append($helperclone);
                        self.addHelper($helperclone, dayOrder);
                        currentHelper = $helperclone;

                    } else {
                        self.addHelper(ui.helper, dayOrder);
                        store.startDay = dayOrder;
                        currentHelper = ui.helper;
                        that.helperPosition = currentHelper.position();
                        currentHelper.append($(o.helperTimeTemplate))
                    }

                    if (currentEvent.from.minutes || currentEvent.to.minutes) {

                        bottomCoords = {
                            top: event.coordinates.top + event.coordinates.height,
                            left: event.coordinates.left
                        }

                        topCellData = self._getCellDataByPosition(event.coordinates, dayOrder);
                        bottomCellData = self._getCellDataByPosition(bottomCoords, dayOrder);

                        recalculatedHeight = (bottomCellData.coordinates.top + bottomCellData.coordinates.height - borderWidth) - topCellData.coordinates.top;


                        currentHelper.css({
                            top: topCellData.coordinates.top,
                            height: recalculatedHeight
                        });
                    }

                }, eventId)

            },
            drag: function (evt, ui) {
                var that,
                    store,
                    startDay,
                    currentDay,
                    origPosition,
                    mousePosition,
                    currentPosition;

                that = $(this).dragEvents("instance");
                store = self.store;
                currentPosition = self.getCeilPosition(ui.position);
                origPosition = store.originalDragPosition;
                mousePosition = that.getMousePosition(evt);
                currentDay = self._getCellDataByPosition(mousePosition);
                startDay = self._getCellDataByPosition(currentPosition, store.startDay);

                if (!currentDay || !startDay) {
                    return;
                }

                var movedRight = function () {
                    return currentDay.time.day > startDay.time.day;
                };

                var movedLeft = function () {
                    return currentDay.time.day < startDay.time.day;
                };


                if (movedRight()) {
                    that._trigger('movedRight', evt, ui);
                };

                if (movedLeft()) {
                    that._trigger('movedLeft', evt, ui);
                };

            },

            updateVerticalPosition: function (evt, ui) {
                var that,
                    borderWidth,
                    mousePosition,
                    startCellData,
                    startPosition,
                    startCellPosition;

                that = $(this).dragEvents("instance");

                mousePosition = that.getMousePosition(evt);
                borderWidth = self.getBorderWidth();

                startPosition = {
                    top: mousePosition.top - that.offset.click.top,
                    left: mousePosition.left
                };

                startCellPosition = self.getCeilPosition(startPosition);

                startCellData = self._getCellDataByPosition(startCellPosition);

                if (!startCellData) {
                    return;
                };
                if (!that.isHelperInContainment(startCellData.coordinates)) {
                    return;
                }

                if (!self.isTheSamePosition(startCellData.coordinates, that.prevPosition)) {
                    that.updateHelperPosition(startCellData.coordinates);
                    that.helper.css({
                        top: startCellData.coordinates.top
                    });
                    that.prevPosition = startCellData.coordinates;
                }

                that._trigger('checkOverlapping', evt, ui);
                that._trigger('displayTime', evt, ui);

            },

            updateHorizontalPosition: function (evt, ui) {
                var that,
                    store,
                    $parent,
                    pHeight,
                    pWidth;

                store = self.store;
                that = $(this).dragEvents("instance");
                $parent = $(this).parent();
                pHeight = $parent.height();
                pWidth = $parent.width();

                self.forEachHelper(function (helper, dayOrder) {
                    var cellObj,
                        helperWidth,
                        helperPosition;

                    cellObj = self.getColumnByDay(dayOrder)[0];

                    if (helper.is(that.helper)) {
                        that.position.left = cellObj.cell.position().left;
                    }
                    helper.css({
                        left: cellObj.cell.position().left,
                        width: cellObj.cell.outerWidth()
                    });
                });
                that._trigger('checkOverlapping', evt, ui);
                that._trigger('displayTime', evt, ui);
                that._trigger('updateOriginalPosition', evt, ui);

            },
            displayTime: function (evt, ui) {
                var o,
                    store,
                    event,
                    eventId,
                    endHelper,
                    startHelper,
                    endCellTime,
                    startCellTime,
                    cellGeometry,
                    borderWidth,
                    eventSection,
                    parentHeight,
                    startCellTime,
                    endCellTime,
                    endTimeCoords,
                    endHelperHeight,
                    startTimeCoords,
                    endTimeTopCoords,
                    endHelperPosition,
                    startHelperPosition;




                store = self.store;
                o = self.options;
                endCellTime, startCellTime;
                eventId = self.getEventId($(this));
                event = self._getEventById(eventId);
                borderWidth = self.getBorderWidth();
                parentHeight = self._get$EventSection().height();
                eventSection = self._get$EventSection();
                startHelper = self._get$StartHelper(eventId);
                endHelper = self._get$EndHelper(eventId);
                startHelperPosition = startHelper.position();
                endHelperPosition = endHelper.position();
                endHelperHeight = endHelper.outerHeight();

                startTimeCoords = {
                    top: startHelperPosition.top,
                    left: startHelperPosition.left
                };

                endTimeTopCoords = endHelperPosition.top + endHelperHeight;

                endTimeCoords = {
                    top: endTimeTopCoords,
                    left: endHelperPosition.left
                };

                startTimeCoords = self.getCeilPosition(startTimeCoords);
                endTimeCoords = self.getFloorPosition(endTimeCoords);

                if (self.eventHasMinutes(event.to)) {
                    endCellTime = $.extend(true, {}, self._getTimeByPosition(endTimeCoords));
                    endCellTime.minutes = options.to.minutes;
                } else {
                    endCellTime = $.extend(true, {}, self._getEndTimeByPosition(endTimeCoords));
                }

                startCellTime = $.extend(true, {}, self._getTimeByPosition(startTimeCoords));

                startCellTime.minutes = options.from.minutes;

                startHelper.find('.' + o.helperStartTimeClass)
                    .text(self.getFormattedString(startCellTime));

                endHelper.find('.' + o.helperEndTimeClass)
                    .text(self.getFormattedString(endCellTime));
            },
            movedTop: function (evt, ui) {
                var that = $(this).dragEvents("instance");

                that._trigger('updateVerticalPosition', evt, ui);
            },
            movedBottom: function (evt, ui) {
                var that = $(this).dragEvents("instance");

                that._trigger('updateVerticalPosition', evt, ui);
            },
            movedRight: function (evt, ui) {
                var that,
                    store,
                    helpers,
                    updatedHelpers;

                that = $(this).dragEvents("instance");
                store = self.store;
                helpers = store.helpers;
                updatedHelpers = {};

                updatedHelpers = Object.keys(helpers).reduce(function (updHelpers, dayOrder) {
                    var helper = helpers[dayOrder];
                    delete helpers[dayOrder];
                    updHelpers[++dayOrder > 6 ? 0 : dayOrder] = helper;

                    return updHelpers;
                }, {});

                store.startDay++;
                store.helpers = updatedHelpers;
                that._trigger('updateHorizontalPosition', evt, ui);
            },
            movedLeft: function (evt, ui) {
                var that,
                    store,
                    helpers,
                    updatedHelpers;

                that = $(this).dragEvents("instance");
                store = self.store;
                helpers = store.helpers;
                updatedHelpers = {};

                updatedHelpers = Object.keys(helpers).reduce(function (updHelpers, dayOrder) {
                    var helper = helpers[dayOrder];
                    delete helpers[dayOrder];
                    updHelpers[--dayOrder < 0 ? 6 : dayOrder] = helper;

                    return updHelpers;

                }, {});

                store.startDay--;
                store.helpers = updatedHelpers;
                that._trigger('updateHorizontalPosition', evt, ui);
            },
            checkOverlapping: function (evt, ui) {
                var store = self.store;
                self.checkOverlapping();
                if (store.isOverlapped) {
                    self.toggleHelpersOverlapped(true);
                } else {
                    self.toggleHelpersOverlapped(false);
                }
            },

            stop: function (evt, ui) {
                var o,
                    store,
                    that,
                    helpers,
                    event,
                    endDay,
                    eventId,
                    startDay,
                    endHelper,
                    endCellObj,
                    borderWidth,
                    startHelper,
                    eventSection,
                    startCellObj,
                    endDayPosition,
                    startDayPosition;


                that = $(this).dragEvents("instance");
                store = self.store;
                o = self.options;
                borderWidth = self.getBorderWidth();
                helpers = store.helpers;
                eventId = self.getEventId($(this));
                event = self._getEventById(eventId);
                eventSection = self._get$EventSection();
                startDay, endDay, startCellObj, endCellObj;
                startHelper = self._get$StartHelper(eventId);
                endHelper = self._get$EndHelper(eventId);
                startDayPosition = startHelper.position();
                endDayPosition = endHelper.position();

                endDayPosition.top = endDayPosition.top + endHelper.outerHeight();

                self.forEachHelper(function (helper, dayOrder) {
                    if (helper.is(startHelper)) {
                        startDay = dayOrder;
                    } else if (helper.is(endHelper)) {
                        endDay = dayOrder;
                    }
                });

                if (startHelper.is(endHelper)) {
                    endDay = startDay;
                }

                if (!startDay || !endDay) {
                    return;
                }

                /* mozilla  hack, because mozilla gives coordinates with too much long fractions */

                startDayPosition = self.getCeilPosition(startDayPosition);
                endDayPosition = self.getFloorPosition(endDayPosition);

                /*end mozilla hack */


                startCellObj = self._getTimeByPosition(startDayPosition, startDay);
                if (!self.eventHasMinutes(event.to)) {
                    endCellObj = self._getEndTimeByPosition(endDayPosition, endDay);
                } else {
                    endCellObj = self._getTimeByPosition(endDayPosition, endDay);
                }


                store.startDate = startCellObj ? $.extend(true, {}, startCellObj) : undefined;
                store.endDate = endCellObj ? $.extend(true, {}, endCellObj) : undefined;

                self._removeHelpers();

                if (!store.startDate || !store.endDate) {
                    return;
                }

                store.startDate.minutes = event.from.minutes;
                store.endDate.minutes = event.to.minutes;

                event = {
                    from: store.startDate,
                    to: store.endDate,
                    id: eventId
                };

                if (!store.isOverlapped) {

                    store.updatedTime = self.getTimeSlotInfo(event);

                    self._trigger('onTimeSlotMoved', evt, {
                        oldTime: store.oldTime,
                        currentTime: store.updatedTime,
                        event: event
                    });

                } else {
                    self._trigger('onTimeSlotBusy', evt, event);
                }

                self._discardValues();

            },

        })

        return this;
    },
    isAnteMeridiemeriod: function (timeObj) {
        return timeObj.timePeriod.trim() == 'am';
    },
    isTheSameDay: function () {
        var store = this.store;

        return store.startDate.day == store.endDate.day;
    },

    isTheSameHour: function () {
        var store = this.store;
        var theSameTimePeriod = store.startDate.timePeriod == store.endDate.timePeriod;
        var theSameHour = store.startDate.hour == store.endDate.hour;

        return theSameHour && theSameTimePeriod;
    },

    isMidnight: function (timeObj) {
        return (
            timeObj.hour == 12 &&
            this.isAnteMeridiemeriod(timeObj) &&
            !this.eventHasMinutes(timeObj)
        );
    },
    isStartHourLate: function () {
        var store = this.store;

        if (this.isMidnight(store.endDate)) {
            return false;
        };

        return this._getHourOrder(store.startDate) >= this._getHourOrder(store.endDate);
    },
    isStartDayLate: function () {
        var store = this.store;

        return store.startDate.day > store.endDate.day;
    },
    createHelper: function (idAttr) {
        var o = this.options,
            eventIdAttr = o.eventIdAttr,
            helperClass = o.eventHelperClass;

        return $('<div>').addClass(helperClass)
            .attr(eventIdAttr, idAttr)
            .append($(o.helperTimeTemplate));
    },

    isStartEvent: function ($event) {
        var o = this.options;
        return $event.hasClass(o.eventStartClass);
    },

    isEndEvent: function ($event) {
        var o = this.options;

        return $event.hasClass(o.eventEndClass);
    },

    setHelperStartClass: function (helper) {
        var o = this.options;

        if (helper && helper.addClass) {
            helper.addClass(o.eventStartClass);
        };

        return this;
    },
    removeHelperStartClass: function (helper) {
        var o = this.options;

        if (helper && helper.removeClass) {
            helper.removeClass(o.eventStartClass);
        };

        return this;
    },

    setHelperEndClass: function (helper) {
        var o = this.options;

        if (helper && helper.addClass) {
            helper.addClass(o.eventEndClass);
        };

        return this;
    },

    removeHelperEndClass: function (helper) {
        var o = this.options;

        if (helper && helper.removeClass) {
            helper.removeClass(o.eventEndClass);
        };

        return this;
    },



    set$EventResizable: function ($event, options) {
        var self = this;


        $event.resizeEvents({
            handles: options.handles,
            grid: [],
            helperClass: self.options.eventHelperClass,
            renderHelpers: function (evt, ui) {
                var o,
                    that,
                    store,
                    endDay,
                    startDay,
                    $parent,
                    eventId,
                    eventObj,
                    baseRules,
                    eventIdAttr,
                    currentEvent;

                o = self.options;
                that = $(this).resizeEvents("instance");
                store = self.store;
                startDay = +store.startDate.day;
                endDay = +store.endDate.day;
                $parent = that.options.container;
                eventIdAttr = self.options.eventIdAttr;
                eventId = options.id || ui.element.attr(eventIdAttr);
                currentEvent = self._getEventById(eventId);

                baseRules = {
                    "z-index": '90',
                    position: 'absolute'
                };

                self.forEachEvent(function (event, dayOrder) {
                    var $helperclone,
                        topCellData,
                        bottomCellData,
                        bottomCoords,
                        currentHelper,
                        helperPosition,
                        helperHeight,
                        recalculatedHeight,
                        cssRules = $.extend(true, event.coordinates, baseRules);

                    if (event.$event.is(ui.element)) {
                        currentHelper = that.helper
                            .attr(eventIdAttr, eventId)
                            .append($(o.helperTimeTemplate));
                        self.addHelper(that.helper, dayOrder);
                    } else {
                        $helperclone = currentHelper = self.createHelper(eventId);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, dayOrder);

                        $helperclone.css(cssRules);
                    }

                    if (self.isStartEvent(event.$event)) {
                        self.setHelperStartClass(currentHelper);
                    };

                    if (self.isEndEvent(event.$event)) {
                        self.setHelperEndClass(currentHelper);
                    };

                    if (currentEvent.from.minutes || currentEvent.to.minutes) {

                        bottomCoords = {
                            top: event.coordinates.top + event.coordinates.height,
                            left: event.coordinates.left
                        };

                        topCellData = self._getCellDataByPosition(event.coordinates, dayOrder);
                        bottomCellData = self._getCellDataByPosition(bottomCoords, dayOrder);


                        recalculatedHeight = (bottomCellData.coordinates.top + bottomCellData.coordinates.height) - topCellData.coordinates.top;

                        if (currentHelper.is(that.helper)) {
                            that.updateHelperGeometry({
                                top: topCellData.coordinates.top,
                                height: recalculatedHeight
                            });
                            that.helper.css(that.size);
                        } else {
                            currentHelper.css({
                                top: topCellData.coordinates.top,
                                height: recalculatedHeight
                            });
                        }
                    }
                }, eventId);

                that._trigger('resize', evt, ui);

            },
            start: function (evt, ui) {
                var that,
                    event,
                    store,
                    endCell,
                    eventId,
                    startCell;

                that = $(this).resizeEvents('instance');
                eventId = $(this).attr(self.options.eventIdAttr);
                event = self._getEventById(eventId);
                store = self.store;
                store.startDate = options.from;
                store.endDate = options.to;

                store.endDate.day = self.getEventEndDayToRender(event);

                store.oldTime = self.getTimeSlotInfo(event);

                $(this).dragEvents({
                    disabled: true
                });

                if (that._isTopHandleActive) {
                    store.prevDay = store.startDate.day;
                    that._trigger('updateGridCoordinates', evt, {
                        day: store.startDate.day,
                        mousePosition: ui.mousePosition
                    });

                } else {
                    store.prevDay = store.endDate.day;
                    that._trigger('updateGridCoordinates', evt, {
                        day: store.endDate.day,
                        mousePosition: ui.mousePosition
                    });
                }

                that._trigger('renderHelpers', evt, ui);
                that._trigger('displayTime', evt, ui);

            },

            updateGridCoordinates: function (evt, params) {
                var that,
                    cellData,
                    currentDay,
                    mousePosition;

                that = $(this).resizeEvents("instance");
                currentDay = params ? params.day : undefined;
                mousePosition = params.mousePosition ? params.mousePosition : undefined;

                cellData = self._getCellDataByPosition(mousePosition, currentDay);

                if (cellData) {
                    that.updateGridSizes(
                        cellData.cell.outerWidth(),
                        cellData.cell.outerHeight()
                    );
                }
            },
            resize: function (evt, ui) {
                var that,
                    store,
                    event,
                    eventId,
                    cellData,
                    activeTime,
                    eventIdAttr,
                    mousePosition;


                that = $(this).resizeEvents("instance");
                store = self.store;

                eventIdAttr = self.options.eventIdAttr;
                eventId = $(this).attr(eventIdAttr);
                event = self._getEventById(eventId);


                if (that._isTopHandleActive) {
                    mousePosition = self.getCeilPosition(ui.mousePosition);
                    cellData = self._getCellDataByPosition(mousePosition);
                    if (!cellData) {
                        return;
                    }
                    activeTime = cellData.time;

                    that.updateHelperGeometry({
                        top: cellData.coordinates.top,
                        height: that.pHeight - cellData.coordinates.top
                    });

                    store.startDate = cellData ? activeTime : store.startDate;
                    store.startDate.minutes = '00';
                } else {
                    mousePosition = self.getFloorPosition(ui.mousePosition);
                    cellData = self._getCellDataByPosition(mousePosition);
                    if (!cellData) {
                        return;
                    }
                    activeTime = cellData.time;

                    that.updateHelperGeometry({
                        top: self.getBorderWidth(),
                        height: cellData.coordinates.top + cellData.coordinates.height - self.getBorderWidth()
                    });

                    store.endDate = cellData ? activeTime : store.endDate;
                    store.endDate.minutes = '00';
                }

                if (self.isTheSameDay()) {
                    if (that._isTopHandleActive) {
                        that._trigger('renderToEnd', evt, ui);
                    } else {
                        that._trigger('renderToStart', evt, ui);
                    }
                }

                that._trigger('checkOverlapping', evt, ui);

            },
            displayTime: function (evt, ui) {
                var o,
                    store,
                    endDay,
                    startDay,
                    eventId,
                    endHelper,
                    startHelper,
                    borderWidth,
                    endCellTime,
                    startCellTime,
                    endTimeCoords,
                    startTimeCoords,
                    endHelperHeight,
                    endHelperPosition,
                    endTimeTopCoords,
                    startHelperPosition;


                store = self.store;
                o = self.options;
                eventId = self.getEventId($(this));
                borderWidth = self.getBorderWidth();
                startHelper = self._get$StartHelper(eventId);
                endHelper = self._get$EndHelper(eventId);
                startHelperPosition = startHelper.position();
                endHelperPosition = endHelper.position();
                endHelperHeight = endHelper.outerHeight();

                startTimeCoords = self.getCeilPosition(startHelperPosition);
                endTimeTopCoords = endHelperPosition.top + endHelperHeight - borderWidth;
                endTimeCoords = self.getFloorPosition({
                    top: endTimeTopCoords,
                    left: endHelperPosition.left
                });

                self.forEachHelper(function (helper, dayOrder) {
                    if (helper.is(startHelper)) {
                        startDay = dayOrder;
                    };
                    if (helper.is(endHelper)) {
                        endDay = dayOrder;
                    }
                });

                startCellTime = self._getTimeByPosition(startTimeCoords, startDay);
                endCellTime = self._getEndTimeByPosition(endTimeCoords, endDay);

                if (!startCellTime || !endCellTime) {
                    return;
                }

                store.startDate = startCellTime;
                store.endDate = endCellTime;

                startHelper.find('.' + o.helperStartTimeClass)
                    .text(self.getFormattedString(startCellTime));
                endHelper.find('.' + o.helperEndTimeClass)
                    .text(self.getFormattedString(endCellTime));
            },
            updatedHelperGeometry: function (evt, ui) {
                var that = $(this).resizeEvents('instance');

                that._trigger('checkOverlapping', evt, ui);
                that._trigger('displayTime', evt, ui);
            },

            moveLeft: function (evt, ui) {
                var day,
                    that,
                    store,
                    prevDay,
                    cellTime,
                    borderWidth,
                    parentHeight,
                    mousePosition,
                    targetChanging,
                    cellByMousePosition;

                store = self.store;
                that = $(this).resizeEvents('instance');
                parentHeight = that.pHeight;
                borderWidth = self.getBorderWidth();
                mousePosition = that.getMousePosition(evt);

                if (that._isTopHandleActive) {
                    mousePosition = self.getCeilPosition(mousePosition);
                    targetChanging = 'startDate';
                } else {
                    mousePosition = self.getFloorPosition(mousePosition);
                    targetChanging = 'endDate';
                };


                cellData = self._getCellDataByPosition(mousePosition);

                if (!cellData) {
                    return;
                };

                cellTime = cellData.time;

                that._trigger('updateGridCoordinates', evt, {
                    day: day,
                    mousePosition: mousePosition
                });

                store[targetChanging] = cellTime;
                that._trigger('reRenderHelpers', evt, ui);
            },

            moveRight: function (evt, ui) {
                var day,
                    that,
                    store,
                    nextDay,
                    cellTime,
                    celData,
                    parentWidth,
                    mousePosition,
                    targetChanging,
                    cellByMousePosition;

                store = self.store;
                that = $(this).resizeEvents('instance');
                parentWidth = that.options.container.width();
                mousePosition = that.getMousePosition(evt);

                if (that._isTopHandleActive) {
                    targetChanging = 'startDate';
                    mousePosition = self.getCeilPosition(mousePosition);
                } else {
                    targetChanging = 'endDate';
                    mousePosition = self.getFloorPosition(mousePosition);
                };

                cellData = self._getCellDataByPosition(mousePosition);

                if (!cellData) {
                    return;
                };

                cellTime = cellData.time;

                that._trigger('updateGridCoordinates', evt, {
                    day: day,
                    mousePosition: mousePosition
                });

                store[targetChanging] = cellTime;
                that._trigger('reRenderHelpers', evt, ui);
            },
            reRenderHelpers: function (evt, ui) {
                var that = $(this).resizeEvents('instance');

                if (that._isTopHandleActive) {

                    that._trigger('renderToEnd', evt, ui);
                } else {
                    that._trigger('renderToStart', evt, ui);

                };

                that._trigger('displayTime', evt, ui);
            },

            checkOverlapping: function (evt, ui) {
                var store = self.store;
                self.checkOverlapping();
                if (store.isOverlapped) {
                    self.toggleHelpersOverlapped(true);
                } else {
                    self.toggleHelpersOverlapped(false);
                }
            },
            renderToEnd: function (evt, ui) {
                var o = self.options,
                    store = self.store,
                    that = $(this).resizeEvents('instance'),
                    mousePosition = self.getCeilPosition(ui.mousePosition),
                    cellDataUnderMouse = self._getCellDataByPosition(mousePosition),
                    cellTime = cellDataUnderMouse.time,
                    cellCoords = cellDataUnderMouse.coordinates,
                    $parent = that.options.container,
                    eventIdAttr = self.options.eventIdAttr,
                    eventId = $(this).attr(eventIdAttr),
                    events = self._getEventsObjsById(eventId),
                    prevEvent = self._getEventsObjsById(eventId)[store.prevDay],
                    activeHelper = store.helpers[cellTime.day],
                    prevHelper = store.helpers[store.prevDay],
                    startDay = +store.startDate.day,
                    endDay = +store.endDate.day,
                    weekDays = self.options.weekDays,
                    borderWidth = self.getBorderWidth(),
                    parentHeight = that.pHeight - borderWidth,
                    eventCoords, cellGeometry, event, finishCell,
                    cssRules, finishCellCoords;

                function createHelper(cssObj) {
                    var currentHelper,
                        baseRules = {
                            position: 'absolute',
                            'z-index': 90,
                        };

                    cssObj = $.extend(true, {}, baseRules, cssObj);

                    currentHelper = $('<div>').addClass(o.eventHelperClass)
                        .attr(eventIdAttr, eventId)
                        .append($(o.helperTimeTemplate))
                        .css(cssObj);

                    return currentHelper;
                }

                self._removeHelpers();
                store.helpers = {};

                if (self.isStartDayLate()) {
                    cssRules = {
                        top: cellCoords.top,
                        height: that.pHeight - cellCoords.top,
                        width: cellCoords.width,
                        left: cellCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    that.updateHelperGeometry(cssRules);

                    $parent.append(that.helper);
                    self.addHelper(that.helper, startDay);
                    self.setHelperStartClass(that.helper);

                    for (var eventObj,
                            cssRules,
                            $helperclone,
                            start = ++startDay,
                            finish = ++endDay; start != finish; start++) {

                        if (start == weekDays.length) {
                            start = 0;
                        }
                        event = events[start] instanceof Array ? events[start][1] : events[start];
                        cellGeometry = self.getCellGeometryByDay(start);
                        cssRules = {
                            top: borderWidth,
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        if (start == finish - 1) { //Last item
                            eventCoords = event.coordinates;

                            finishCellCoords = {
                                top: eventCoords.top + eventCoords.height,
                                left: eventCoords.left
                            }; // to normalize event end appearance if event has minutes

                            finishCell = self._getCellDataByPosition(finishCellCoords, start);

                            cssRules.top = borderWidth;
                            cssRules.height = finishCell.coordinates.top + finishCell.coordinates.height - borderWidth;
                        }

                        $helperclone = createHelper(cssRules);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, start);
                        start == finish - 1 ? self.setHelperEndClass($helperclone) : null;

                    }

                } else if (self.isTheSameDay() && self.isStartHourLate()) {
                    var mainHelperCss, eventEndHelper;

                    event = events[endDay] instanceof Array ? events[endDay][1] : events[endDay];
                    eventCoords = event.coordinates;

                    finishCellCoords = {
                        top: eventCoords.top + eventCoords.height,
                        left: eventCoords.left
                    }; // to normalize event end appearance if event has minutes

                    finishCell = self._getCellDataByPosition(finishCellCoords, endDay);

                    mainHelperCss = {
                        top: cellCoords.top,
                        height: parentHeight - cellCoords.top + borderWidth,
                        width: cellCoords.width,
                        left: cellCoords.left,
                    };

                    if (cellTime.fullHour - finishCell.time.fullHour == 1) { //if difference between start and end == 1 hour
                        mainHelperCss.top = cellCoords.top + cellCoords.height + borderWidth;
                        mainHelperCss.height = mainHelperCss.height - cellCoords.height - borderWidth;
                    };

                    eventEndHelper = createHelper({
                        top: borderWidth,
                        height: finishCell.coordinates.top + finishCell.coordinates.height - borderWidth,
                        width: eventCoords.width,
                        left: eventCoords.left
                    });

                    $parent.append(eventEndHelper);

                    self.addHelper(eventEndHelper, startDay);
                    self.setHelperEndClass(eventEndHelper);

                    for (var cssRules,
                            $helperclone,
                            start = ++startDay,
                            finish = endDay; start != finish; start++) {

                        if (start == weekDays.length) {
                            start = 0;
                        }

                        cellGeometry = self.getCellGeometryByDay(start);
                        cssRules = {
                            top: borderWidth,
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        $helperclone = createHelper(cssRules)
                        $parent.append($helperclone);
                        self.addHelper($helperclone, start);

                        if (((finish + 1) % weekDays.length) == start) {

                            that.helper = createHelper(mainHelperCss);
                            self.addHelper(that.helper, endDay);

                            if (mainHelperCss.top < parentHeight) {
                                self.setHelperStartClass(that.helper);
                            } else {
                                mainHelperCss.height = 0;
                                self.setHelperStartClass($helperclone);

                            }

                            that.updateHelperGeometry(mainHelperCss);
                            $parent.append(that.helper);

                        }

                    }
                } else if (self.isTheSameDay()) {

                    event = events[endDay] instanceof Array ? events[endDay][1] : events[endDay];
                    eventCoords = event.coordinates;

                    finishCellCoords = {
                        top: eventCoords.top + eventCoords.height,
                        left: eventCoords.left
                    };

                    finishCell = self._getCellDataByPosition(finishCellCoords, endDay);

                    cssRules = {
                        top: cellCoords.top,
                        height: (finishCell.coordinates.top + finishCell.coordinates.height) - cellCoords.top,
                        width: eventCoords.width,
                        left: eventCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    $parent.append(that.helper);
                    that.updateHelperGeometry(cssRules);
                    self.addHelper(that.helper, endDay);
                    self.setHelperStartClass(that.helper)
                        .setHelperEndClass(that.helper);

                } else {
                    event = events[endDay] instanceof Array ? events[endDay][1] : events[endDay];
                    eventCoords = event.coordinates;
                    cssRules = {
                        top: cellCoords.top,
                        height: that.pHeight - cellCoords.top,
                        width: cellCoords.width,
                        left: cellCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    $parent.append(that.helper);
                    that.updateHelperGeometry(cssRules);
                    self.addHelper(that.helper, startDay);
                    self.setHelperStartClass(that.helper);

                    for (var eventObj,
                            finishCell,
                            $helperclone,
                            start = ++startDay,
                            finish = endDay; start <= finish; start++) {

                        cellGeometry = self.getCellGeometryByDay(start);
                        cssRules = {
                            top: borderWidth,
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        if (start == finish) {
                            finishCellCoords = {
                                top: eventCoords.top + eventCoords.height,
                                left: eventCoords.left
                            };

                            finishCell = self._getCellDataByPosition(finishCellCoords, finish);

                            cssRules.height = finishCell.coordinates.top + finishCell.coordinates.height - borderWidth;
                        }

                        $helperclone = createHelper(cssRules);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, start);
                        start == finish ? self.setHelperEndClass($helperclone) : null;

                    }
                }
            },

            renderToStart: function (evt, ui) {
                var o = self.options,
                    that = $(this).resizeEvents('instance'),
                    store = self.store,
                    mousePosition = self.getFloorPosition(ui.mousePosition),
                    cellDataUnderMouse = self._getCellDataByPosition(mousePosition),
                    cellTime = cellDataUnderMouse.time,
                    cellCoords = cellDataUnderMouse.coordinates,
                    $parent = that.options.container,
                    eventIdAttr = self.options.eventIdAttr,
                    eventId = $(this).attr(eventIdAttr),
                    events = self._getEventsObjsById(eventId),
                    startDay = +store.startDate.day,
                    endDay = +store.endDate.day,
                    weekDays = self.options.weekDays,
                    eventCoords, cellGeometry,
                    borderWidth = self.getBorderWidth(),
                    parentHeight = that.pHeight - borderWidth,
                    startCellCoords, startCell, cssRules;
                    

                function createHelper(cssObj) {
                    var baseRules = {
                        position: 'absolute',
                        'z-index': 90,
                    };

                    cssObj = $.extend(true, {}, baseRules, cssObj);

                    return $('<div>').addClass(o.eventHelperClass)
                        .attr(eventIdAttr, eventId)
                        .append($(o.helperTimeTemplate))
                        .css(cssObj);
                };

                self._removeHelpers();
                store.helpers = {};

                if (self.isStartDayLate()) {
                    cssRules = {
                        top: borderWidth,
                        height: cellCoords.top + cellCoords.height - borderWidth,
                        width: cellCoords.width,
                        left: cellCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    self.setHelperEndClass(that.helper);
                    that.updateHelperGeometry(cssRules);

                    $parent.append(that.helper);
                    self.addHelper(that.helper, endDay);

                    for (var eventObj,
                            event,
                            $helperclone,
                            start = --startDay,
                            finish = --endDay; finish != start; finish--) {

                        if (finish < 0) {
                            finish = weekDays.length - 1;
                        }
                        event = events[finish] instanceof Array ? events[finish][0] : events[finish];
                        cellGeometry = self.getCellGeometryByDay(finish);
                        cssRules = {
                            top: borderWidth,
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        if (finish == start + 1) { //Last item
                            eventCoords = event.coordinates;

                            startCellCoords = {
                                top: eventCoords.top,
                                left: eventCoords.left
                            }; // to normalize event end appearance if event has minutes

                            startCell = self._getCellDataByPosition(startCellCoords, finish);

                            cssRules.top = startCell.coordinates.top;
                            cssRules.height = parentHeight - startCell.coordinates.top + borderWidth;
                        }

                        $helperclone = createHelper(cssRules);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, finish);
                        finish == start + 1 ? self.setHelperStartClass($helperclone) : null;

                    }

                } else if (!self.isTheSameHour() && self.isTheSameDay() && (self.isStartHourLate() || self.isMidnight(store.endDate))) {
                    var mainHelper,
                        mainHelperCss,
                        eventEndHelper,
                        endHelperCss;

                    event = events[startDay] instanceof Array ? events[startDay][0] : events[startDay];
                    eventCoords = event.coordinates;

                    startCellCoords = {
                        top: eventCoords.top,
                        left: eventCoords.left
                    }; // to normalize event end appearance if event has minutes

                    startCell = self._getCellDataByPosition(startCellCoords, startDay);
                    mainHelperCss = {
                        top: borderWidth,
                        height: cellCoords.top + cellCoords.height - borderWidth,
                        width: cellCoords.width,
                        left: cellCoords.left
                    };

                    if (startCell.time.fullHour - cellTime.fullHour == 1) { //if difference between start and end == 1 hour
                        mainHelperCss.height = mainHelperCss.height - cellCoords.height - borderWidth;
                    };

                    endHelperCss = {
                        top: startCell.coordinates.top,
                        height: that.pHeight - startCell.coordinates.top,
                        width: eventCoords.width,
                        left: eventCoords.left
                    };

                    eventEndHelper = createHelper(endHelperCss);
                    self.setHelperStartClass(eventEndHelper);
                    $parent.append(eventEndHelper);


                    self.addHelper(eventEndHelper, endDay);

                    for (var cssRules,
                            $helperclone,
                            start = ++startDay,
                            finish = endDay; true; start++) {

                        start = start % weekDays.length;

                        if (start == finish) {

                            break;
                        };

                        cellGeometry = self.getCellGeometryByDay(start);
                        cssRules = {
                            top: self.getBorderWidth(),
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        $helperclone = createHelper(cssRules);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, start);

                        if (((start + 1) % weekDays.length) == finish) {
                            that.helper = createHelper(mainHelperCss);
                            self.addHelper(that.helper, endDay);

                            if (mainHelperCss.height >= cellCoords.height) {
                                self.setHelperEndClass(that.helper);
                            } else {
                                mainHelperCss.height = 0;
                                self.setHelperEndClass($helperclone);
                            }

                            that.updateHelperGeometry(mainHelperCss);
                            $parent.append(that.helper);
                        }

                    }
                } else if (self.isTheSameDay()) {
                    event = events[endDay] instanceof Array ? events[endDay][0] : events[endDay];
                    eventCoords = event.coordinates;

                    startCellCoords = {
                        top: eventCoords.top,
                        left: eventCoords.left
                    }; // to normalize event end appearance if event has minutes

                    startCell = self._getCellDataByPosition(startCellCoords, endDay);
                    cssRules = {
                        top: startCell.coordinates.top,
                        height: (cellCoords.top + cellCoords.height) - startCell.coordinates.top,
                        width: eventCoords.width,
                        left: eventCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    self.setHelperStartClass(that.helper)
                        .setHelperEndClass(that.helper);

                    $parent.append(that.helper);

                    that.updateHelperGeometry(cssRules);
                    self.addHelper(that.helper, endDay);

                } else {
                    var event = events[startDay] instanceof Array ? events[startDay][0] : events[startDay];
                    eventCoords = event.coordinates;

                    cssRules = {
                        top: borderWidth,
                        height: cellCoords.top + cellCoords.height - borderWidth,
                        width: cellCoords.width,
                        left: cellCoords.left
                    };

                    that.helper = createHelper(cssRules);
                    self.setHelperEndClass(that.helper);
                    $parent.append(that.helper);
                    that.updateHelperGeometry(cssRules);
                    self.addHelper(that.helper, endDay);

                    for (var $helperclone,
                            start = startDay,
                            finish = --endDay; finish >= start; finish--) {

                        cellGeometry = self.getCellGeometryByDay(finish);
                        cssRules = {
                            top: borderWidth,
                            left: cellGeometry.left,
                            width: cellGeometry.width,
                            height: parentHeight
                        };

                        if (finish == start) {
                            startCellCoords = {
                                top: eventCoords.top,
                                left: eventCoords.left
                            }; // to normalize event end appearance if event has minutes

                            startCell = self._getCellDataByPosition(startCellCoords, finish);

                            cssRules.top = startCell.coordinates.top;
                            cssRules.height = that.pHeight - startCell.coordinates.top;
                        }

                        $helperclone = createHelper(cssRules);
                        $parent.append($helperclone);
                        self.addHelper($helperclone, finish);
                        start == finish ? self.setHelperStartClass($helperclone) : null;

                    }
                }
            },

            stop: function (evt, ui) {
                var that,
                    store,
                    event,
                    endDay,
                    eventId,
                    startDay,
                    endHelper,
                    endCellObj,
                    startHelper,
                    startCellObj,
                    endDayPosition,
                    startDayPosition;

                that = $(this).resizeEvents("instance");
                store = self.store;
                eventId = self.getEventId($(this));

                $(this).dragEvents({
                    disabled: false
                });

                self._removeHelpers();

                if (!store.startDate || !store.endDate) {
                    return;
                }

                event = {
                    from: store.startDate,
                    to: store.endDate,
                    id: eventId
                };

                if (!store.isOverlapped) {

                    store.updatedTime = self.getTimeSlotInfo(event);

                    self._trigger('onTimeSlotMoved', evt, {
                        oldTime: store.oldTime,
                        currentTime: store.updatedTime,
                        event: event
                    });
                } else {
                    self._trigger('onTimeSlotBusy', evt, event);
                }

                self._discardValues();


            },
        })
    },

    _discardValues: function () {
        var store = this.store;
        store.prevDay = undefined;
        store.isOverlapped = undefined;
        store.startDate = undefined;
        store.endDate = undefined;
        store.oldTime = undefined;
        store.updatedTime = undefined;
    },

    _removeHelpers: function () {
        var store = this.store;
        var activeDays = Object.keys(store.helpers);

        activeDays.forEach(function (dayOrder) {
            if (store.helpers[dayOrder] instanceof Array) {
                store.helpers[dayOrder].forEach(function (helper) {
                    $(helper).remove()
                });
                return;
            }
            $(store.helpers[dayOrder]).remove()
        });
        store.helpers = undefined;
    },

    getEventId: function ($element) {
        return $element.attr(this.options.eventIdAttr);
    },

    updateEventsPosition: function (event) {
        var $events = this._get$EventsById(event.id);


        $events.each(function (_, event) {
            $(event).remove()
        });

        this._updateEvent(event.id, event);
        this.renderEvent(event);
    },

    cleanSlots: function () {
        this.forEachEvent(function (eventObj, dayOrder) {
            var $event = eventObj.$event;

            $event.remove();
        });

        this.store.events = [];
        this.store.daysSchedule = undefined;
    },



    updateDaysSchedule: function (id) {
        var store,
            eventDays,
            prevSchedule,
            updatedSchedule;

        store = this.store;
        prevSchedule = store.daysSchedule;
        updatedSchedule = {};
        eventDays = Object.keys(store.daysSchedule);

        eventDays.forEach(function (dayOrder) {
            prevSchedule[dayOrder].forEach(function (eventObj) {

                if (eventObj.id != id) {
                    if (!updatedSchedule[dayOrder]) {
                        updatedSchedule[dayOrder] = [];
                    }

                    updatedSchedule[dayOrder].push(eventObj);
                }
            })
        });

        store.daysSchedule = updatedSchedule;
    },

    _getTimeByPosition: function (position, day) {

        var cellUnderMouse = this._getCellDataByPosition(position, day ? day.toString() : undefined);

        return cellUnderMouse ? $.extend(true, {}, cellUnderMouse.time) : undefined;
    },

    _getEndTimeByPosition: function (position, day) {
        var nextCellData,
            cellPosition,
            parentHeight,
            weekDaysLen,
            cellUnderMouse;

        weekDaysLen = this.options.weekDays.length;
        cellUnderMouse = this._getCellDataByPosition(position, day ? day.toString() : undefined);

        if (cellUnderMouse) {
            parentHeight = this._get$EventSection().height();
            cellPosition = $.extend(true, {}, cellUnderMouse.coordinates);
            cellPosition.top += (cellPosition.height + this.getBorderWidth());
            if (cellPosition.top >= parentHeight) {
                cellPosition.top = this.getBorderWidth();
            }
            nextCellData = this._getCellDataByPosition(cellPosition, day ? day.toString() : undefined);

            if (nextCellData && this.isMidnight(nextCellData.time)) {
                nextCellData = {
                    time: $.extend(true, {}, this.Date({
                        hour: '12:00 am',
                        day: nextCellData.time.day + 1 >= weekDaysLen ? 0 : nextCellData.time.day + 1
                    }))
                }
            }

        }

        return nextCellData ? $.extend(true, {}, nextCellData.time) : undefined;

    },

    _updateEvent: function (eventId, eventData) {
        var event = this._getEventById(eventId);

        this.updateDaysSchedule(eventId);

        $.extend(event, eventData);
    },

    _getCellDataByPosition: function (position, day) {
        var cellObj,
            cellCoordsArr,
            cellBorderWidth,
            recalculatedPosition;

        cellCoordsArr = this._getCachedCoordinates(day);

        if (!position) {
            return;
        }

        function isBetweenXBoundaries(cellCoords) {
            return (cellCoords.left <= position.left) && ((cellCoords.left + cellCoords.width) >= position.left);
        }

        function isBetweenYBoundaries(cellCoords) {
            return (cellCoords.top <= position.top) && ((cellCoords.top + cellCoords.height) >= position.top);
        }

        if (!cellCoordsArr)
            return;

        cellBorderWidth = this.getBorderWidth();
        cellObj = cellCoordsArr.filter(function (cellObj) {

            return isBetweenXBoundaries(cellObj.coordinates) &&
                isBetweenYBoundaries(cellObj.coordinates);
        })[0];

        if (cellObj) {
            recalculatedPosition = $.extend(true, {}, cellObj);
            recalculatedPosition.coordinates.top += cellBorderWidth;
            recalculatedPosition.coordinates.height -= cellBorderWidth;
        }
        return recalculatedPosition
    },

    getMousePosition: function (evt) {
        var $eventSection,
            eventSectionOffset;

        $eventSection = this._get$EventSection();
        eventSectionOffset = $eventSection.offset();

        return {
            top: evt.pageY - eventSectionOffset.top,
            left: evt.pageX - eventSectionOffset.left
        }

    },
    _destroy: function () {
        this.forEachEvent(function (eventObj, _) {
            var $event,
                dragEventsInst,
                resizeEventsInst;

            $event = eventObj.$event;
            dragEventsInst = $event.data('customDragEvents');
            resizeEventsInst = $event.data('customResizeEvents');
            if (dragEventsInst) {
                dragEventsInst.destroy();
            };

            if (resizeEventsInst) {
                resizeEventsInst.destroy();
            };
        });

        function resetAllStore(obj) {
            Object.keys(obj).forEach(function (prop) {
                if (typeof obj[prop] == 'object') {
                    resetAllStore(obj[prop])
                } else {
                    obj[prop] = undefined;
                }
            })
        };


        resetAllStore(this.store);
    }

})