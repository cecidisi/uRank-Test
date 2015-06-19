
if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }


window.RSpop = (function(){

    var _this;
    //  cosntructor
    function RSpop() {
        _this = this;
        this.topicItemMatrix = {};
    }


    RSpop.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ doc: undefined, topic: undefined }, args);

            if(p.doc == undefined || p.topic == undefined)
                return 'Error -- parameter missing';

            if(!this.topicItemMatrix[p.topic])
                this.topicItemMatrix[p.topic] = {};

            this.topicItemMatrix[p.topic][p.doc] = this.topicItemMatrix[p.topic][p.doc] ? this.topicItemMatrix[p.topic][p.doc] + 1 : 1;
        },

        getRecommendations: function(args) {
            var p = $.extend(true, {
                topic: '',
                recSize: 0
            }, args);

            var recs = [];
            _.keys(this.topicItemMatrix[p.topic]).forEach(function(doc){
                recs.push({ doc: doc, score: _this.topicItemMatrix[p.topic][doc] });
            });

            recs = recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });

            var size = p.options.recSize == 0 ? recs.length : p.options.recSize;
            return recs.slice(0, size);
        },

        clear: function() {
            this.topicItemMatrix = {};
        },

        testRecommender: function(trainingData, testData, options) {
            var o = $.extend({
                recSize: 0
            }, options);

            this.clear();

            trainingData.forEach(function(d){
                _this.addBookmark(d);
            });

            var hits = 0;
            var timeLapse = $.now();

            testData.forEach(function(d){
                var args = {
                    topic: d.topic,
                    options: o
                };
                var recs = _this.getRecommendations(args);
                hits = (_.findIndex(recs, function(r){ return r.doc == d.doc }) > -1) ? hits + 1 : hits;
            });

            timeLapse = $.now() - timeLapse;
            return {
                hits: hits,
                recall: Math.roundTo(hits/testData.length, 3),
                precision: Math.roundTo(hits/(testData.length * o.recSize), 3),
                timeLapse: timeLapse
            };
        }

    };

    return RSpop;
})();
