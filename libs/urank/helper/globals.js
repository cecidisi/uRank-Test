// Numeric Constants
var TAG_CATEGORIES = 5;

//  String Constants
var STR_NO_VIS = "No visualization yet!";
var STR_DROPPED = "Dropped!";
var STR_DROP_TAGS_HERE = "Drop tags here!";
var STR_JUST_RANKED = "new";
var STR_SEARCHING = "Searching...";
var STR_UNDEFINED = 'undefined';


var VIS_MODULES = {
    ranking: Ranking
}


var RANKING_STATUS = {
    new : 'new',
    update : 'update',
    unchanged : 'unchanged',
    no_ranking : 'no_ranking'
};


var RANKING_MODE = {
    overall_score: 'overallScore',
    max_score: 'maxScore'
};

window.USER_ACTION = {
    added: 'keyword added',
    deleted: 'keyword deleted',
    weighted: 'changed weight',
    bookmarked: 'document bookmarked',
    unbookmarked: 'document unbookmarked',
    watched: 'watching document',
    unwatched: 'document unwatched',
    mode: 'ranking mode changed'
};

