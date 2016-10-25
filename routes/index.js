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
  console.log("HTMLText:" + HTMLtext);


  res.render('index', { title: 'Express' });
});

module.exports = router;
