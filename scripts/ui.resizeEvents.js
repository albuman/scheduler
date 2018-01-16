$.widget('custom.resizeEvents', {
    options: {
        helperClass: 'resize-event_helper',
        handles: 'top, bottom',
        container: false,
        handleClass: 'resize-event__handle',
        topHandleClass: 'resize-event__top-handle',
        bottomHandleClass: 'resize-event__bottom-handle',
        zIndex: false,
        handleTemplate: false,
        grid: [0, 0],
        width: false,
        pluginInstalled: 'resizeEventInstalled',
        allowMoveRight: function () {
            return this.mousePos.left <= this.options.container.width();
        },
        allowMoveLeft: function () {
            return this.mousePos.left >= 0;
        }

    },

    _create: function () {
        this._initHandles();
        this._initEvents();
    },
    _initEvents: function () {
        var pluginInstalled = this.options.pluginInstalled;

        this.dragHelper = this._initDragging.bind(this);

        if (!this.element.data(pluginInstalled)) {
            this.element.data(pluginInstalled, true);
            this.element.on('mousedown', '.' + this.options.handleClass, this.dragHelper)
                .disableSelection();
        }

    },

    _initDragging: function (evt) {
        var options = this.options;
        this._initHelpers();
        this.pof = this.options.container.offset();
        this.pHeight = this.options.container.height();
        this._updateMousePosition(evt);

        if ($(evt.currentTarget).is('.' + options.topHandleClass)) {
            this._isTopHandleActive = true;
        } else {
            this._isBottomHandleActive = true;
        }

        this.mouseMoveHandler = this._changeHelperSize.bind(this);
        this._trigger('start', evt, this.ui());
        $(document).one('mouseup', this._destroyHandlers.bind(this));
        $(document).on('mousemove', this.mouseMoveHandler);
    },

    _changeHelperSize: function (evt) {
        this._updateMousePosition(evt);

        if (this.options.grid) {
            this._makeGridResizing(evt);
        } else {
            this._updateSizeDiff();
            this._updateHelperGeometry();
            this.helper.css(this.size);
            this._trigger('resize', evt, this.ui());
        }



    },

    _updateSizeDiff: function (evt) {
        this.sizeDiff = this._getSizeDiff();
    },

    _getSizeDiff: function () {
        return {
            top: this.originalSize.top - this.mousePos.top,
            left: this.mousePos.left - this.originalSize.left
        };
    },

    _updateMousePosition: function (evt) {
        this.mousePos = this.getMousePosition(evt);
    },

    getMousePosition: function (evt) {
        return {
            top: evt.pageY - this.pof.top,
            left: evt.pageX - this.pof.left
        };

    },

    updateHelperGeometry: function (cssObj) {
        this.size = $.extend(true, {
            top: this.mousePos.top,
            left: this.size.left,
            height: this.size.height,
            width: this.size.width,
            position: 'absolute',
            'z-index': this.options.zIndex,

        }, cssObj);
    },

    updateGridSizes: function (x, y) {
        this.grid = [x, y];
    },

    _makeGridResizing: function (evt) {
        var options = this.options;
        var grid = this.grid || options.grid;
        var sizeDiff = this._getSizeDiff();
        var orSize = this.originalSize;
        var mousePosition = this.getMousePosition(evt);

        this.grid = typeof grid === 'number' ? [grid, grid] : grid;
        var size = this.fakeSize || this.size;
        var x = grid[0], y = grid[1];


        if (this._isTopHandleActive) {

            if (mousePosition.top < size.top && (size.top > 0)) {
                size.top = size.top - y;
                size.height = size.height + y;
                this._trigger('resize', evt, this.ui());
            } else if (mousePosition.top > (size.top + y)) {
                size.top = size.top + y;
                size.height = size.height - y;
                this._trigger('resize', evt, this.ui());
            }

            if (mousePosition.left <= size.left && options.allowMoveLeft.call(this)) {
                // size.left = size.left - x;
                // size.width = size.width;
                this._trigger('moveLeft', evt, this.ui());
            } else if ((mousePosition.left >= (size.left + x)) && options.allowMoveRight.call(this)) {
                // size.left = size.left + x;
                // size.width = size.width;
                this._trigger('moveRight', evt, this.ui());
            }

        } else {

            if ((mousePosition.top > (size.top + size.height)) && (mousePosition.top < this.pHeight)) {
                size.top = size.top;
                size.height = size.height + y;
                this._trigger('resize', evt, this.ui());
            } else if (mousePosition.top < (size.top + size.height - y)) {
                size.top = size.top;
                size.height = size.height - y;
                this._trigger('resize', evt, this.ui());
            }

            if (mousePosition.left <= size.left && options.allowMoveLeft.call(this)) {
                // size.left = size.left - x;
                // size.width = size.width;
                this._trigger('moveLeft', evt, this.ui());
            } else if ((mousePosition.left >= (size.left + x)) && options.allowMoveRight.call(this)) {
                // size.left = size.left + x;
                // size.width = size.width;
                this._trigger('moveRight', evt, this.ui());
            }
        }

        if (size.height <= 0 || size.height > this.pHeight || size.top <= 0) {
            return;
        }

        this.helper.css(this.size);
        this._trigger('updatedHelperGeometry', evt, this.ui());

    },

    _updateElementGeometry: function () {
        var options = this.options;
        var elPos = this.element.position();
        var elHeight = this.element.outerHeight();
        var elWidth = this.element.outerWidth();

        this.originalSize = {
            position: "absolute",
            "z-index": options.zIndex || 90,
            top: elPos.top,
            left: elPos.left,
            width: elWidth,
            height: elHeight
        }

        this.size = $.extend(true, {}, this.originalSize);

    },

    _get$Handle: function () {
        var options = this.options;

        return $(options.handleTemplate || '<span>');

    },

    _initHelpers: function () {
        this._updateElementGeometry();
        this.options.container = this.options.container || this.element.parent();
        this.helper = $('<div class=' + this.options.helperClass + '>');
        this.helper.css(this.originalSize);
        this.helper.disableSelection();
        this.options.container.append(this.helper);
    },

    _initHandles: function () {
        var options = this.options;
        var hasTopHandle = /top/.test(options.handles);
        var hasBottomHandle = /bottom/.test(options.handles);

        if (hasTopHandle) {
            var $topHandle = this._get$Handle();
            $topHandle
                .addClass(options.handleClass)
                .addClass(options.topHandleClass);
            this.element.append($topHandle);
        }

        if (hasBottomHandle) {
            var $bottomHandle = this._get$Handle();
            $bottomHandle
                .addClass(options.handleClass)
                .addClass(options.bottomHandleClass);
            this.element.append($bottomHandle);
        }
    },


    _destroy: function (evt) {
        $(this).off('mousedown', '.' + this.options.handleClass, this.dragHelper);

        this._resetValues();

    },

    _destroyHandlers: function (evt) {
        this._trigger('stop', evt, this.ui());

        this._removehelper()
            ._disableEvents()
            ._resetValues();
    },
    _removehelper: function () {
        if (this.helper)
            this.helper.remove();

        return this;
    },
    _disableEvents: function () {
        $(document).off('mousemove', this.mouseMoveHandler);

        return this;
    },

    _resetValues: function () {
        this._isTopHandleActive = undefined;
        this._isBottomHandleActive = undefined;
        this.helper = undefined;
        this.mousePos = undefined;
        this.size = undefined;
        this.originalSize = undefined;

        return this;
    },
    ui: function () {
        return {
            element: this.element,
            helper: this.helper,
            currentSize: this.size,
            originalSize: this.originalSize,
            mousePosition: this.mousePos
        };
    }

})