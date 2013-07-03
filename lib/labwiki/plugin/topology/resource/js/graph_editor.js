

L.provide('LW.plugin.topology.graph_editor', ["vendor/d3/d3.js"], function () {

  LW.plugin.topology.graph_editor = function(opts) {

    var controller = opts['column_controller'];
    var width = opts['width'] ? opts['width'] : 1;
    var height = opts['height'] ? opts['height'] : 0.5;

    var svg;
    var tooltip;
    var drag_line;
    var force;
    var path;
    var circle;

    // set up initial nodes and links
    //  - nodes are known by 'id', not by index in array.
    //  - reflexive edges are indicated on the node (as a bold black circle).
    //  - links are always source < target; edge directions are set by 'left' and 'right'.
    var nodes = [{
      id : 0,
      reflexive : false
    }, {
      id : 1,
      reflexive : true
    }, {
      id : 2,
      reflexive : false
    }]
    var lastNodeId = 2;
    var links = [{
      source : nodes[0],
      target : nodes[1],
      left : false,
      right : true
    }, {
      source : nodes[1],
      target : nodes[2],
      left : false,
      right : true
    }];

    // mouse event vars
    var selected_node = null, selected_link = null, mousedown_link = null, mousedown_node = null, mouseup_node = null;


    function editor(divs) {
      divs.each(function() {
        var div = d3.select(this);

        // init D3 force layout
        force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            //.size([width, height])
            .linkDistance(150)
            .charge(-500)
            .on('tick', tick);

        svg = div
            .append('svg');
        controller.on({
          "change:width": function() { resize_svg(); restart(); },
          "change:panel_heigh": function() { resize_svg(); restart(); }
        });
        resize_svg();

        tooltip =  div.append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            //.style("z-index", "10")
            .style("visibility", "hidden")
            .text("a simple tooltip");



        // line displayed when dragging new nodes
        drag_line = svg.append('line')
            .attr('class', 'link dragline hidden')
            .style("stroke-width", function(d) { return 4; })
            .style("stroke", function(d) { return 'black'; })
        ;

        // handles to link and node element groups
        path = svg.append('svg:g').selectAll('line');
        circle = svg.append('svg:g').selectAll('g');

        // app starts here
        svg.on('mousedown', mousedown)
            .on('mousemove', mousemove)
            .on('mouseup', mouseup);
        d3.select(window)
            .on('keydown', keydown)
            .on('keyup', keyup);
        restart();

      })
    }

    function resize_svg() {
      var w = Math.floor(width * controller.get('width'));
      var h = Math.floor(height * controller.get('panel_height'));
      svg.attr('width', w)  // controller may not have been properly resized
         .attr('height', h);
      force.size([w, h]);
    }

    function resetMouseVars() {
      mousedown_node = null;
      mouseup_node = null;
      mousedown_link = null;
    }

    // update force layout (called automatically each iteration)
    function tick() {
      // draw directed edges with proper padding from node centers
      path.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      circle.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    }

    // update graph (called when needed)
    function restart() {
        // path (link) group
        path = path.data(links);

        // update existing links
        path.classed('selected', function(d) { return d === selected_link; })
        ;


        // add new links
        path.enter().append('line')
            .attr('class', 'link')
            .classed('selected', function(d) { return d === selected_link; })
            .on('mousedown', function(d) {
                if(d3.event.ctrlKey || d3.event.altKey) return;

                // select link
                mousedown_link = d;
                if(mousedown_link === selected_link) selected_link = null;
                else selected_link = mousedown_link;
                selected_node = null;
                restart();
            });

        // remove old links
        path.exit().remove();


        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = circle.data(nodes, function(d) { return d.id; });

        // update existing nodes (reflexive & selected visual states)
        circle.selectAll('circle')
            .classed('reflexive', function(d) { return d.reflexive; })
            .classed('selected', function(d) { return d === selected_node;; });

        // add new nodes
        var g = circle.enter().append('svg:g');

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', 12)
            .classed('reflexive', function(d) { return d.reflexive; })
            .on('mouseover', function(d) {
                //if(!mousedown_node || d === mousedown_node) return;
                // enlarge target node
                d3.select(this).attr('transform', 'scale(1.5)');
                show_tooltip(d, d3.select(this));
            })
            .on('mouseout', function(d) {
                //if(!mousedown_node || d === mousedown_node) return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
                tooltip.style("visibility", "hidden");
            })
            .on('mousedown', function(d) {
                if(d3.event.ctrlKey || d3.event.altKey) return;

                // select node
                mousedown_node = d;
                if(mousedown_node === selected_node) selected_node = null;
                else selected_node = mousedown_node;
                selected_link = null;

                // reposition drag line
                drag_line
                    .classed('hidden', false)
                    .style("visibility", "visible")
                    .attr("x1",  mousedown_node.x)
                    .attr("y1",  mousedown_node.y)
                    .attr("x2",  mousedown_node.x)
                    .attr("y2",  mousedown_node.y);

                restart();
            })
            .on('mouseup', function(d) {
                if(!mousedown_node) return;

                // needed by FF
                drag_line
                    .classed('hidden', true);

                // check for drag-to-self
                mouseup_node = d;
                if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if(mousedown_node.id < mouseup_node.id) {
                    source = mousedown_node;
                    target = mouseup_node;
                    direction = 'right';
                } else {
                    source = mouseup_node;
                    target = mousedown_node;
                    direction = 'left';
                }

                var link;
                link = links.filter(function(l) {
                    return (l.source === source && l.target === target);
                })[0];

                if(link) {
                    link[direction] = true;
                } else {
                    link = {source: source, target: target, left: false, right: false};
                    link[direction] = true;
                    links.push(link);
                }

                // select new link
                selected_link = link;
                selected_node = null;
                restart();
            });

        // show node IDs
        g.append('svg:text')
            .attr('x', 0)
            .attr('y', 4)
            .attr('class', 'id')
            .text(function(d) { return d.id; });

        // remove old nodes
        circle.exit().remove();

        // set the graph in motion
        force.start();
    }

    function mousedown() {
        // prevent I-bar on drag
        //d3.event.preventDefault();

        // because :active only works in WebKit?
        svg.classed('active', true);

        if(d3.event.ctrlKey || d3.event.altKey || mousedown_node || mousedown_link) return;
    }

    function mousemove() {
        if(!mousedown_node) return;

        // update drag line
        var pos = d3.mouse(this);
        drag_line.attr("x2", pos[0])
            .attr("y2", pos[1]);
        restart();
    }

    function mouseup() {
        if(mousedown_node) {
            // hide drag line
            drag_line
                .classed('hidden', true)
                .style("visibility", "hidden");
        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        // clear mouse event vars
        resetMouseVars();
    }

    function spliceLinksForNode(node) {
        var toSplice = links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            links.splice(links.indexOf(l), 1);
        });
    }

    // only respond once per keydown
    var lastKeyDown = -1;

    function keydown() {
        d3.event.preventDefault();

        if(lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        // ctrl
        //if(d3.event.keyCode === 17) {
        if(d3.event.keyIdentifier == "Control" || d3.event.keyIdentifier == "Alt") {
            circle.call(force.drag);
            svg.classed('ctrl', true);
        }

        if(!selected_node && !selected_link) return;
        switch(d3.event.keyCode) {
        case 8: // backspace
        case 46: // delete
            if(selected_node) {
                nodes.splice(nodes.indexOf(selected_node), 1);
                spliceLinksForNode(selected_node);
            } else if(selected_link) {
                links.splice(links.indexOf(selected_link), 1);
            }
            selected_link = null;
            selected_node = null;
            restart();
            break;
        case 66: // B
            if(selected_link) {
                // set link direction to both left and right
                selected_link.left = true;
                selected_link.right = true;
            }
            restart();
            break;
        case 76: // L
            if(selected_link) {
                // set link direction to left only
                selected_link.left = true;
                selected_link.right = false;
            }
            restart();
            break;
        case 82: // R
            if(selected_node) {
                // toggle node reflexivity
                selected_node.reflexive = !selected_node.reflexive;
            } else if(selected_link) {
                // set link direction to right only
                selected_link.left = false;
                selected_link.right = true;
            }
            restart();
            break;
        }
    }

    function keyup() {
        lastKeyDown = -1;

        // ctrl
        //if(d3.event.keyCode === 17) {
        if(d3.event.keyIdentifier == "Control" || d3.event.keyIdentifier == "Alt") {
            circle
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    }

    function show_tooltip(d, el) {
        tooltip.style("visibility", "visible");
        tooltip.style("top", d.y + 12 + "px")
            .style("left", d.x + 24 + "px")
        //tooltip.style("visibility", "hidden");});

    }


    // insert new node in the middle
    editor.add_node = function() {
      var node = {id: ++lastNodeId, reflexive: false};
      node.x = 0.1 * width;
      node.y = 0.1 * height;
      nodes.push(node);

      restart();
      return editor;
    }


    return editor;
  }
})