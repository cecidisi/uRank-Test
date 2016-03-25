
window.RStester = (function(){

    var _this;
    //  cosntructor
    function RStester() {
        _this = this;
        this.RS = {
            TU: new RS_TU(),
            ALT_1: new RS_ALT_1(),
            ALT_2: new RS_ALT_2(),
            MP: new RS_MP(),
            CB: new RS_CB()
        }
    }



    RStester.prototype = {

        getTop5Lists: function(data) {

            var list = {};
            data.forEach(function(d){

                // Add all bookmarks for training
                _this.RS.TU.addBookmark(d);
                _this.RS.MP.addBookmark(d);
                _this.RS.CB.addBookmark(d);

                // Set list skeleton by topic and question
                if(!list[d.topic])
                    list[d.topic] = {};
                if(!list[d.topic][d.question])
                    list[d.topic][d.question] = { task: d.task, keywords: d.keywords };
            });

            // Get recommendation lists @5 by topic and question
            Object.keys(list).forEach(function(topic){
                Object.keys(list[topic]).forEach(function(question){

                    var keywords = list[topic][question].keywords.map(function(k){ return { term: k, weight: 1 } });
                    list[topic][question].recs = {
                        TU: _this.RS.TU.getRecommendations({ keywords: keywords, options: { beta: 0.6, neighborhoodSize: 20, k: 5 } }),
                        MP: _this.RS.MP.getRecommendations({ topic: topic, options: { k: 5 }}),
                        CB: _this.RS.CB.getRecommendations({ keywords: keywords, options: { k: 5 } })
                    }
                });
            });

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

                var show = false;
                if(i<3) {
                   // console.log('***** ' + d.doc);
                   //show = true;
                }

                var recs = rs.getRecommendations(args, show);

                if(!recs.length) emptyRecs++;

                if(i<3) {
                //    console.log(recs.slice(0,5));
                }

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
