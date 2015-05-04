var TagCloud = (function(){

    var _this, $root = $('');
    // Settings
    var s = {};
    //  Classes
    var tagCloudContainerClass = 'urank-tagcloud-container',
        tagClass = 'urank-tagcloud-tag',
        selectedClass = 'selected',
        dimmedClass = 'dimmed',
        activeClass = 'active',
        draggingClass = 'dragging',
        keywordHintClass = 'urank-keyword-hint',
        documentHintClass = 'urank-documents-hint';
    //  Ids
    var tagIdPrefix = '#urank-tag-',
        tagPiePrefix = '#urank-tag-pie-';
    //   Attributes
    var tagPosAttr = 'tag-pos';
    //  Helpers
    var tagHoverStyle = {
            background: '-webkit-linear-gradient(top, rgb(0, 102, 255), rgb(20, 122, 255), rgb(0, 102, 255))',
            border: 'solid 1px rgb(0, 102, 255)',
            color: '#eee',
            'text-shadow': ''
        },

        draggableOptions = {
            revert: 'invalid',
            helper: 'clone',
            appendTo: '.urank-tagbox-container',
            zIndex: 999,
            start: function(event, ui){ $(this).hide(); },
            stop: function(event, ui){ $(this).show(); }
        },

        documentHintPinOptions = { top: - 6, right: -7, container: '.'+tagCloudContainerClass },

        keywordHintPintOptions = { bottom: -10, right: -7, container: '.'+tagCloudContainerClass },

        pieOptions = {
            size: { pieOuterRadius: '100%', canvasHeight: '14', canvasWidth: '14' },
            effects: {
                load: { effect: "none" },
                pullOutSegmentOnClick: { effect: 'none', speed: 0, size: 0 },
                highlightSegmentOnMouseover: false
            },
            labels: {
                inner: { format: '' },
                lines: { enabled: false}
            },
            data: {
                content: [
                    { label: 'documentsIn', value: 0, color: '#65BA20' },
                    { label: 'documentsNotIn', value: 0, color: '#fafafa' },
                ]
            },
            misc: {
                colors: { segmentStroke: '#65a620' },
                canvasPadding: { top: 0, right: 0, bottom: 0, left: 0 },
                gradient: { enabled: true, percentage: 100, color: "#888" },
            }
        };


    /// Tag Cloud root and container event handlers
    var onRootScrolled = function(event) {
        event.stopPropagation();
        var $tag = $('.'+selectedClass);
        if(_this.proxKeywordsMode) {
            $tag.find('.'+documentHintClass).css('visibility', 'hidden');
            $tag.find('.'+keywordHintClass).css('visibility', 'visible').pin(keywordHintPintOptions);
        }
        else if(_this.docHintMode) {
            $tag.find('.'+documentHintClass).css('visibility', 'visible').pin(documentHintPinOptions);
            $tag.find('.'+keywordHintClass).css('visibility', 'hidden');
        }
    };


    //  Constructor
    function TagCloud(arguments) {
        _this = this;
        s = $.extend({
            root: '',
            colorScale: function(){},
            onTagInCloudMouseEnter: function(index){},
            onTagInCloudMouseLeave: function(index){},
            onTagInCloudClick: function(index){},
            onDocumentHintClick: function(index){},
            onKeywordHintMouseEnter : function(index){},
            onKeywordHintMouseLeave : function(index){},
            onKeywordHintClick : function(index){}
        }, arguments);

        this.keywords = [];
        this.proxKeywordsMode = false;
        this.docHintMode = false;

        $(s.root).addClass(tagCloudContainerClass);
    }



    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
    * * @param {array of objects} keywords Description
    */
    var _build = function(keywords, collectionSize){
        this.keywords = keywords;
        this.collectionSize = collectionSize;

        // Empty tag container and add appropriateclass
        $root = $(s.root).empty().addClass(tagCloudContainerClass);

        this.keywords.forEach(function(k, i){
            var $tag = $('<div></div>', { class: tagClass, id: 'urank-tag-' + i, 'tag-pos': i, stem: k.stem, text: k.term }).appendTo($root);
            $tag.hide().fadeIn((i+1)*20);

            // Append pie chart section for document indicator
            var termUpperCase = k.term.toUpperCase(),
                percentage = Math.floor(k.inDocument.length/collectionSize * 100),
                tooltipMsg = k.inDocument.length + " (" + percentage + "%) documents contain " + termUpperCase + ". Click here to highlight documents";

            var $docHint = $('<div></div>', { class: documentHintClass+' hint--right hint--info hint--rounded', id: 'urank-tag-pie-' + i, 'data-hint': tooltipMsg }).appendTo($tag);
            pieOptions.data.content[0].value = k.inDocument.length;
            pieOptions.data.content[1].value = collectionSize - k.inDocument.length;
            var tagPie = new d3pie(tagPiePrefix+''+i, pieOptions);

            // Append red circle section for keywords in proximity indicator
            if(k.keywordsInProximity.length > 0) {
                tooltipMsg = k.keywordsInProximity.length + " other keywords frequently found close to " + termUpperCase + "\n Click here to lock view";
                var $proyKeywordsIndicator = $('<div></div>', { class: keywordHintClass+' hint--right hint--info hint--rounded', 'data-hint': tooltipMsg, text: k.keywordsInProximity.length}).appendTo($tag);
            }

            $tag.data({ 'originalColor': s.colorScale(k.colorCategory) });
            _this.setTagProperties($tag);
        });
        $root.scrollTo('top');
    };


    var _reset = function() {
        this.build(this.keywords, this.collectionSize);
    };


    var _setTagProperties = function($tag) {

        $tag.removeAttr('data-hint');
        if(!$tag.hasClass(draggingClass)) {
            $tag.removeClass(selectedClass)
            .css({
                background: getGradientString($tag.data('originalColor')),
                border: '1px solid ' + $tag.data('originalColor'),
                color: '', textShadow: '', cursor: ''
            });

            //  Restore non-active classes (is dimmed or just initialized)
            if(!$tag.hasClass(activeClass)) {
                $tag.removeClass(dimmedClass).addClass(activeClass)
                .off().on({
                    mousedown: function(event){
                        if(event.which == 1) {
                            $(this).addClass(draggingClass);
                            $(this).find('.'+keywordHintClass).css('visibility', '');
                            $(this).find('.'+documentHintClass).css('visibility', '');
                        }
                    },
                    mouseup: function(event){ event.stopPropagation(); $(this).removeClass(draggingClass); },
                    mouseenter: function(event){ s.onTagInCloudMouseEnter.call(this, $(this).attr(tagPosAttr)) },
                    mouseleave: function(event){ s.onTagInCloudMouseLeave.call(this, $(this).attr(tagPosAttr)) },
                    click: function(event){ event.stopPropagation(); s.onTagInCloudClick.call(this, $(this).attr(tagPosAttr)) }
                });
            }

            // Set draggable
            if($tag.is('.ui-draggable'))
                $tag.draggable('destroy');
            $tag.draggable(draggableOptions);

            //  Set keyword hint properties
            $tag.find('.'+keywordHintClass).css('visibility', '')
            .off().on({
                mouseenter: function(event){ s.onKeywordHintMouseEnter.call(this, $(this).parent().attr(tagPosAttr)) },
                mouseleave: function(event){ s.onKeywordHintMouseLeave.call(this, $(this).parent().attr(tagPosAttr)) },
                click: function(event){
                    event.stopPropagation();
                    s.onKeywordHintClick.call(this, $(this).parent().attr(tagPosAttr));
                },
                mousedown: function(event){ event.stopPropagation(); }
            });

            //  Set document hint properties
            $tag.find('.'+documentHintClass).css('visibility', '')
            .off().on({
                click: function(event){
                    event.stopPropagation();
                    s.onDocumentHintClick.call(this, $(this).parent().attr(tagPosAttr));
                },
                mousedown: function(event){ event.stopPropagation(); }
            });

        }

        return $tag;
    };



    /**
	 *	Detach tag from tag box and return it to container (tag cloud)
	 *
	 * */
    var _restoreTag = function(index){

        var $tag = $(tagIdPrefix + '' + index);
        // Change class
        $tag.removeClass().addClass(tagClass);


        this.setTagProperties($tag);

        // Re-append to tag container, in the corresponding postion
        var tagIndex = parseInt($tag.attr(tagPosAttr));
        var i = tagIndex - 1;
        var firstTagIndex = $root.find('.'+ tagClass + ':eq(0)').attr(tagPosAttr);
        // second condition checks if the tag is NOT in Tag Cloud
        while(i >= firstTagIndex && !$(tagIdPrefix + '' + i).hasClass(tagClass))
            --i;

        var oldOffset = { top: $tag.offset().top, left: $tag.offset().left};
        // Remove from tag box
        $tag = $tag.detach();

        if(i >= firstTagIndex)    // Current tag inserted after another (tag-pos == i)
            $(tagIdPrefix + '' + i).after($tag);
        else                      // Current tag inserted in first position of tag container
            $root.prepend($tag);


        var currentOffset = { top: $tag.offset().top, left: $tag.offset().left };
        // Animate tag moving from ta box to tag cloud
        $tag.css({ position: 'absolute', top: oldOffset.top, left: oldOffset.left, 'z-index': 999 });
        $tag.animate({ top: currentOffset.top, left: currentOffset.left }, 1000, 'swing', function(){
            $(this).css({ position: '', top: '', left: '', 'z-index': '' });
            //_this.setTagProperties($tag);
            $tag.draggable(draggableOptions);
        });

    };


    var _hoverTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index);
        $tag.css(tagHoverStyle);
        $tag.find('.'+documentHintClass).pin(documentHintPinOptions);
        $tag.find('.'+keywordHintClass).pin(keywordHintPintOptions);
    };


    var _unhoverTag = function(index) {
        var $tag = $(tagIdPrefix + '' + index);
        if(!$tag.hasClass(selectedClass)) {
            var color = $(tagIdPrefix + '' + index).data('originalColor');
            $tag.css({ background: getGradientString(color), border: '1px solid ' + color, color: '#111' });
        }
    };


    var _tagClicked = function(index) {};


    var _keywordHintMouseEntered = function(index) {
        var $tag = $(tagIdPrefix + '' + index),
            $redCircle = $tag.find(keywordHintClass),
            proxKeywords = _this.keywords[index].keywordsInProximity;

        $tag.siblings().each(function(i, siblingTag){
            if(_.findIndex(proxKeywords, function(proxKw){ return proxKw.stem == $(siblingTag).attr('stem') }) === -1) {
//                var color = $(siblingTag).data('originalColor');
//                var rgbaStr = 'rgba(' + hexToR(color) + ', ' + hexToG(color) + ', ' + hexToB(color) + ', 0.2)';
//                $(siblingTag).css({ background: rgbaStr, border: '1px solid ' + rgbaStr});
                $(siblingTag).css({ background: '', border: '' }).addClass(dimmedClass);
            }
        });
    };



    var _keywordHintMouseLeft = function(index) {

        if(!_this.proxKeywordsMode) {
            var $tag = $(tagIdPrefix + '' + index);
            $tag.siblings().each(function(i, siblingTag){
            var color  = $(siblingTag).data('originalColor');
            $(siblingTag).removeClass(dimmedClass)
                .css({ background: getGradientString(color, 10), border: '1px solid ' + color });
            });
        }
    };


    var _keywordHintClicked = function(index) {

        var $tag = $(tagIdPrefix + '' + index);
        $tag.addClass(selectedClass);
        $tag.find('.'+keywordHintClass).css('visibility', 'visible');
        $tag.find('.'+documentHintClass).css('visibility', 'hidden');

        $tag.siblings().each(function(i, sibling){
            var $siblingTag = $(sibling);
            $siblingTag.find('.'+keywordHintClass).off().css('visibility', 'hidden');
            $siblingTag.find('.'+documentHintClass).off().css('visibility', 'hidden');

            if($siblingTag.hasClass(dimmedClass))       // Dimmed tags get active class removed
                $siblingTag.removeClass(activeClass).off();
            else {                                      // Active tags are the ones co-occuring with the selected tag. A tooltip is added during proxKeywordsmode
                var selectedKeyword = $tag.getText();
                var currentKeyword = $siblingTag.getText();
                var numberCoOccurrences = _this.keywords[index].keywordsInProximity[$siblingTag.attr('stem')];
                var tooltip = currentKeyword + ' and ' + selectedKeyword + ' appear in proximity ' + numberCoOccurrences + ' times';
                $siblingTag.addClass('hint--right hint--rounded').attr('data-hint', tooltip);
            }
        });

        $root.on('scroll', onRootScrolled);
        _this.proxKeywordsMode = true;
    };



    var _documentHintClicked = function(index) {

        var $tag = $(tagIdPrefix+''+index);
        $tag.addClass(selectedClass);
        $tag.find('.'+documentHintClass).css('visibility', 'visible');
        $tag.find('.'+keywordHintClass).css('visibility', 'hidden');
            //.off('mouseleave')

        $tag.siblings().each(function(i, siblingTag){
            $(siblingTag).removeClass(activeClass).addClass(dimmedClass).off().css({background: '', border: '', color: ''});
        });

        $root.on('scroll', onRootScrolled);
        _this.docHintMode = true;
    };



    var _removeEffects = function() {

//        console.log('remove effects --- body mousedown --- kw hint = ' + _this.proxKeywordsMode + ' --- doc hint = ' + _this.docHintMode);
        if(_this.docHintMode || _this.proxKeywordsMode) {
            $root.off('scroll', onRootScrolled);

            $('.'+tagClass).each(function(i, tag){
                _this.setTagProperties($(tag));
            });

            _this.proxKeywordsMode = false;
            _this.docHintMode = false;
        }
    };




    var _clear = function() {
        $root.empty();
    };

    var _destroy = function() {
        $root.empty().removeClass(tagCloudContainerClass);
    };

    TagCloud.prototype = {
        build: _build,
        reset: _reset,
        setTagProperties: _setTagProperties,
        restoreTag: _restoreTag,
        hoverTag: _hoverTag,
        tagClicked:_tagClicked,
        unhoverTag: _unhoverTag,
        keywordHintClicked: _keywordHintClicked,
        keywordHintMouseEntered: _keywordHintMouseEntered,
        keywordHintMouseLeft: _keywordHintMouseLeft,
        documentHintClicked: _documentHintClicked,
        removeEffects: _removeEffects,
        clear: _clear,
        destroy: _destroy
    };

    return TagCloud;
})();

