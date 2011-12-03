
var target, x, y, xy;
var ready = false;
var projectID = "4ed97d9e06843ac40a000001";

$(document).ready(function(){

	var socket = io.connect('127.0.0.1:8080');

	socket.on('connected_client', function(){
    if(window.location.href.indexOf("showHeatmap") == -1)
		  socket.emit('connected_client',{url: window.location.href, title: $(document).attr('title'), projectID: projectID});
	});

	socket.on('confirm_client_connection', function(){
		ready = true;

    // Set mouse listeners on conection
    if(window.location.href.indexOf("showHeatmap") == -1){
      alert('confirmed2');
      $(document).click(function(e){
        socket.emit('click', {
          position: getRelativeCoordinates(e, $("body")[0])
        });
      });
        

      setInterval(function(){
        if(xy)
          socket.emit('mousePoint', {
            target: target,
            position: xy
          });
      }, 100);

      $(document).mousemove(function(e){
        x = e.offsetX;
        y = e.offsetY;
        xy = getRelativeCoordinates(e, $("body")[0]);
      });
    }
	});


	socket.on('heatmapCoords', function(coords){
		alert("got coords");
		if(coords){
			heatmap.store.setDataSet({ max: 10, data: coords});
		}
		else {
			alert('error');
		}
	});

	socket.on('singlePoint', function(coords){
			heatmap.store.addDataPoint(coords.x, coords.y);
	});

	// Create heatmap
	if(window.location.href.indexOf("showHeatmap") != -1){
		var config = {
		    "radius": 30,
		    "element": $("body")[0],
		    "visible": true,
		    "opacity": 40,
		    "gradient": { 0.45: "rgb(0,0,255)", 0.55: "rgb(0,255,255)", 0.65: "rgb(0,255,0)", 0.95: "yellow", 1.0: "rgb(255,0,0)" }
		};

		var heatmap = heatmapFactory.create(config);

		socket.emit('getHeatmapCoords', {url: window.location.href, projectID: projectID});
	}

});


/**
   * Retrieve the coordinates of the given event relative to the center
   * of the widget.
   *
   * @param event
   *   A mouse-related DOM event.
   * @param reference
   *   A DOM element whose position we want to transform the mouse coordinates to.
   * @return
   *    A hash containing keys 'x' and 'y'.
   * 
   * 
   * http://acko.net/blog/mouse-handling-and-absolute-positions-in-javascript
   */
  function getRelativeCoordinates(event, reference) {
    var x, y;
    event = event || window.event;
    var el = event.target || event.srcElement;

    if (!window.opera && typeof event.offsetX != 'undefined') {
      // Use offset coordinates and find common offsetParent
      var pos = { x: event.offsetX, y: event.offsetY };

      // Send the coordinates upwards through the offsetParent chain.
      var e = el;
      while (e) {
        e.mouseX = pos.x;
        e.mouseY = pos.y;
        pos.x += e.offsetLeft;
        pos.y += e.offsetTop;
        e = e.offsetParent;
      }

      // Look for the coordinates starting from the reference element.
      var e = reference;
      var offset = { x: 0, y: 0 }
      while (e) {
        if (typeof e.mouseX != 'undefined') {
          x = e.mouseX - offset.x;
          y = e.mouseY - offset.y;
          break;
        }
        offset.x += e.offsetLeft;
        offset.y += e.offsetTop;
        e = e.offsetParent;
      }

      // Reset stored coordinates
      e = el;
      while (e) {
        e.mouseX = undefined;
        e.mouseY = undefined;
        e = e.offsetParent;
      }
    }
    else {
      // Use absolute coordinates
      var pos = getAbsolutePosition(reference);
      x = event.pageX  - pos.x;
      y = event.pageY - pos.y;
    }
    // Subtract distance to middle
    return { x: x, y: y };
  }
      
