
function Ranking(arguments){

    var s = $.extend({
        root: '.urank-viscanvas-container',
        onItemClicked: function(document){},
        onItemMouseEnter: function(document){},
        onItemMouseLeave: function(document){}
    }, arguments);

    var RANKING = {};

    var self = this;
    var root = s.root;
    var width, height, margin;
    var x, y, color, xAxis, yAxis, x0, y0;
    var svg;
    var data;
    var isRankingDrawn = false;

    //  Classes
    var svgClass = 'urank-ranking-svg',
        axisClass = 'urank-ranking-axis',
        xClass = 'urank-ranking-x',
        xAxisLabelClass = 'urank-ranking-label',
        yClass = 'urank-ranking-y',
        stackedbarClass = 'urank-ranking-stackedbar',
        lightBackgroundClass = 'urank-ranking-light-background',
        darkBackgroundClass = 'urank-ranking-dark-background',
        barClass = 'urank-ranking-bar';

    // Id
    var stackedbarPrefix = '#urank-ranking-stackedbar-';

    RANKING.Settings = new Settings();


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    RANKING.Evt = {};


    RANKING.Evt.itemClicked = function(d, i){
        s.onItemClicked.call(this, d.id);
    };

    RANKING.Evt.itemMouseEntered = function(d, i){
        s.onItemMouseEnter.call(this, d.id);
    };

    RANKING.Evt.itemMouseLeft = function(d, i){
        s.onItemMouseLeave.call(this, d.id);
    };


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    RANKING.Render = {};


    RANKING.Render.update = function(rankingModel,containerHeight, colorScale){            // rankingModel, colorScale, rankingCriteria, status
        var updateFunc = {};
        updateFunc[RANKING_STATUS.new] = RANKING.Render.drawNew;
        updateFunc[RANKING_STATUS.update] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.unchanged] = RANKING.Render.redrawUpdated;
        updateFunc[RANKING_STATUS.no_ranking] = RANKING.Render.clear;
        updateFunc[rankingModel.getStatus()].call(this, rankingModel, containerHeight, colorScale);
    };


    /******************************************************************************************************************
	*
	*	Draw ranking at first instance
	*
	* ***************************************************************************************************************/
    RANKING.Render.drawNew = function(rankingModel, containerHeight, colorScale){

        this.clear();
        isRankingDrawn = true;

        /******************************************************
		*	Define input variables
		******************************************************/
        RANKING.InitData = RANKING.Settings.getRankingInitData(rankingModel);
        data = RANKING.InitData.data;

        /******************************************************
		*	Define canvas dimensions
		******************************************************/
        RANKING.Dimensions = RANKING.Settings.getRankingDimensions(root, containerHeight);
        width          = RANKING.Dimensions.width;
        height         = RANKING.Dimensions.height;
        margin         = RANKING.Dimensions.margin;

        /******************************************************
		*	Define scales
		******************************************************/

        x = d3.scale.linear()
        .domain([0, 1])
        .rangeRound( [0, width] );

        y = d3.scale.ordinal()
        .domain(data.map(function(d, i){ return i; }))
        .rangeBands( [0, height], .02);

        color = colorScale;

        /******************************************************
		 *	Define axis' function
		 *****************************************************/

        // X Axis
        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(function(value){ if(value > 0 && value < 1) return (value * 100) + '%'; return ''; });

        // Y Axis
        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .tickValues("");

        /******************************************************
		*	Draw chart main components
		******************************************************/

        //// Add svg main components
        svg = d3.select(root).append("svg")
            .attr("class", svgClass)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom + 30)
            .append("g")
                .attr("width", width)
                .attr("height", height + 30)
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        svg.append("g")
            .attr("class", xClass + ' ' + axisClass)
            .attr("transform", "translate(0," + (height) + ")")
            .call(xAxis)
            .append("text")
                .attr("class", xAxisLabelClass)
                .attr("x", width)
                .attr("y", -6)
                .style("text-anchor", "end")
                .text(function(){ if(rankingModel.getMode() === RANKING_MODE.overall_score) return "Overall Score"; return 'Max. Score'; });

        svg.append("g")
            .attr("class", yClass +' '+axisClass)
            .call(yAxis)
            .selectAll("text");

        //// Create drop shadow to use as filter when a bar is hovered or selected
        RANKING.Render.createShadow();
        //// Add stacked bars
        RANKING.Render.drawStackedBars();
    };



    /******************************************************************************************************************
	*
	*	Redraw updated ranking and animate with transitions to depict changes
	*
	* ***************************************************************************************************************/
    RANKING.Render.redrawUpdated = function(rankingModel, containerHeight, colorScale){

        /******************************************************
		*	Define input variables
		******************************************************/
        RANKING.InitData = RANKING.Settings.getRankingInitData(rankingModel);
        data = RANKING.InitData.data;

        RANKING.Render.updateCanvasDimensions(containerHeight);

        /******************************************************
		*	Redefine x & y scales' domain
		******************************************************/
        x0 = x.domain([0, 1]).copy();

        y.rangeBands( [0, height], .02);
        y0 = y.domain(data.map(function(d, i){ return i; })).copy();

        color = colorScale;

        svg.select('.'+xClass+'.'+axisClass+' .'+xAxisLabelClass)
            .text(function(){ if(rankingModel.getMode() === RANKING_MODE.overall_score) return "Overall Score"; return 'Max. Score'; });

        var transition = svg.transition().duration(750),
            delay = function(d, i) { return i * 50; };

        transition.select('.'+xClass+'.'+axisClass).call(xAxis)
            .selectAll("g").delay(delay);

        transition.select('.'+yClass+'.'+axisClass).call(yAxis)
            .selectAll("g").delay(delay);

        RANKING.Render.drawStackedBars();
    };




    /******************************************************************************************************************
	*
	*	Draw stacked bars either on draw or update methods. Animate with width transition
	*
	* ***************************************************************************************************************/
    RANKING.Render.drawStackedBars = function(){

        svg.selectAll('.'+stackedbarClass).data([]).exit();
        svg.selectAll('.'+stackedbarClass).remove();
        svg.selectAll('.'+stackedbarClass).data(data).enter();

        setTimeout(function(){
            var stackedBars = svg.selectAll('.'+stackedbarClass)
                .data(data).enter()
                .append("g")
                    .attr("class", stackedbarClass)
                    .attr("id", function(d, i){ return "urank-ranking-stackedbar-" + d.id; })
                    .attr( "transform", function(d, i) { return "translate(0, " + y(i) + ")"; } )
                    .on('click', RANKING.Evt.itemClicked)
                    .on('mouseover', RANKING.Evt.itemMouseEntered)
                    .on('mouseout', RANKING.Evt.itemMouseLeft);

            stackedBars.append('rect')
                .attr('class', function(d, i){ if(i%2 == 0) return lightBackgroundClass; return darkBackgroundClass; })
                .attr('x', 0)
                .attr('width', width)
                .attr('height', y.rangeBand());

            stackedBars.selectAll('.'+barClass)
                .data(function(d) { return d.weightedKeywords; })
                .enter()
                .append("rect")
                    .attr("class", barClass)
                    .attr("height", y.rangeBand())
                    .attr("x", function(d) { return x(d.x0); })
                    .attr("width", 0)
                    .style("fill", function(d) { return color(d.stem); });

            var bars = stackedBars.selectAll('.'+barClass);

            var t0 = bars.transition()
                .duration(500)
                .attr({ "width": function(d) { return x(d.x1) - x(d.x0); } });
        }, 800);

    };



    /******************************************************************************************************************
	*
	*	Create drop shadow for click effect on bars
	*
	* ***************************************************************************************************************/
    RANKING.Render.createShadow = function(){

        // filters go in defs element
        var defs = svg.append("defs");

        // create filter with id #drop-shadow
        // height=130% so that the shadow is not clipped
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");

        // SourceAlpha refers to opacity of graphic that this filter will be applied to
        // convolve that with a Gaussian with standard deviation 3 and store result
        // in blur
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 2)
            .attr("result", "blur");

        // translate output of Gaussian blur to the right and downwards with 2px
        // store result in offsetBlur
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 0)
            .attr("dy", 2)
            .attr("result", "offsetBlur");

        // overlay original SourceGraphic over translated blurred opacity by using
        // feMerge filter. Order of specifying inputs is important!
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "offsetBlur")
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    };



    /******************************************************************************************************************
	*
	*	Adjust height of svg and other elements when the ranking changes
	*
	* ***************************************************************************************************************/

    RANKING.Render.updateCanvasDimensions = function(containerHeight){

        height = containerHeight;
        y.rangeBands(height, .02);

        d3.select(svg.node().parentNode)
            .attr('height', height + margin.top + margin.bottom + 30);

        svg.attr("height", height + 30)
            .attr("transform", "translate(" + (margin.left) + ", 0)");

        // update axes
        svg.select('.x.axis').attr("transform", "translate(0," + (height) + ")").call(xAxis.orient('bottom'));
    };

    /******************************************************************************************************************
	*
	*	Redraw without animating when the container's size changes
	*
	* ***************************************************************************************************************/
    RANKING.Render.resize = function(containerHeight){
        if(!isRankingDrawn) return;
        /******************************************************
		*	Recalculate canvas dimensions
		******************************************************/
        RANKING.Dimensions = RANKING.Settings.getRankingDimensions(root);
        width          = RANKING.Dimensions.width;
        //    height         = RANKING.Dimensions.height;
        margin         = RANKING.Dimensions.margin;

        x.rangeRound([0, width]);
        y.rangeBands(height, .02);

        d3.select(svg.node().parentNode).attr('width',width + margin.left + margin.right);
        svg.attr("width", width);

        // update x-axis
        svg.select('.'+xClass + '.'+axisClass).call(xAxis.orient('bottom'));

        // Update bars
        svg.selectAll('.'+stackedbarClass).attr('width', width);
        svg.selectAll('rect.'+lightBackgroundClass).attr('width', width);
        svg.selectAll('rect.'+darkBackgroundClass).attr('width', width);

        svg.selectAll('.'+barClass)
            .attr("x", function(d) { return x(d.x0); })
            .attr("width", function(d) { return x(d.x1) - x(d.x0); });
    };


    /******************************************************************************************************************
	*
	*	Reset by clearing canvas and display message
	*
	* ***************************************************************************************************************/
    RANKING.Render.clear = function(){
        isRankingDrawn = false;
        $(root).empty();
    };


    /******************************************************************************************************************
    *
    *	Highlight stacked bar and corresponding item in recommendatitle in y axis, tion list
    *	Show rich tooltip
    *   @param {integer} itemIndex: index of selected item
    *   @param {boolean} isSelectedFromOutside: true means that the call came from Vis object, otherwise it was invoked internally by clicking on a y-axis tick or stacked bar
    *
    * ***************************************************************************************************************/
    RANKING.Render.selectItem = function(id){
        id = _.isArray(id) ? id : [id];
        if(isRankingDrawn)
            svg.selectAll('.'+stackedbarClass).style('opacity', function(d){ return id.indexOf(d.id) > -1 ? 1 : 0.3; });
    };


    RANKING.Render.deSelectAllItems = function(){
        if(isRankingDrawn)
            svg.selectAll('.'+stackedbarClass).style('opacity', 1);
    };


    RANKING.Render.hoverItem = function(id) {
        if(isRankingDrawn) {
            svg.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
            .attr('transform', 'translate(0, 0)')
            .style('filter', 'url(#drop-shadow)');
        }
    };


    RANKING.Render.unhoverItem = function(id) {
        if(isRankingDrawn)
            svg.select(stackedbarPrefix +''+ id).selectAll('.'+barClass)
                .attr('transform', 'translate(0, 0.2)')
                .style('filter', '');
    };


    RANKING.Render.highlightItems = function(idsArray) {
        RANKING.Render.selectItem(idsArray);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    RANKING.Ext = {
        update: RANKING.Render.update,
        clear: RANKING.Render.clear,
        resize: RANKING.Render.resize,
        selectItem: RANKING.Render.selectItem,
        deselectAllItems : RANKING.Render.deSelectAllItems,
        hoverItem: RANKING.Render.hoverItem,
        unhoverItem: RANKING.Render.unhoverItem,
        highlightItems: RANKING.Render.highlightItems
    };

    return RANKING.Ext;
}
