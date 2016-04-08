
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

        this.data = window.documents;
    }


    RStester.prototype = {

        getTopKLists: function(data, k, betas) {
            k = k || 5;
            betas = betas || [0.0, 0.5, 1.0];
            var TUrs = 'TU';
            // Scaffold list by topic and question
            var config = {
                'T1 WW': {
                    1: { task: 'focus', keywords: 'participation,woman,workforce' },
                    2: { task: 'focus', keywords: 'gap,gender,wage' },
                    3: { task: 'broad', keywords: 'inequality,man,salary,wage,woman,workforce' }
                },
                'T2 Ro': {
                    1: { task: 'focus', keywords: 'autonomous,robot' },
                    2: { task: 'focus', keywords: 'human,interaction,robot' },
                    3: { task: 'broad', keywords: 'control,information,robot,sensor' }
                },
                'T3 AR': {
                    1: { task: 'focus', keywords: 'environment,virtual' },
                    2: { task: 'focus', keywords: 'context,object,recognition' },
                    3: { task: 'broad', keywords: 'augmented,environment,image,reality,video,world' }
                },
                'T4 CE': {
                    1: { task: 'focus', keywords: 'management,waste' },
                    2: { task: 'focus', keywords: 'china,industrial,symbiosis' },
                    3: { task: 'broad', keywords: 'circular,economy,fossil,fuel,system,waste' }
                }
            };

            // Train all RS with 100% bookmarks
            data.forEach(function(d){
                _this.RS[TUrs].addBookmark(d);
                _this.RS.MP.addBookmark(d);
                _this.RS.CB.addBookmark(d);
            });

            var stemmer = natural.PorterStemmer;
            stemmer.attach();
            // Get recommendation lists @k by topic and question
            Object.keys(config).forEach(function(topic){
                Object.keys(config[topic]).forEach(function(question){
                    var keywords = config[topic][question].keywords.split(',').map(function(w){ return { stem: w.stem(), term: w, weight: 1 } }),
                        lists = {};

                    betas.forEach(function(beta){
                        var TUalg = (parseFloat(beta) == 0.0) ? 'U' : (parseFloat(beta) == 1.0 ? 'T' : 'TU');
                        lists[TUalg] = _this.RS[TUrs].getRecommendations({ topic: topic, keywords: keywords, options: { beta: beta, k: k, neighborhoodSize: 20 } })
                    });
                    lists['MP'] = _this.RS.MP.getRecommendations({ topic: topic, options: { k: k }});
                    lists['CB'] = _this.RS.CB.getRecommendations({ keywords: keywords, options: { k: k } });

                    Object.keys(lists).forEach(function(rs){
                        lists[rs].forEach(function(d){ d.title = window.documents[d.doc].title; });
                    });

                    config[topic][question].recs = lists;
                });
            });
            //console.log(JSON.stringify(list));
            return config;
        },

        clear: function(){
            Object.keys(_this.RS).forEach(function(rs){
                _this.RS[rs].clear();
            });
        },

        testRecommender: function(recommender, kArray, trainingData, testData, options, iteration, isShort) {
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

                if(isShort) {
                    console.log('==> ' + _this.data[d.doc].title);
                    recs.slice(0,5).forEach(function(r, i){
                        console.log('   ' + (i+1) + '. ' + _this.data[r.doc].title.substr(0,50) + '... (score = ' + Math.roundTo(r.score,8) + '; t = ' + Math.roundTo(r.misc.tScore,8) + '; u = ' + Math.roundTo(r.misc.uScore,8) + ')' );
                    })
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
