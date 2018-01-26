$.widget('custom.scheduleTable', {
    options: {
        timeFormat: 12,
        workingHours: 24,
        weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        fullWeekDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        schedulerTable: 'shedule-table',
        rowClass: '',
        daySectionClass: 'shedule-table__days-section',
        hourSectionClass: 'shedule-table__hours-section',
        hoursTableClass: '',
        eventSectionClass: 'shedule-table__events-section',
        eventsTableClass: 'shedule-table__events-table',
        hourCellClass: '',
        eventItemClass: '',
        placeholderClass: 'shedule-table__placeholder',
        dayColumns: {},
        cachedCoordinates: {},
        table: '<table>',
        tableRow: '<tr>',
        tableCell: '<td>',

    },
    _create: function () {
        var table = this.options.table,
            tableRow = this.options.tableRow,
            schedulerTable = this.options.schedulerTable

        this.element.empty();
        var $scheduvarable = $(table).addClass(schedulerTable);
        var $contentRow = $(tableRow);

        this.element.append(
            $scheduvarable.append(
                this._getBuilt$DaySection()
            ).append(
                $contentRow.append(
                    this._getBuilt$HourSection()
                ).append(
                    this._getBuilt$Events()
                    )
                )
        ).disableSelection();

    },
    _setOptions: function (options) {
        $.extend(this.options, options);
    },
    updateSectionHeights: function () {
        this.$eventSection.height(this.$hourSection.outerHeight());
    },
    _get$EventSection: function () {
        return this.element.find('.' + this.options.eventSectionClass);
    },
    _get$HourSection: function () {
        return this.element.find('.' + this.options.hourSectionClass);
    },
    getColumnByDay: function (weekDayOrder) {
        return this.options.dayColumns[weekDayOrder]
    },
    _getCachedCoordinates: function (day) {
        var self = this;

        if (day) {
            return this.options.cachedCoordinates[day];
        }

        var dayKeys = Object.keys(this.options.cachedCoordinates);

        return dayKeys.reduce(function (coordsArray, dayColumn) {
            self.options.cachedCoordinates[dayColumn].forEach(function (cellCoords) {
                coordsArray.push(cellCoords);
            })

            return coordsArray;
        }, [])
    },
    getCellByTime: function (time) {
        var dayColumn = this.getColumnByDay(time.day);
        var hourObj = this.getHourObjFromString(time);
        var cell = dayColumn.filter(function (cell) {
            var cellTime = this.getCellTime(cell);
            return cellTime.hour == hourObj.hour && cellTime.timePeriod == hourObj.timePeriod;
        }, this)[0];

        return cell;
    },
    getCellTime: function (cellData) {
        return $.extend(true, {}, cellData.time);
    },
    getCellCoords: function (cellData) {
        var cellTime = cellData.time;
        var columnCoords = this._getCachedCoordinates(cellTime.day);
        return columnCoords.reduce(function (result, cellObj) {
            var cellObjTime = cellObj.time;
            if (
                cellTime.hour == cellObjTime.hour &&
                cellTime.day == cellObjTime.day &&
                cellTime.timePeriod == cellObjTime.timePeriod
            )
                result = cellObj.coordinates;

            return result;
        }, {})
    },
    getCellGeometryByDay: function (dayOrder) {
        var columnCoords = this._getCachedCoordinates(dayOrder);
        return columnCoords ? columnCoords[0].coordinates : undefined;
    },
    updateCoordinates: function () {
        var self = this;
        var $eventSection = this._get$EventSection();
        var dayColumns = this.options.dayColumns;
        var dayKeys = Object.keys(dayColumns);

        dayKeys.forEach(function (dayKey) {
            self.options.cachedCoordinates[dayKey] = [];
            dayColumns[dayKey].forEach(function (cellData) {
                var cellPosition = cellData.cell.position();
                var cellTime = cellData.time;

                self.options.cachedCoordinates[dayKey].push({
                    cell: cellData.cell,
                    coordinates: {
                        top: Number(cellPosition.top.toFixed(1)),
                        left: Number(cellPosition.left.toFixed(1)),
                        width: Number(Math.floor(cellData.cell.outerWidth())),
                        height: Number(Math.floor(cellData.cell.outerHeight()))
                    },
                    time: cellTime
                });
            })
        })
    },

    Date: function (timeObj) {
        var self = this,
            day = timeObj.day,
            hourObj = self.getHourObjFromString(timeObj);

        return {
            hour: hourObj.hour,
            fullHour: (function () {
                var amPmHourReg = /^(\d+)\s?:?\s?(\d+)?\s?([a-zA-Z]{2})?$/;
                if (amPmHourReg.test(timeObj.hour)) {
                    var convertedHour;

                    if (hourObj.timePeriod == 'pm') {
                        convertedHour = Number(hourObj.hour) + 12;
                        convertedHour = convertedHour == 24 ? '12' : convertedHour.toString();

                    } else if (hourObj.timePeriod == 'am' && hourObj.hour == '12') {
                        convertedHour = '00';
                    } else {
                        convertedHour = hourObj.hour;
                    }
                    return convertedHour;

                }
            })(),
            minutes: hourObj.minutes,
            day: day,
            dayName: this.options.weekDays[day],
            fullDay: this.options.fullWeekDays[day],
            timePeriod: hourObj.timePeriod

        }
    },
    getHourObjFromString: function (hourObj) {
        var time,
            hour,
            minutes,
            timeReg,
            timePeriod,
            hours24Reg;

        timeReg = /^(\d+)\s?:?\s?(\d+)?\s?([a-zA-Z]{2})?$/;
        hour = (hourObj.hour !== undefined) && hourObj.hour.toString();

        if (hour && timeReg.test(hour)) {
            time = hourObj.hour.toString().match(timeReg);
            hour = time[1];
            minutes = hourObj.minutes || time[2] || '00';
            timePeriod = hourObj.timePeriod || time[3];

            if (String(minutes).length < 2) {
                minutes = '0' + minutes;
            };

            if (!timePeriod) {
                if (Number(hour) > 12) {
                    hour -= 12;
                    timePeriod = 'pm';
                } else if (Number(hour) == 12) {
                    timePeriod = 'pm';
                } else {
                    timePeriod = 'am';
                }
            }

            if (Number(hour) == 0) {
                hour = '12';
                timePeriod = 'am';
            };

            if (Number(hour) < 10 && String(hour).length < 2) {
                hour = '0' + hour;
            };

            return {
                hour: hour,
                minutes: minutes,
                timePeriod: timePeriod
            }
        } else {
            console.error('Nothing passed to parse Date or passed not valid string');
        }

    },



    getHourArrayIndex: function (hour) {
        var hourArray = this.getHoursArray();

        return hourArray.indexOf(hour);
    },

    get12HoursFormatArr: function () {
        var self = this;

        return ['am', 'pm'].reduce(function (memo, timeInterval) {
            memo.push({
                hour: self.options.timeFormat.toString(),
                timePeriod: timeInterval
            }); //to start from 12:00 a.m.

            for (var hour = 1; hour < self.options.timeFormat; hour++) {
                memo.push({
                    hour: hour < 10 ? '0' + hour : hour,
                    timePeriod: timeInterval
                });
            }

            return memo;
        }, [])
    },

    get24HoursFormatArr: function () {
        var hoursArr = [];
        for (var hour = 0; hour < this.options.timeFormat; hour++) {
            hoursArr.push({
                hour: hour < 10 ? '0' + hour + ' : 00' : hour + ' : 00'
            });
        }

        return hoursArr;
    },

    getHoursArray: function () {
        switch (this.options.timeFormat) {
            case 12:
                return this.get12HoursFormatArr();
            case 24:
                return this.get24HoursFormatArr();
            default:
                console.log('Expected 12 or 24 hours format, but received' + this.timeFormat);
                return [];
        }
    },

    _getHourOrder: function (hourObj) {
        var hoursArr = this.getHoursArray();

        return hoursArr.reduce(function (memo, item, idx) {
            if (hourObj.hour == item.hour && hourObj.timePeriod == item.timePeriod) {
                memo = idx;
            }
            return memo;
        }, -1);
    },

    _getBuilt$DaySection: function () {
        var daySectionClass = this.options.daySectionClass,
            placeholderClass = this.options.placeholderClass,
            tableRow = this.options.tableRow,
            tableCell = this.options.tableCell,
            weekDays = this.options.weekDays;

        var $daySection = $(tableRow).addClass(daySectionClass);
        var $placeholder = $(tableCell).addClass(placeholderClass).html('&nbsp;');
        $daySection.append($placeholder);

        weekDays.forEach(function (day) {
            var $dayCell = $(tableCell);

            $daySection.append(
                $dayCell.text(day)
            );
        });

        return $daySection;
    },
    _getBuilt$HourSection: function () {
        var hourSectionClass = this.options.hourSectionClass,
            hoursTableClass = this.options.hoursTableClass,
            hourCellClass = this.options.hourCellClass,
            tableCell = this.options.tableCell,
            tableRow = this.options.tableRow,
            table = this.options.table;

        var $hoursColumn = $(tableCell);
        var $hourSection = $('<div>').addClass(hourSectionClass);
        var $hoursTable = $(table).addClass(hoursTableClass);

        this.getHoursArray().forEach(function (hourObj) {
            var $hourTableRow = $(tableRow);
            var $hourTableCell = $(tableCell).addClass(hourCellClass);

            $hoursTable.append(
                $hourTableRow.append(
                    $hourTableCell.text(hourObj.hour + ' ' + hourObj.timePeriod)
                )
            );
        });

        return $hoursColumn.append(
            $hourSection.append(
                $hoursTable
            )
        );
    },

    getBorderWidth: function () {
        var cell = this._get$EventSection().find('td');
        var bottomBorder = +cell.css('border-bottom-width').replace('px', '');
        var topBorder = +cell.css('border-top-width').replace('px', '');

        return Number((bottomBorder + topBorder).toFixed(1));
    },

    _getBuilt$EventsFields: function () {
        var $eventsTableContent = $(document.createDocumentFragment());
        var cellData,
            weekDays = this.options.weekDays,
            tableCell = this.options.tableCell,
            tableRow = this.options.tableRow,
            dayColumns = this.options.dayColumns;

        for (var idx = 0, workinHours = this.getHoursArray(); idx < workinHours.length; idx++) {
            var $eventRow = $(tableRow);
            for (var i = 0; i < weekDays.length; i++) {
                var $eventCell = $(tableCell);
                if (!dayColumns[i]) {
                    dayColumns[i] = [];
                }

                cellData = {
                    cell: $eventCell,
                    time: this.Date($.extend(true, {}, { day: i }, workinHours[idx]))
                };

                dayColumns[i].push(cellData);

                $eventRow.append(
                    $eventCell.html('&nbsp;')
                );
            };
            $eventsTableContent.append(
                $eventRow
            );
        };

        return $eventsTableContent;
    },
    _getBuilt$Events: function () {
        var eventSectionClass = this.options.eventSectionClass,
            eventsTableClass = this.options.eventsTableClass,
            tableCell = this.options.tableCell,
            table = this.options.table,
            weekDays = this.options.weekDays,
            $eventsColumn = $(tableCell),
            $eventSection = $('<div>').addClass(eventSectionClass),
            $eventsTable = $(table).addClass(eventsTableClass).disableSelection();

        $eventsColumn.attr('colspan', weekDays.length);

        return $eventsColumn.append(
            $eventSection.append(
                $eventsTable.append(
                    this._getBuilt$EventsFields()
                )
            )
        );

    }
})