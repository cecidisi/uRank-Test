function Urank(callback, args) {

    //  Find path to urank root
    var scripts = document.getElementsByTagName('script'),
        i = 0;

    while(i<scripts.length && scripts[i].src.indexOf('urank.js') == -1)
        i++;

    var pathToUrank = scripts[i].src.replace('urank.js', '');

    var loadAll = function() {

        Modernizr
        .addTest('defaultstyle', function(){
            if(args.style && args.style != 'default') return false; return true;
        })
        .load([
            {
                test: window.jQuery,
                nope: pathToUrank + 'dependencies/jquery.min.js'
            },
            {
                test: window.jQuery.ui,
                nope: [pathToUrank + 'dependencies/jquery-ui.min.js', pathToUrank + 'dependencies/jquery-ui-custom.min.css']
            },
            {
                test: window.d3,
                nope: pathToUrank + 'dependencies/d3.min.js'
            },
            {
                test: window.colorbrewer,
                nope: pathToUrank + 'dependencies/colorbrewer.js'
            },
            {
                test: window.d3pie,
                nope: pathToUrank + 'dependencies/d3pie.min.js'
            },
            {
                test: window._,
                nope: pathToUrank + 'dependencies/underscore-min.js'
            },
            {
                test: Modernizr.defaultstyle,
                yep: pathToUrank + 'css/urank-blocks-default.css',
                complete: function(){
                    console.log('urank loaded');
                    var urank = new UrankController(args);
                    callback.call(this, urank); // call entry point
                }
            }
            /*,
            {
                load: [
                    pathToUrank + 'dependencies/hint.min.css',
                    pathToUrank + 'dependencies/theme/jquery-ui.min.css',
                    pathToUrank + 'libs/natural-custom.js',
                    pathToUrank + 'libs/pos/lexer.js',
                    pathToUrank + 'libs/pos/lexicon.js',
                    pathToUrank + 'libs/pos/pos.js',
                    pathToUrank + 'libs/pos/POSTagger.js',
                    pathToUrank + 'model/keywordExtractor.js',
                    pathToUrank + 'model/rankingArray.js',
                    pathToUrank + 'model/rankingModel.js',
                    pathToUrank + 'blocks/contentList.js',
                    pathToUrank + 'blocks/docViewer.js',
                    pathToUrank + 'blocks/tagBox.js',
                    pathToUrank + 'blocks/tagCloud.js',
                    pathToUrank + 'blocks/visCanvas.js',
                    pathToUrank + 'vis/ranking.js',
                    pathToUrank + 'helper/globals.js',
                    pathToUrank + 'helper/settings.js',
                    pathToUrank + 'helper/utils.js',
                    pathToUrank + 'helper/jquery_functions/outerHTML.js',
                    pathToUrank + 'helper/jquery_functions/scrollTo.js',
                    pathToUrank + 'helper/jquery_functions/fullOffset.js',
                    pathToUrank + 'helper/jquery_functions/fullWidth.js',
                    pathToUrank + 'helper/jquery_functions/fullHeight.js',
                    pathToUrank + 'helper/jquery_functions/getText.js',
                    pathToUrank + 'helper/jquery_functions/pin.js',
                    pathToUrank + 'css/urank.css',
                    pathToUrank + 'css/vis-ranking.css',
                    pathToUrank + 'urank-controller.js'
                ],
                complete: function(){
                    console.log('urank loaded');
                    var urank = new UrankController(args);
                    callback.call(this, urank); // call entry point
                }
            }*/
        ]);
    }


    var isModernizr = window.Modernizr || false;
    var isModernizrLoad = (isModernizr && window.Modernizr.load) ? true : false;

    if(!isModernizr || !isModernizrLoad) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = pathToUrank + 'libs/modernizr-custom.js';
        script.onload = loadAll;
        head.appendChild(script);
    }
    else
        loadAll();

}

