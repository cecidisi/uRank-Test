var TagBox = (function(){

    var $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagboxContainerClass = 'urank-tagbox-container',
        tagInBoxClass = 'urank-tagbox-tag',
        tagDeleteButtonClass = 'urank-tagbox-tag-delete-button',
        tagWeightsliderClass = 'urank-tagbox-tag-weight-slider',
        weightSliderRangeClass = '.urank-tagbox-tag-weight-slider-range',
        weightSliderHandleClass = 'urank-tagbox-tag-weight-slider-handle';
    //  Id prefix
    var tagIdPrefix = '#urank-tag-';
    //  Attribute
    var tagPosAttr = 'tag-pos';
    //  Custom Event
    var tagBoxChangeEvent = 'tagBoxChange';


    var _this;

    function Tagbox(arguments) {

        _this = this;
        s = $.extend({
            root: '',
            //colorScale: function(){},
            droppableClass: 'urank-tagcloud-tag',
            onChange: function(selectedKeywords){},
            onTagDropped: function(index, queryTermColor){},
            onTagDeleted: function(index){},
            onTagWeightchanged: function(){},
            onTagInBoxMouseEnter: function(index){},
            onTagInBoxMouseLeave: function(index){},
            onTagInBoxClick: function(index){}
        }, arguments);

        this.selectedKeywords = [];
        this.actionLog = {};  // fields: action, keyword, color, oldWeight, newWeight, timestamp -- not all of them used for every case

        this.droppableOptions = {
            tolerance: 'touch',
            drop: function(event, ui){
                setTimeout(function() {
                    $(ui.draggable).draggable("destroy");
                }, 0);
                s.onTagDropped.call(this, $(ui.draggable).attr(tagPosAttr));
                $root.trigger(tagBoxChangeEvent);
            }
        };

        this.sliderOptions = {
            orientation: 'horizontal',
            animate: true,
            range: "min",
            min: 0,
            max: 1,
            step: 0.1,
            value: 1,
            start: function(event, ui) {},
            slide: function(event, ui) {

                var $tag  = $(this.parentNode);
                var color = $tag.data('queryTermColor');
                $tag.css("background", "rgba("+ hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color) + "," + ui.value + ")");
            },
            stop: function(event, ui) {

                var term = $(this.parentNode).getText(),
                    indexToChange = _.findIndex(_this.selectedKeywords, function(sk){ return sk.term == term });

                _this.selectedKeywords[indexToChange].weight = ui.value;
                $root.trigger(tagBoxChangeEvent);
            }
        };

        $(s.root).addClass(tagboxContainerClass)
    }



    var _build = function() {
        $root = $(s.root).addClass(tagboxContainerClass)
        .on(tagBoxChangeEvent, function(){
            s.onChange.call(this, _this.selectedKeywords)   // Bind onChange event handler for custom event
        })
        .droppable(this.droppableOptions);                   // bind droppable behavior to tag box;
    };


    var _clear = function() {
        $root.empty();
        $('<p></p>').appendTo($root).text(STR_DROP_TAGS_HERE);
        //TAGCLOUD.updateTagColor();
    };


    var _dropTag = function(index, color){
        var $tag = $(tagIdPrefix + '' + index);
        $root.find('p').remove();

        if ($tag.hasClass(s.droppableClass)) {

            // Append dragged tag to tag box
            $root.append($tag);

            // Change tag's class
            $tag.removeClass().addClass(tagInBoxClass);

            // Append "delete" button
            $('<span></span>').appendTo($tag).addClass(tagDeleteButtonClass);

            // Add new div to make it a slider
            var weightSlider = $("<div class='" + tagWeightsliderClass + "'></div>").appendTo($tag).slider(this.sliderOptions);
            weightSlider.find('div').addClass(weightSliderRangeClass);
            weightSlider.find('a').addClass(weightSliderHandleClass);

            // Retrieve color in weightColorScale for the corresponding label
           // var color = s.colorScale($tag.attr('stem'));
            var rgbSequence = hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color);

            // Set tag's style
            $tag.data('queryTermColor', color).css({
                background: 'rgba(' + rgbSequence + ', 1)',
                color: '',
                border: 'solid 2px ' + color
            }).off().on({
                mouseenter: s.onTagInBoxMouseEnter($tag.attr(tagPosAttr)),
                mouseleave: s.onTagInBoxMouseLeave($tag.attr(tagPosAttr)),
                click: s.onTagInBoxClick($tag.attr(tagPosAttr))
            }).on('click', '.'+tagDeleteButtonClass, $tag.attr(tagPosAttr), function(event){     //  Event handler for delete button
                event.stopPropagation(); s.onTagDeleted.call(this, event.data);
            });

            var term = $tag.getText(), stem = $tag.attr('stem');
            _this.selectedKeywords.push({ term: term, stem: stem, weight: 1 });
        }
    };


    var _deleteTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index),
            term = $tag.getText();
        $tag.find('.'+tagDeleteButtonClass).remove();
        $tag.find('.'+tagWeightsliderClass).remove();

        var indexToDelete = _.findIndex(_this.selectedKeywords, function(sk){ return sk.term == term });
        _this.selectedKeywords.splice(indexToDelete, 1);
        $root.trigger(tagBoxChangeEvent);
    };


    var _destroy = function() {
        $root.empty().removeClass(tagboxContainerClass).droppable('destroy');
    };

    // Prototype
    Tagbox.prototype = {
        build: _build,
        clear: _clear,
        dropTag: _dropTag,
        deleteTag: _deleteTag,
        destroy: _destroy
    };

    return Tagbox;
})();



/*    var _updateTagColorScale = function(){

        // Clear color scale domain
        weightColorScale.domain([]);

        for(var i = 0; i < selectedTags.length; i++){
            // Reasign keyword to color scale domain
            var stem = d3.select(selectedTags[i][0]).data()[0].stem;
            var aux = weightColorScale(stem);
            var rgbSequence = hexToR(aux) + "," + hexToG(aux) + "," + hexToB(aux);
            var value = $(selectedTags[i][0]).find(".div-slider").slider("value");

            d3.select(selectedTags[i][0])
            .style("background", "rgba("+ rgbSequence + ", " + value + ")")
            .style("border", "solid 0.2em " + aux);
        }
    };*/
