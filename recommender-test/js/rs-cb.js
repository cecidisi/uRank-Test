window.RS_CB = (function(){

    var _this;
    //  cosntructor
    function RS_CB() {
        _this = this;
        this.topicItemMatrix = {};
    }

    var getEuclidenNorm = function(docKeywords) {
        var acumSquares = 0;
        Object.keys(docKeywords).forEach(function(k){
            acumSquares += docKeywords[k] * docKeywords[k];
        });
        return Math.sqrt(acumSquares);
    };

    RS_CB.prototype = {

        addBookmark: function(args) {},

        getRecommendations: function(args) {

            var p = $.extend(true, {
                keywords: [],
                options: { k: 0 }
            }, args);

            var recs = [];
            var _data = $.extend(true, {}, window.documents);

            if(p.keywords && p.keywords.length > 0) {
                Object.keys(_data).forEach(function(docId, i) {
                    var d = _data[docId];
                    var docNorm = getEuclidenNorm(d.keywords);
                    var unitQueryVectorDot = parseFloat(1.00/Math.sqrt(p.keywords.length));
                    var score = 0;
                    p.keywords.forEach(function(q) {
                        // termScore = tf-idf(d, t) * unitQueryVector(t) * weight(query term) / |d|   ---    |d| = euclidenNormalization(d)
                        if(d.keywords[q.term])
                            score += ((parseFloat(d.keywords[q.term]) / docNorm) * unitQueryVectorDot * parseFloat(q.weight));
                    });
                    recs.push({ doc: d.id, score: score });
                });
            }
            recs = recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            });

            var size = p.options.k ? p.options.k : recs.length;
            return recs.slice(0, size);
        },

        clear: function() {}

    };

    return RS_CB;
})();