
if(!Math.roundTo)
    Math.roundTo = function(value, places) { return +(Math.round(value + "e+" + places)  + "e-" + places); }

window.RS_MP = (function(){

    var _this;
    //  cosntructor
    function RS_MP() {
        _this = this;
        this.topicItemMatrix = {};
    }


    RS_MP.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ doc: undefined, topic: undefined }, args);

            if(!p.doc || !p.topic)
                return 'Error -- parameter missing';

            if(!this.topicItemMatrix[p.topic])
                this.topicItemMatrix[p.topic] = {};

            this.topicItemMatrix[p.topic][p.doc] = this.topicItemMatrix[p.topic][p.doc] ? this.topicItemMatrix[p.topic][p.doc] + 1 : 1;
        },

        getRecommendations: function(args) {
            var p = $.extend(true, {
                topic: '',
                options: { k: 0 }
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

            var size = p.options.k == 0 ? recs.length : p.options.k;
            return recs.slice(0, size);
        },

        clear: function() {
            this.topicItemMatrix = {};
        }
    };

    return RS_MP;
})();
