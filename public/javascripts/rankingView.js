$(function(){
	var json;
    $.getJSON("http://" + location.host + "/ranking" , function(data) {
        json = data;
        console.log(json);
        ulObj = $("#ranking");
        var i = 0;
        for(var key in json){
        	if(key != 'score'){
        		var text = (i+1) + "位 　" + key + " "+ json['score'][i] + "score";
        		var voters = "";
        		ulObj.append($('<li id= rank' + (i+1) + '>').text(text));
        		for(var j=0; j<json[key].length; j++){
        	  	voters += json[key][j].name + "(" + json[key][j].total + ") ";
            	}
           		$("#rank" + (i+1)).append($('<li>').text(voters));
        		i++;
        	}
        }
    });
});
