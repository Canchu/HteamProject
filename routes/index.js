var express = require('express');
var router = express.Router();

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

  var presenterNameHTML = HTMLtext.match(/<a href="\?ps=user-info\&amp[\s\S]*?(<\/[aA])/g);
  var presenterName = Array();

  presenterNameHTML.forEach(function pushName(element, index, array){
    	presenterName.push(element.match(/([^\x01-\x7E]).*([^\x01-\x7E])|Cardona Luis/)[0]);
  });
  console.log(presenterName);

  res.render('index', { title: 'Express' });
});


module.exports = router;
