
define(function(require, exports, module) {

exports.launch = function(env) {

    var canon = require("pilot/canon");
    var event = require("pilot/event");
    var Editor = require("ace/editor").Editor;
    var Renderer = require("ace/virtual_renderer").VirtualRenderer;
    var theme = require("ace/theme/textmate");
    var EditSession = require("ace/edit_session").EditSession;

    var JavaScriptMode = require("ace/mode/javascript").Mode;
    var CssMode = require("ace/mode/css").Mode;
    var HtmlMode = require("ace/mode/html").Mode;
    var TextMode = require("ace/mode/text").Mode;
    var UndoManager = require("ace/undomanager").UndoManager;
    
    var saveall = $("#saveall");
    
    function saveAll() {
        files = [{'name': 'server.js', 'data': docs.nodejs.toString()},
                 {'name': 'page.html', 'data': docs.html.toString()},
                 {'name': 'browser.js', 'data': docs.js.toString()},
                 {'name': 'style.less', 'data': docs.css.toString()},
                 ];
        $.ajax({
            url       : '/updatepages/'+project,
            type      : 'post',
            data      : JSON.stringify({'files': files}),
            contentType: "application/json",
            success   : function(a) {
                console.log("OK", a);
            },
            error: function(a) {
                console.log("ERROR: ", a);
            }
            
        })
    }
    saveall.bind('click', saveAll);
    
    //console.log("GOT LOCATION", window.location);
    var pathname = window.location.pathname;
    var parts = window.location.pathname.split('/');
    var username = parts[1];
    var project = parts[2];
    console.log(username, project);
    $("#username").text(username);
    $("#projectname").text(project);
    $("#projectnamevalue").text(project);
    var nodeContent, cssContent, htmlContent, jsContent = 'foo';
    $.ajax({
      url       : '/listpages/'+project,
      type      : 'get',
      data      : '',
      dataType  : 'json',
      success   : function(a) {
        // XXX refactor
        for (var i=0; i<a.length; i++) {
            var blob = a[i];
            if (blob['name'] == 'server.js') {
                docs.nodejs = new EditSession(blob['file']);
                docs.nodejs.setMode(new JavaScriptMode());
                docs.nodejs.setUndoManager(new UndoManager());
                nodeeditor.setSession(docs.nodejs);
            } else if (blob['name'].indexOf('.less') != -1) {
                docs.css = new EditSession(blob['file']);
                docs.css.setMode(new CssMode());
                docs.css.setUndoManager(new UndoManager());
                csseditor.setSession(docs.css);
            } else if (blob['name'].indexOf('.html') != -1) {
                docs.html = new EditSession(blob['file']);
                docs.html.setMode(new HtmlMode());
                docs.html.setUndoManager(new UndoManager());
                htmleditor.setSession(docs.html);
            } else if (blob['name'].indexOf('.js') != -1) {
                docs.js = new EditSession(blob['file']);
                docs.js.setMode(new JavaScriptMode());
                docs.js.setUndoManager(new UndoManager());
                jseditor.setSession(docs.js);
            }
        }
      },
      error     : function(a) { console.log("ERROR", a); }
    });
    
    var docs = {};

    docs.js = new EditSession("");
    docs.js.setMode(new JavaScriptMode());
    docs.js.setUndoManager(new UndoManager());

    docs.nodejs = new EditSession("");
    docs.nodejs.setMode(new JavaScriptMode());
    docs.nodejs.setUndoManager(new UndoManager());

    docs.css = new EditSession("");
    docs.css.setMode(new CssMode());
    docs.css.setUndoManager(new UndoManager());

    docs.html = new EditSession("");
    docs.html.setMode(new HtmlMode());
    docs.html.setUndoManager(new UndoManager());
    
    var container = document.getElementById("container")

    var nodecontainer = document.getElementById("nodeeditor");
    renderer = new Renderer(nodecontainer, theme);
    nodeeditor = new Editor(renderer);
    env.nodeeditor = nodeeditor;
    nodeeditor.setSession(docs.nodejs);

    var jscontainer = document.getElementById("jseditor");
    jseditor = new Editor(new Renderer(jscontainer, theme));
    env.jseditor = jseditor;
    jseditor.setSession(docs.js);

    var htmlcontainer = document.getElementById("htmleditor");
    htmleditor = new Editor(new Renderer(htmlcontainer, theme));
    env.htmleditor = htmleditor;
    htmleditor.setSession(docs.html);

    var csscontainer = document.getElementById("csseditor");
    csseditor = new Editor(new Renderer(csscontainer, theme));
    env.csseditor = csseditor;
    csseditor.setSession(docs.css);

    function onResize() {
        // would be nice to move this all to css
        
        var w = Math.round((document.documentElement.clientWidth/2));
        var h = Math.round(((document.documentElement.clientHeight/2) - 20));
        var top_spacer = 28 + "px";
        var other_spacer = h - 20 + "px";
        var header_spacer = "30px";
        var nodearea = document.getElementById('nodearea');
        nodearea.style.width = w + "px";
        nodearea.style.height = other_spacer;
        nodearea.style.top = top_spacer;
        nodearea.parentNode.style.width = w + "px";
        nodearea.parentNode.style.height = h + "px";
        nodearea.parentNode.style.left = 0;
        nodearea.parentNode.style.top = 0;

        var htmlarea = document.getElementById('htmlarea');
        htmlarea.style.width = w + "px";
        htmlarea.style.height = other_spacer;
        htmlarea.style.top = top_spacer;
        htmlarea.parentNode.style.width = w + "px";
        htmlarea.parentNode.style.height = h + "px";
        htmlarea.parentNode.style.left = w + "px";
        htmlarea.parentNode.style.top = 0;

        var cssarea = document.getElementById('cssarea');
        cssarea.style.width = w + "px";
        cssarea.style.height = other_spacer;
        cssarea.style.top = top_spacer;
        cssarea.parentNode.style.width = w + "px";
        cssarea.parentNode.style.height = h + "px";
        cssarea.parentNode.style.left = 0;
        cssarea.parentNode.style.top = h + "px";

        var jsarea = document.getElementById('jsarea');
        jsarea.style.width = w + "px";
        jsarea.style.height = other_spacer;
        jsarea.style.top = top_spacer;
        jsarea.parentNode.style.width = h + "px";
        jsarea.parentNode.style.height = h + "px";
        jsarea.parentNode.style.left = w + "px";
        jsarea.parentNode.style.top = h +  "px";

        env.nodeeditor.resize();
        env.htmleditor.resize();
        env.csseditor.resize();
        env.jseditor.resize();
    };

    window.onresize = onResize;
    onResize();

    window.env = env;
    env.htmleditor.renderer.setShowGutter(false);
    env.htmleditor.renderer.setHScrollBarAlwaysVisible(false);
    env.htmleditor.setHighlightActiveLine(false);
    env.csseditor.renderer.setHScrollBarAlwaysVisible(false);
    env.csseditor.renderer.setShowGutter(false);
    env.csseditor.setHighlightActiveLine(false);
    env.jseditor.renderer.setShowGutter(false);
    env.jseditor.renderer.setHScrollBarAlwaysVisible(false);
    env.jseditor.setHighlightActiveLine(false);
    env.nodeeditor.renderer.setShowGutter(false);
    env.nodeeditor.renderer.setHScrollBarAlwaysVisible(false);
    env.nodeeditor.setHighlightActiveLine(false);

    
    /**
     * This demonstrates how you can define commands and bind shortcuts to them.
     */
    
    // Command to focus the command line from the editor.
    canon.addCommand({
        name: "save",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S",
            sender: "editor"
        },
        exec: function() {
            saveAll();
        }
    });
  };
});
