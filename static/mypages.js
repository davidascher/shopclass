$(function(){
  var username = '';
  
  $.ajax({
    url       : '/config',
    type      : 'get',
    data      : '',
    dataType  : 'json',
    success   : function(a) { if (a.username) { $("#username").text(a.username);
      username = a.username;} },
    error     : function(a) { console.log("ERROR", a); }
  });
  $.ajax({
    url       : '/listprojects',
    type      : 'get',
    data      : '',
    dataType  : 'json',
    success   : function(a) { console.log(a);
      a = _.map(a, function(f) { f['username']= username; return f});
      //console.log("XXX", a);
      $( "#page-template" ).tmpl( a )
          .appendTo( "#pages" );
    
    
    $("#pages").text(a); },
    error     : function(a) { console.log("ERROR", a); }
  });

});
