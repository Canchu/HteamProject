$(function(){
	var json;
    $.getJSON("https://" + location.host + "/ranking" , function(data) {
        json = data;
        ulObj = $("#ranking");
        var i = 0;
        for(var key in json){
        	if(key != 'score'){
        		var voters = "";
                var top5 =  json[key].length < 5 ? json[key].length : 5;
                for(var j=0; j<top5; j++){
                    voters += json[key][j].name + "(" + json[key][j].total + ") ";
                }
                var trHTML = '<tr>';
                trHTML += '<td>'+ (i+1)+'位</td>';
                trHTML += '<td>'+ key + '</td>';
                trHTML += '<td>'+ json['score'][i] + 'points</td>';
                trHTML += '<td>'+ voters + '</td>';
        		ulObj.append($(trHTML));
        		i++;
        	}
        }
    });
});
