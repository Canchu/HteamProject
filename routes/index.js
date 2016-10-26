var express = require('express');
var mysql = require('mysql');
var router = express.Router();

var pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'hteam_db'
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/', function(req, res){
  //console.log(req.query); // for logging
  var HTMLtext = "";
  if (req.body.htmltext) {
    HTMLtext = req.body.htmltext[0];
  }
  //console.log("HTMLText:" + HTMLtext);

  //----名前の抽出-----//
  var presenterNameHTML = HTMLtext.match(/<a href="\?ps=user-info\&amp[\s\S]*?(<\/[aA])/g);
  var presenterName = Array();

  presenterNameHTML.forEach(function pushName(element, index, array){
    	presenterName.push(element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/)[0]);
  });
  //console.log(presenterName);
  //-----------------//
  
  
  //----いいねした人と数の抽出-----//
  var likeNamesHTML = HTMLtext.match(/<a href="\?ps=tweet-good-members\&amp[\s\S]*?(<\/[aA])/g);
  var likeNamesString = Array();
  var likeName = Object();

  likeNamesHTML.forEach(function pushlikeNames(element, index, array){
    	likeNamesString.push(element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/g)[0]);
  });

  for(var i=0; i<likeNamesString.length; i++){
  	var keyName = presenterName[i];
  	likeName[keyName] = likeNamesString[i].split('　');
  }
  //console.log(likeName);  
  //-------------------------//


  //----投稿時間の抽出-----//
  var timesHTML = HTMLtext.match(/<li style="font-size:10px\;">2016-[\s\S]*?(<\/li)/g);
  var timesString = Array();

  timesHTML.forEach(function pushlikeNames(element, index, array){
    	timesString.push(element.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)[0]);
  });
  //console.log(timesString);  
  //-------------------------//

  //----時間・投稿者・いいね・推しキャラでjsonをつくる----------//
  var charaJsons = Array();
  for(var i=0; i<timesString.length; i++){
  	var charaJson = new Object();
  	charaJson['time'] = timesString[i];
  	charaJson['character'] = 'マリオ';
  	charaJson['presenter'] = presenterName[i];
  	charaJson['follower'] = likeName[charaJson['presenter']];
  	charaJsons.push(charaJson);
  }
   //console.log(charaJsons);
  //------------------------//

  //DBにいれる
  
  for(var i = 0; i<charaJsons.length; i++){
    var insertQuery = 'insert into posts values ("%s","%s","%s","%s")';
    for(var key in charaJsons[i]){
      var insertQuery = insertQuery.replace(/%s/, charaJsons[i][key]);
    }
    console.log(insertQuery);
    pool.query(insertQuery, function (err, rows) {
      if (err) return next(err);
    });
  }
  res.render('index', { title: 'Express' });
  //-----------------------//
});



module.exports = router;
