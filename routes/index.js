var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var pool = mysql.createPool({
  host: process.env.DB_HOST || 'us-cdbr-iron-east-04.cleardb.net',//'localhost',
  user: process.env.DB_USER || 'bb51bca56ce53c', //'root',
  password: process.env.DB_PASS || 'fa07788a',//'',
  database: process.env.DB_NAME || 'heroku_a855e02c258c558'//'hteam_db'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res){
  //console.log(req.query); // for logging
  var HTMLtext = "";
  if (req.body.htmltext) HTMLtext = req.body.htmltext[0];
  

  //----投稿時間の抽出-----//
  var timesHTML = HTMLtext.match(/<span id="tweet_good_\d{4}_count">[\s\S]*?(\d{2}<\/li)/g);
  var timesString = Array();
  timesHTML.forEach(function pushlikeNames(element, index, array){
      timesString.push(element.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)[0]);
  });
  //console.log(timesString);  
  //-------------------------//

  //----名前の抽出-----//
  var presenterNameHTML = HTMLtext.match(/<h5\sclass="media-heading"><a\shref="\?ps=user-info\&amp[\s\S]*?(<\/[aA])/g);
  var presenterNames = Array();
  presenterNameHTML.forEach(function pushName(element, index, array){
    	var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/)[0];
      if(name == undefined){
        res.render('error', { message: 'presenter null' });
        return;
      }
      presenterNames.push(name);
  });
  //console.log(presenterNames);
  //-----------------//

 //--投票したキャラクター名の抽出----//
  var characterHTML = HTMLtext.match(/#(([^\x01-\x7E])*<br>)/g);
  var characterNames = Array();
  characterHTML.forEach(function pushName(element, index, array){
      var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E])/)[0];
      console.log(name);
      if(name == undefined){
        res.render('error', { message: 'presenter null' });
        return;
      }
      characterNames.push(name);
  });

  //----いいねした人と数の抽出-----//
  var likeNamesHTML = HTMLtext.match(/<a href="\?ps=tweet-good-members\&amp;id=\d{4}[\s\S]*?(<\/li)/g);
  var likeNamesString = Array();
  var likeName = Object();

  likeNamesHTML.forEach(function pushlikeNames(element, index, array){
      var name = element.match(/([^\x01-\x7E]).*([^\x01-\x7E]|Cardona Luis)/g)[0];
      if(name != "いいねがありません") likeNamesString.push(name);  //いいねが1つもついていなかったときスキップ 
  });

  for(var i=0; i<likeNamesString.length; i++){
  	var keyName = timesString[i];
  	likeName[keyName] = likeNamesString[i].split('　');
  }
  //console.log(likeName);  
  //-------------------------//


  //----時間・投稿者・いいね・推しキャラでjsonをつくる----------//
  var charaJsons = Array();
  for(var i=0; i<timesString.length; i++){
  	var charaJson = new Object();
    var cnt = 0;
  	charaJson['time'] = timesString[i];
  	charaJson['character'] = characterNames[i];
  	charaJson['presenter'] = presenterNames[i];
    charaJson['follower'] = likeName[charaJson['time']];
    if(charaJson['follower'] != undefined) cnt = charaJson['follower'].length;
    charaJson['followercnt'] = cnt;
    charaJsons.push(charaJson);
  }
  // console.log(charaJsons);

  //---------------------DB操作----------------------------//
  var p = new Promise(function(res) { res(); });
  //総合テーブルの更新
  for(var i = 0; i < charaJsons.length; i++) {
    p = p.then(makePromiseFunc(i, charaJsons));
  } 
  //キャラスコアテーブルの更新→いいねテーブルの更新→ランキングテーブルの更新
  p = p.then(updateCharacterScore);
  p = p.then(updateFollowerInfo(charaJsons));
  p = p.then(updateRanking);
  p.then(
    function(){
     //console.log("Done");
     res.render('rankingView');
  });
  //-----------------------//
});

function makePromiseFunc(index, charaJsons){
   return function(prevValue) {
      return new Promise(function(res, rej) {
         var time = charaJsons[index]['time'];
         var searchTimeQuery = 'select time from posts where time="%s"'.replace(/%s/, time);
         pool.query(searchTimeQuery, function (err, rows) {
           if (err) return next(err);

           if(rows.length>0){ //既にDBに入っているときいいねとキャラを更新するだけ
             query = 'update posts set Ncharacter = "%c", follower="%s", followerCnt ="%d" where time = "%t"';
             query = query.replace(/%t/, time);
             query = query.replace(/%c/, charaJsons[index]['character']);
             query = query.replace(/%d/, charaJsons[index]['followercnt']);
             query = query.replace(/%s/, charaJsons[index]['follower']);
           }
           else{ //新規登録のとき全てをinsert
             var query = 'insert into posts values ("%s","%s","%s","%s","%s")';
             for(var key in charaJsons[index]) query = query.replace(/%s/, charaJsons[index][key]);
           }
           pool.query(query, function (err, rows) {
             if (err) return next(err);
             res();
           });
         });
      });
    };
 }

//キャラスコアテーブルの更新
function updateCharacterScore(){
  　var characterQuery = "INSERT INTO characterScore (Ncharacter,score) SELECT Ncharacter, score FROM (SELECT Ncharacter, SUM(followerCnt)+COUNT(Ncharacter)*5 as score FROM posts GROUP BY Ncharacter)t ON DUPLICATE KEY UPDATE score = t.score";
    pool.query(characterQuery, function (err, rows) {
        if (err) return next(err);
    });
}

function updateFollowerInfo(charaJsons){
 var p = new Promise(function(res) { res(); });
 for(var i = 0; i < charaJsons.length; i++) {
   for(var j = 0; j < charaJsons[i]['follower'].length; j++){
     p = p.then(followerPromiseFunc(i, j, charaJsons)); 
   }
 }
}

function followerPromiseFunc(idx, fidx, charaJsons){
  return function(prevValue) {
    return new Promise(function(res, rej) {
      var name = (charaJsons[idx]['follower'])[fidx];
      var query = 'insert into followerInfo(time, name, Ncharacter) values ("%t", "%fn", "%c") on duplicate key update time=time,name=name,Ncharacter=Ncharacter';
      query = query.replace(/%t/, charaJsons[idx]['time']);
      query = query.replace(/%fn/, name);
      query = query.replace(/%c/, charaJsons[idx]['character']);
      pool.query(query, function (err, rows) {
        if (err) return next(err);
        res();
      });
    });
  };
}

function updateRanking(){
  var p = new Promise(function(res) { res(); });
  var queries = Array();
  queries.push('DELETE FROM ranking');
  //queries.push('INSERT INTO ranking(name, Ncharacter, score) select presenter, Ncharacter, score from (SELECT presenter,COUNT(presenter)*5 as score, Ncharacter FROM posts GROUP BY presenter)p ON DUPLICATE KEY UPDATE score = p.score');
  queries.push('INSERT INTO ranking(name, Ncharacter, score) select presenter, Ncharacter, score from (SELECT presenter, 5 as score, Ncharacter FROM posts)p ON DUPLICATE KEY UPDATE score = p.score');
  queries.push('INSERT INTO ranking(name, Ncharacter, score) select name, Ncharacter, score from (select name, count(name) as score, Ncharacter from followerInfo group by name, Ncharacter)f');
  for(var i = 0; i < 3; i++) {
    p = p.then(sendQuery(queries[i]));
  } 
  //p.then(sendQuery(resetRank)).then(sendQuery(insertP)).then(sendQuery(insertF));
}

function sendQuery(query){
  return function(prevValue) {
    return new Promise(function(res, rej) {
      pool.query(query, function (err, rows) {
        if (err) return next(err);
        console.log(query);
        res();
      });
    });
  };
}

module.exports = router;
