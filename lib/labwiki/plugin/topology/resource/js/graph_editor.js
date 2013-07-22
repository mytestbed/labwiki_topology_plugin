

L.provide('LW.plugin.topology.graph_editor', ["vendor/d3/d3.js"], function () {

  LW.plugin.topology.graph_editor = function(opts) {

    var controller = opts['column_controller'];
    var width = opts['width'] ? opts['width'] : 1;
    var height = opts['height'] ? opts['height'] : 0.5;
    var editable = opts['editable'] != undefined ? opts['editable'] : true;

    var svg;
    var tooltip;
    var tooltip_text_fn = null; // Function to call before showing tooltip
    var drag_line;
    var force;
    var path;
    var circle;

    // set up initial nodes and links
    //  - nodes are known by 'id', not by index in array.
    //  - reflexive edges are indicated on the node (as a bold black circle).
    //  - links are always source < target; edge directions are set by 'left' and 'right'.
    var nodes = []
    var lastNodeId = 2;
    var links = [];

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
            .style("z-index", "10")
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
            .on('mouseup', mouseup)
            ;
        div.on('keydown', keydown)
            .on('keyup', keyup)
            .on('mouseover', function() {
              div.node().focus();
            })
            .on('mouseout', function() {
              div.node().blur();
            })
            ;
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
        path = path.data(links, function(l) { return l.uuid; });

        // update existing links
        path.classed('selected', function(d) { return d === selected_link; })
        path.classed('link_up', function(d) {
          if (d.s) { return(d.s.health == 'up'); }
          return false;
        })
        path.classed('link_down', function(d) {
          if (d.s) { return(d.s.health == 'down'); }
          return false;
        })
        path.classed('link_unknown', function(d) {
          if (d.s) { return(d.s.health == 'unknown'); }
          return true;
        })
        ;


        // add new links
        path.enter().append('line')
            .attr('class', 'link link_unknown')
            .classed('selected', function(d) { return d === selected_link; })
            .on('mousedown', function(d) {
                if(d3.event.ctrlKey || d3.event.altKey) return;

                // select link
                mousedown_link = d;
                if(mousedown_link === selected_link) selected_link = null;
                else selected_link = mousedown_link;
                selected_node = null;
                restart();
            })
            .on('mouseover', function(d) {
                show_tooltip(d, d3.select(this), false);
            })
            .on('mouseout', function(d) {
                hide_tooltip();
            })
            ;

        // remove old links
        path.exit().remove();


        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = circle.data(nodes, function(d) { return d.uuid; });

        // update existing nodes (reflexive & selected visual states)
        circle.selectAll('circle')
            .classed('selected', function(d) { return d === selected_node;; })
            .classed('node_up', function(d) {
              if (d.s.health) { return(d.s.health == 'up'); }
              return false;
            })
            .classed('node_down', function(d) {
              if (d.s.health) { return(d.s.health == 'down'); }
              return false;
            })
            .classed('node_unknown', function(d) {
              if (d.s.health) { return(d.s.health == 'unknown'); }
              return true;
            })
            ;

        // add new nodes
        var g = circle.enter().append('svg:g');

        g.append('svg:circle')
            .attr('class', 'node node_unknown')
            .attr('r', 12)
            .on('mouseover', function(d) {
                //if(!mousedown_node || d === mousedown_node) return;
                // enlarge target node
                d3.select(this).attr('transform', 'scale(1.5)');
                show_tooltip(d, d3.select(this), true);
            })
            .on('mouseout', function(d) {
                //if(!mousedown_node || d === mousedown_node) return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
                hide_tooltip();
            })
            .on('mousedown', function(d) {
                if (d3.event.ctrlKey || d3.event.altKey) return;

                // select node
                mousedown_node = d;
                if(mousedown_node === selected_node) selected_node = null;
                else selected_node = mousedown_node;
                selected_link = null;

                // reposition drag line
                if (editable) {
                  drag_line
                      .classed('hidden', false)
                      .style("visibility", "visible")
                      .attr("x1",  mousedown_node.x)
                      .attr("y1",  mousedown_node.y)
                      .attr("x2",  mousedown_node.x)
                      .attr("y2",  mousedown_node.y);
                  //force.stop();
                }
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
        // g.append('svg:text')
            // .attr('x', 0)
            // .attr('y', 4)
            // .attr('class', 'id')
            // .text(function(d) { return d.id; });

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
        if (editable) {
          hide_tooltip();
          var pos = d3.mouse(this);
          drag_line.attr("x2", pos[0])
              .attr("y2", pos[1]);
        }
        //restart();
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
            if (! editable) break;

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

    function show_tooltip(d, el, is_node) {
      if (tooltip_text_fn) {
        var html = tooltip_text_fn(d.s, d.id);
        if (html) { tooltip.html(html); }
      }
      tooltip.style("visibility", "visible");
      //tooltip.node().blur();
      var x, y;
      if (is_node) {
        x = d.x + 24;
        y = d.y + 12;
      } else {
        x = (d.source.x + d.target.x) / 2 + 5;
        y = (d.source.y + d.target.y) / 2 + 5;
      }
      tooltip.style("top", y + "px")
             .style("left", x + "px");
    }

    function hide_tooltip() {
      tooltip.style("visibility", "hidden");
    }

    // insert new node in the middle
    editor.add_node = function() {
      // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                  });
      var node = {id: uuid, s: {}};
      node.x = 0.1 * width;
      node.y = 0.1 * height;
      nodes.push(node);

      restart();
      return editor;
    }

    // Set function which populates popup
    //
    editor.before_popup = function(fn) {
      tooltip_text_fn = fn;
      return editor;
    }

    editor.update = function() {
      //path = path.data(links, function(l) { return l.uuid; });
      path
        .classed('link_up', function(d) {
          if (d.s.health) { return(d.s.health == 'up'); }
          return false;
        })
        .classed('link_down', function(d) {
          if (d.s.health) { return(d.s.health == 'down'); }
          return false;
        })
        .classed('link_unknown', function(d) {
          if (d.s.health) { return(d.s.health == 'unknown'); }
          return true;
        })
        ;
      circle.selectAll('circle')
        .classed('node_up', function(d) {
          if (d.s.health) { return(d.s.health == 'up'); }
          return false;
        })
        .classed('node_down', function(d) {
          if (d.s.health) { return(d.s.health == 'down'); }
          return false;
        })
        .classed('node_unknown', function(d) {
          if (d.s.health) { return(d.s.health == 'unknown'); }
          return true;
        })
        ;

      //restart();
      return editor;
    }

    // data ... {nodes: [], links: []}
    editor.data = function(data, remove_unused) {
      var ns = {};
      _.each(nodes, function(n) {
        n.used = false; // to find out which node is still in 'data'
        ns[n.uuid] = n;
      })
      _.each(data.nodes, function(n) {
        var nel = ns[n.uuid];
        if (! nel) {
          nel = {
            uuid: n.uuid,
            x: 0.5 * width,
            y: 0.5 * height,
            s: n
          };
          ns[n.uuid] = nel;
          nodes.push(nel);
        }
        nel['used'] = true;
      });
      // remove unsed nodes
      if (remove_unused) {
        for (var i = nodes.length - 1; i >= 0; i--) { // need to do from back
          if (! nodes[i].used) {
            nodes.splice(i, 1);
          }
        }
      }
      // Now same for links
      var ls = {};
      _.each(links, function(l) {
        l.used = false; // to find out which link is still in 'data'
        ls[l.uuid] = l;
      })
      _.each(data.links, function(l) {
        var lel = ls[l.uuid];
        if (! lel) {
          lel = {
            uuid: l.uuid,
            source : ns[l.from.node],
            target : ns[l.to.node],
            s: l
          };
          links.push(lel);
        }
        lel['used'] = true;
      });
      // remove no longer used links
      if (remove_unused) {
        for (var i = links.length - 1; i >= 0; i--) { // need to do from back
          if (! links[i].used) {
            links.splice(i, 1);
          }
        }
      }

      restart();
      return editor;
    }

    return editor;
  }
})