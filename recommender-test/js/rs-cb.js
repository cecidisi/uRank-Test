
if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }

    if(!Math.log2)
        Math.log2 = function(value) {
            return (Math.log(value) / Math.log(2));
        }


        window.RScb = (function(){

            var _this;
            //  cosntructor
            function RScb() {
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

            RScb.prototype = {

                addBookmark: function(args) {},

                getRecommendations: function(args) {

                    var p = $.extend(true, { k: 0 }, args);
                    var recs = [];
                    var _data = window.documents.slice();

                    if(p.keywords && p.keywords.length > 0) {
                        _data.forEach(function(d, i) {

                            var docNorm = getEuclidenNorm(d.keywords);
                            var unitQueryVectorDot = parseFloat(1.00/Math.sqrt(p.keywords.length));
                            var score = 0;
                            p.keywords.forEach(function(q) {
                                // termScore = tf-idf(d, t) * unitQueryVector(t) * weight(query term) / |d|   ---    |d| = euclidenNormalization(d)
                                if(d.keywords[q.stem])
                                    score += ((parseFloat(d.keywords[q.term]) / docNorm) * unitQueryVectorDot * parseFloat(q.weight)).round(3);
                                // if item doesn't contain query term => maxScore and overallScore are not changed
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

            return RScb;
        })();
