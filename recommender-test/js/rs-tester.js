
if(!Math.roundTo)
    Math.roundTo = function(value, places) {
        return +(Math.round(value + "e+" + places)  + "e-" + places);
    }


if(!Math.log2)
    Math.log2 = function(value) {
        return (Math.log(value) / Math.log(2));
    }


window.RStester = (function(){

    var _this;
    //  cosntructor
    function RStester() {
        _this = this;
        this.RS = {
            TU: new RS(),
            TU_ALT: new RSalt(),
            POP: new RSpop(),
            CB: new RScb(),
        }
    }


    RStester.prototype = {

        getRankScore: function(rank) {
            return 1 / Math.pow(2, (rank - 1) / 2);
        },

        getnDCG: function(rank) {
            return rank == 1 ? 1.00 : (1 / Math.log2(rank));
        },

        testRecommender: function(recommender, kArray, trainingData, testData, options, iteration) {
            var o = $.extend({
                k: 0,
                beta: 0.5
            }, options);

            var rs = this.RS[recommender] || this.RS.TU;

            rs.clear();

            // Set training set
            trainingData.forEach(function(d){ rs.addBookmark(d); });

            var results = [],
                hits = 0,       // == true positives
                rankScore = 0,
                ndcg = 0,
                timeLapse = $.now();

            testData.forEach(function(d){
                var args = {
                    user: d.user,
                    keywords: d.keywords,
                    options: o,
                    topic: d.topic
                };

                var recs = rs.getRecommendations(args);

                kArray.forEach(function(k){
                    var rank = _.findIndex(recs.slice(0,k), function(r){ return r.doc == d.doc }) + 1;

//                    rank++;
//                    if(rank) {
//                        hits++;
//                        rankScore += _this.getRankScore(rank);
//                        ndcg += _this.getNDCG(rank);
//                    }

                    results.push({
                        rs: recommender,
                        beta: o.beta,
                        k: k,
                        topic: d.topic,
                        task: d.task,
                        iteration: iteration,
                        hit: rank ? true : false,
                        rank: rank,
                        user: d.user,
                        item: d.doc,
                        keywords: d.keywords.map(function(k){ return k.term }).join(' ')
                    });
                });

            });



//            var recall = Math.roundTo(hits/testData.length, 3),
//                precision = Math.roundTo(hits/(testData.length * o.recSize), 3);

            return results;
//            console.log(results);
//            return {
//                hits: hits,
//                recall: recall,
//                precision: precision,
//                f1: Math.roundTo(2 * (precision * recall / (precision + recall)), 3),
//                rankScore: Math.roundTo(rankScore/testData.length, 3),
//                ndcg: Math.roundTo(ndcg/testData.length, 3),
//                time: $.now() -  timeLapse
//            };

        }

    };

    return RStester;
})();
