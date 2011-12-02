$(document).ready(function(){
    
    // Socket functions. Interactions with the server
    var socket = io.connect('statsonstats.com:8080');
    socket.emit('projects', {});
    socket.on('projects', function(projects){
        for(i in projects)
            addProject(projects[i]);
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
});

function addProject(project){
    $("#projects").append("<a id='project_"+project._id+"' class='project'>"+project.name+"</a>").hide().slideDown(200);
}

function selectProject(projects){
    
}
