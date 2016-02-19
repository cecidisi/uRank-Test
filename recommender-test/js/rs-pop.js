
if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }

if(!Math.log2)
    Math.log2 = function(value) {
        return (Math.log(value) / Math.log(2));
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

    return RSpop;
})();
