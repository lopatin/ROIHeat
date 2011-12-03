$(document).ready(function(){
    
    // Socket functions. Interactions with the server
    var socket = io.connect('127.0.0.1:8080');
    socket.emit('projects', {});
    socket.on('project', function(project){
        addProject(project);
    });
    
    $(".addProject").click(function(){
        $("#addProjectInput").slideDown(200);
    });
    $("#addProjectInput").keyup(function(e){
        if (event.keyCode == '13') {
            var name = $(this).val();
            socket.emit("addProject", {name: name});
        }
    });
    
    socket.on("addedProject", function(project){
        addProject(project);
        $("#addProjectInput").slideUp(200);
    });
    
    socket.on("new_pageview", function(pageview){
        alert(pageview.url);
    });

    $(document).delegate(".project", "click", function(){
        selectProject($(this).attr('id'));
        $(this).addClass("selected");
    });
});

function addProject(project){
    $("#projects").append("<a id='"+project._id+"' class='project'>"+project.name+"</a>").hide().slideDown(200);
    //var stats = $("<div id='stats_"+project._id+"' class='widget'><h3>Traffic History</h3><div></div></div>").appendTo($("#content")).hide();
    
    var pages = $("<div id='pages_"+project._id+"' class='widget'><h3>Pages</h3></div>").appendTo($("#content"));
    var pagelist = [];
    var pageviews = $("<div id='pageviews_"+project._id+"' class='widget'><h3>Recent Pageviews</h3><table><tr><th>Page</th><th>IP</th><th>Time</th><th>Browser</th></tr></table></div>").appendTo($("#content"));
    for(i in project.pageviews){
        if(pagelist.indexOf(project.pageviews[i].url) == -1) pagelist.push(project.pageviews[i].url);
        pageviews.find("table").append("<tr><td>"+project.pageviews[i].url+"</td><td>"+project.pageviews[i].ip+"</td><td>"+project.pageviews[i].time+"</td><td>"+project.pageviews[i].userAgent+"</td></tr>");
    }

    for(i in pagelist){
        pages.append("<div class='iframeWrap'><iframe class='frame' src='"+pagelist[i]+"#showHeatmap'></iframe></div>");
    }
}

function selectProject(projectID){
    $(".project").removeClass("selected");

    $(".widget").slideUp(400);
    $("#pages_"+projectID).slideDown(400);
    $("#pageviews_"+projectID).slideDown(400);
}
