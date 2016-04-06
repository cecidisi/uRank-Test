/******************************************************************************************
*
*   softmax normaliaztion on tag and user scores, softmax normalization on final score
*
*******************************************************************************************/

window.RS_TU_OLD = (function(){

    var _this;
    //  cosntructor
    function RS_TU_OLD() {
        _this = this;
        this.userItemMatrix = {};       //  boolean values
        this.itemTagMatrix = {};        //  counts repetitions
        this.userTagMatrix = {};        //  counts repetitions

        this.data = window.documents;
    }


    RS_TU_OLD.prototype = {

        addBookmark: function(args) {
            var p = $.extend({ user: undefined, doc: undefined, keywords: undefined }, args);

            if(!p.user || !p.doc || !p.keywords)
                return 'Error -- parameter missing';

            //  update user-item matrix
           if(!_this.userItemMatrix[p.user])
               _this.userItemMatrix[p.user] = {};

            _this.userItemMatrix[p.user][p.doc] = true;

            //  item-tag matrix
            if(!_this.itemTagMatrix[p.doc])
                _this.itemTagMatrix[p.doc] = {};

            //  user-tag-matrix
            if(!_this.userTagMatrix[p.user])
                _this.userTagMatrix[p.user] = {};

            // update item-tag, user-tag and tagMax matrices
            p.keywords.forEach(function(k){
                _this.itemTagMatrix[p.doc][k.stem] = (_this.itemTagMatrix[p.doc][k.stem]) ? _this.itemTagMatrix[p.doc][k.stem] + 1 : 1;
                _this.userTagMatrix[p.user][k.stem] = (_this.userTagMatrix[p.user][k.stem]) ? _this.userTagMatrix[p.user][k.stem] + 1 : 1;
            });
            return 'success';
        },

        getRecommendations: function(args) {

            var p = $.extend(true, {
                user: 'new',
                keywords: [],
                options: {
                    beta: 0.5,
                    neighborhoodSize: 10,
                    simDocuments: 5,
                    and: false,
                    k: 0
                }
            }, args);

            var growthFun = function(x) { return  parseFloat(1 - Math.pow(Math.E, (-1 * x))) };
            var expSumTags = 0, expSumUsers = 0;

            //  Get Neighbors
            var neighbors = [];
            Object.keys(_this.userTagMatrix).forEach(function(user){
                if(user != p.user) {
                    var userSim = 0;
                    var userTagsExpSum = Object.keys(_this.userTagMatrix[user]).map(function(tag){
                        return  parseFloat(Math.pow(Math.E, _this.userTagMatrix[user][tag]));
                    }).reduce(function(val1, val2){ return (val1 + val2) });

                    p.keywords.forEach(function(k){
                        if(_this.userTagMatrix[user][k.stem]) {
                            var normalizedFreq = parseFloat(Math.pow(Math.E, _this.userTagMatrix[user][k.stem]) / userTagsExpSum);
                            userSim += parseFloat((normalizedFreq * k.weight * growthFun(_this.userTagMatrix[user][k.stem])) / p.keywords.length);
                        }
                    });
                    if(userSim)
                        neighbors.push({ user: user, score: userSim });
                }
            });

            neighbors = neighbors.sort(function(v1, v2){
                if(v1.simUV > v2.simUV) return -1;
                if(v1.simUV < v2.simUV) return 1;
                return 0;
            }).slice(0, p.options.neighborhoodSize);
            //neighbors = neighbors.quickSort('simUV').slice(0, p.options.neighborhoodSize);

            var recs = [];
            //   Keys are doc ids
            Object.keys(_this.itemTagMatrix).forEach(function(doc){
                //  Checks that current user is new or that s/he has not selected the doc yet
                if(!_this.userItemMatrix[p.user] || !_this.userItemMatrix[p.user][doc]){

                    var tagScore = 0.0, userScore = 0.0,
                        tags = {}, users = 0;
                    var itemTagsExpSum = Object.keys(_this.itemTagMatrix[doc]).map(function(tag){
                        return Math.pow(Math.E, _this.itemTagMatrix[doc][tag])
                    }).reduce(function(val1, val2){ return (val1  +  val2) });

                    //  T-score
                    p.keywords.forEach(function(k) {
                        // Check if current document has been tagged with current tag
                        if(_this.itemTagMatrix[doc][k.stem]) {
                            var normalizedFreq = Math.pow(Math.E, _this.itemTagMatrix[doc][k.stem]) / itemTagsExpSum;           // normalized item-tag frequency
                            var singleTagScore = (normalizedFreq * k.weight * growthFun(_this.itemTagMatrix[doc][k.stem]) / p.keywords.length);
                            tags[k.stem] = { tagged: _this.itemTagMatrix[doc][k.stem], score: singleTagScore, term: k.term };
                            tagScore += singleTagScore;
                        }
                    });
                    expSumTags += Math.pow(Math.E, tagScore);


                    //  U-score => neighbor similarity * 1 | 0
                    neighbors.forEach(function(v) {
                        var singleUserScore = 0;
                        // check if neighbour has bookmarked current document
                        if(_this.userItemMatrix[v.user][doc]) {
                            singleUserScore += v.score;
                            users++;
                        }
                        userScore += parseFloat(singleUserScore / neighbors.length);
                    });
                    expSumUsers += Math.pow(Math.E, userScore);

                    if(userScore > 0 || tagScore > 0) {
                        recs.push({
                            doc: doc,
                            misc: {
                                tagScore: tagScore,
                                userScore: userScore,
                                tags: tags,
                                users: users
                            }
                        });
                    }
                }
            });

            recs.forEach(function(r){
                var tagScore = parseFloat(r.misc.tagScore/expSumTags) || 0.0,
                    userScore = parseFloat(r.misc.userScore/expSumUsers) || 0.0;
                r.score = tagScore * p.options.beta + userScore * (1 - p.options.beta);
            });

            var size = p.options.k ? p.options.k : recs.length;
            //            return recs.quickSort('score').slice(0,size);
            recs =  recs.sort(function(r1, r2){
                if(r1.score > r2.score) return -1;
                if(r1.score < r2.score) return 1;
                return 0;
            }).slice(0,size);

           console.log('********************************** BETA = ' + p.options.beta + '; TOPIC = ' + p.topic + '; KEYWORDS = ' + p.keywords.map(function(k){ return k.term }).join(', ') );
            for(var i=0, len=5; i<len;++i) {
                var d = recs[i],
                    obj = {
                    title: _this.data[d.doc].title,
                    SCORE: d.score,
                    Uscore: d.misc.userScore,
                    Tscore: d.misc.tagScore,
                    user: d.misc.users
                }
                console.log(obj);
                //console.log(_this.data[d.doc].title + ' --- SCORE = ' + d.score + ';  U-score = ' + d.misc.userScore + '; T-score = ' + d.misc.tagScore);
            }

            return recs;

        },

        clear: function() {
            this.userItemMatrix = {};
            this.itemTagMatrix = {};
            this.userTagMatrix = {};
        },

        //  Miscelaneous

        getUserItemMatrix: function() {
            return this.userItemMatrix;
        },

        getUserTagMatrix: function() {
            return this.userTagMatrix;
        },

        getItemTagMatrix: function() {
            return this.itemTagMatrix;
        }

    };

    return RS_TU_OLD;
})();
