var DocViewer = (function(){

    var $root = $('');
    // Settings
    var s = {};
    // Classes
    var docViewerContainerClass = 'urank-docviewer-container',
        docViewerDetailsSectionClass = 'urank-docviewer-details-section',
        docViewerContentSectionClass = 'urank-docviewer-content-section';
    // Id prefix
    var detailItemIdPrefix = '#urank-docviewer-details-';


    function DocViewer(arguments) {
        s = $.extend({
            root: '',
            facetsToShow: ['year']
        }, arguments);

        $(s.root).addClass(docViewerContainerClass);
    }


    var _build = function() {

        $root = $(s.root).empty().addClass(docViewerContainerClass);

        // Append details section, titles and placeholders for doc details
        var $detailsSection = $("<div class='" + docViewerDetailsSectionClass + "'></div>").appendTo($root);

        var $titleContainer = $('<div></div>').appendTo($detailsSection);
        $("<label>Title:</label>").appendTo($titleContainer);
        $("<h3 id='urank-docviewer-details-title'></h3>").appendTo($titleContainer);

        s.facetsToShow.forEach(function(facetName){
            var $facetContainer = $('<div></div>').appendTo($detailsSection);
            $("<label>" + facetName.capitalizeFirstLetter() + ":</label>").appendTo($facetContainer);
            $("<span id='urank-docviewer-details-" + facetName + "'></span>").appendTo($facetContainer);
        });

        // Append content section for snippet placeholder
        var $contentSection = $("<div class='" + docViewerContentSectionClass + "'></div>").appendTo($root);
        $('<p></p>').appendTo($contentSection);

        $root.on('mousedown', function(event){ event.stopPropagation(); });
    };



    /**
    * @private
    * Description
    * @param {type} document Description
    * @param {Array} keywords (only stems)
    */
    var _showDocument = function(document, keywords, colorScale){

        $(detailItemIdPrefix + 'title').html(getStyledText(document.title, keywords, colorScale));

        var getFacet = function(facetName, facetValue){
            console.log(parseDate(facetValue));
            return facetName == 'year' ? parseDate(facetValue) : facetValue;
        };

        s.facetsToShow.forEach(function(facet){
            //console.log(getFacet(facet, document.facets[facet]));
            //$(detailItemIdPrefix + '' + facet).html(getFacet(facet, document.facets[facet]));
            $(detailItemIdPrefix + '' + facet).html(document.facets[facet]);
        });
        //console.log(getStyledText(document.description, keywords, colorScale));
        $('.' + docViewerContentSectionClass + ' p').html(getStyledText(document.description, keywords, colorScale));
        $('.' + docViewerContentSectionClass + ' p').hide();
        $('.' + docViewerContentSectionClass + ' p').fadeIn('slow');
        $('.' + docViewerContentSectionClass).scrollTo('top');
    };


    var _clear = function(){
        // Clear details section
        $(detailItemIdPrefix + 'title').empty();
        s.facetsToShow.forEach(function(facet){
            $(detailItemIdPrefix + '' + facet).empty();
        });
        // Clear content section
        $('.' + docViewerContentSectionClass + ' p').hide();
    };


    var _destroy = function() {
        $root.empty().removeClass(docViewerContainerClass)
    };


    // Prototype
    DocViewer.prototype = {
        build: _build,
        clear: _clear,
        showDocument: _showDocument,
        destroy: _destroy
    };

    return DocViewer;
})();
