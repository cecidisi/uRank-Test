
window.RStester = (function(){

    var _this;
    //  constructor
    function RStester() {
        _this = this;
        this.RS = {
            TU: new RS_TU(),
            TU_ALT: new RS_TU_ALT(),
            TU_OLD: new RS_TU_OLD(),
            MP: new RS_MP(),
            CB: new RS_CB()
        }
    }


    RStester.prototype = {

        getTopKLists: function(data, k, betas) {
            k = k || 5;
            betas = betas || [0.0, 0.5, 1.0];
            var list = {};
            var TUrs = 'TU';
            data.forEach(function(d){
                // Add all bookmarks for training
                _this.RS[TUrs].addBookmark(d);
                _this.RS.MP.addBookmark(d);
                _this.RS.CB.addBookmark(d);

                // Scaffold list by topic and question
                if(!list[d.topic])
                    list[d.topic] = {};
                if(!list[d.topic][d.question])
                    list[d.topic][d.question] = { task: d.task, keywords: d.keywords };
            });

            // Get recommendation lists @k by topic and question
            Object.keys(list).forEach(function(topic){
                Object.keys(list[topic]).forEach(function(question){
                    var keywords = list[topic][question].keywords,
                        lists = {};
                    betas.forEach(function(beta){
                        var TUalg = (parseFloat(beta) == 0.0) ? 'U' : (parseFloat(beta) == 1.0 ? 'T' : 'TU');
                        lists[TUalg] = _this.RS[TUrs].getRecommendations({ keywords: keywords, options: { beta: beta, k: k, neighborhoodSize: 20 } })
                    });
                    lists['MP'] = _this.RS.MP.getRecommendations({ topic: topic, options: { k: k }});
                    lists['CB'] = _this.RS.CB.getRecommendations({ keywords: keywords, options: { k: k } });

                    Object.keys(lists).forEach(function(rs){
                        lists[rs].forEach(function(d){
                            d.title = window.documents[d.doc].title;
                        })
                    });

                    list[topic][question].recs = lists;
                });
            });
            //console.log(JSON.stringify(list));
            return list;
        },

        clear: function(){
            Object.keys(_this.RS).forEach(function(rs){
                _this.RS[rs].clear();
            });
        },

        testRecommender: function(recommender, kArray, trainingData, testData, options, iteration) {
            var o = $.extend({
                k: 0,
                beta: 0.5
            }, options);

            var rs = this.RS[recommender] || this.RS.TU;
            rs.clear();

            console.log(iteration + '. ' +  recommender + ' ' + (o.beta > -1 ? ('(ß='+o.beta+')') : '' ) );
            var tmsp = $.now();
            // Set training set
            trainingData.forEach(function(d){ rs.addBookmark(d); });

            var results = [],
                hits = 0,       // == true positives
                rankScore = 0,
                ndcg = 0,
                timeLapse = $.now();

            var emptyRecs = 0;


            testData.forEach(function(d, i){
                var args = {
                    user: d.user,
                    keywords: d.keywords,
                    options: o,
                    topic: d.topic
                };
                var recs = rs.getRecommendations(args);
                if(!recs.length) emptyRecs++;

                kArray.forEach(function(k){
                    var rank = _.findIndex(recs.slice(0,k), function(r){ return r.doc == d.doc }) + 1;

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

            console.log('Time lapse = ' + ($.now() - tmsp) + '; Empty Recs = ' + emptyRecs);
            return results;
        }

    };

    return RStester;
})();
