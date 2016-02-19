
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




                    var opt = $.extend(true, {
                        data: [],
                        keywords: [],
                        options: {
                            rWeight: 1
                        }
                    }, options);
                    var _data = opt.data.slice();

                    if(p.keywords.length > 0) {
                        _data.forEach(function(d, i) {
                            d.ranking.cbScore = 0;
                            d.ranking.cbMaxScore = 0;
                            d.ranking.cbKeywords = [];
                            var docNorm = getEuclidenNorm(d.keywords);
                            var unitQueryVectorDot = parseFloat(1.00/Math.sqrt(p.keywords.length));
                            var max = 0;
                            opt.keywords.forEach(function(q) {
                                // termScore = tf-idf(d, t) * unitQueryVector(t) * weight(query term) / |d|   ---    |d| = euclidenNormalization(d)
                                var termScore = (d.keywords[q.stem]) ? ((parseFloat(d.keywords[q.stem]) / docNorm) * unitQueryVectorDot * parseFloat(q.weight * opt.options.rWeight)).round(3) :  0;
                                // if item doesn't contain query term => maxScore and overallScore are not changed
                                d.ranking.cbScore += termScore;
                                d.ranking.cbMaxScore = termScore > d.ranking.cbMaxScore ? termScore : d.ranking.cbMaxScore;
                                d.ranking.cbKeywords.push({ term: q.term, stem: q.stem, weightedScore: termScore });
                            });
                        });
                    }
                    return _data;





                },

                clear: function() {}

            };

            return RScb;
        })();
