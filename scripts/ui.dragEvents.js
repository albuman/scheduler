$.widget('custom.dragEvents', $.ui.draggable, {
    _mouseDrag: function (event, noPropagation) {

        // reset any necessary cached properties (see #5009)
        if (this.hasFixedAncestor) {
            this.offset.parent = this._getParentOffset();
        }

        //Compute the helpers position
        // this.position = this._generatePosition(event, true);
        // this.positionAbs = this._convertPositionTo("absolute");


        //Call plugins and callbacks and use the resulting position if something is returned
        // if (!noPropagation) {
        var ui = this._uiHash();
        
        //if(/y/.test(this.options.axis)){
            this.updatePosition(event, ui);
        //}

        if (this._trigger("drag", event, ui) === false) {
            // this._mouseUp(new $.Event("mouseup", event));
            // return false;
        }
        // }




        // this.helper[0].style.left = this.position.left + "px";
        // this.helper[0].style.top = this.position.top + "px";

        if ($.ui.ddmanager) {
            $.ui.ddmanager.drag(this, event);
        }

        return false;
    },
    isHelperInContainment: function (position) {
        var helper,
            containment,
            helperHeight;

        helper = this.helper;
        helperHeight = helper.outerHeight();
        containment = $(this.options.containment);

        return ((position.top) >= 0) &&
            (((position.top) + helperHeight) <= containment.outerHeight());
    },
    updatePosition: function (evt, ui) {
        var grid,
            gridY,
            mousePosition;

        grid = this.options.grid;
        gridY = grid[1];
        mousePosition = this.getMousePosition(evt);


        if ((this.helperPosition.top + gridY) < (mousePosition.top - this.offset.click.top)) {
            this._trigger('movedBottom', evt, ui);
        } else if ((this.helperPosition.top - gridY) >= (mousePosition.top - this.offset.click.top)) {
            this._trigger('movedTop', evt, ui);
        }


    },

    updateHelperPosition: function (position) {
        this.helperPosition = position;
    },

    getMousePosition: function (evt) {
        if (this.options.containment) {
            var pof = $(this.options.parent).offset();
            return {
                top: evt.pageY - pof.top,
                left: evt.pageX - pof.left
            };
        }


    },
})