

define(['vendor/d3/d3'], function () { // 'd3' will be in the global namespace

  var graph_editor = function(graph, container, opts) {

    var controller = opts['column_controller'];
    var width = opts['width'] || Math.floor(controller.get('width'));
    var height = opts['height'] || 0.5;
    if (height <= 1) {
      height = Math.floor(height * controller.get('panel_height'));
    }
    var editable = opts['editable'] != undefined ? opts['editable'] : true;
    var pop_on_mouse_over = opts['pop_on_mouse_over'] || false;

    var svg;
    var tooltip;
    var tooltip_text_fn = null; // Function to call before showing tooltip
    var drag_line;
    var force;
    var path, path_g;
    var element, element_g;
    var interfaces, interfaces_g;

    var nodes = [];
    var lastNodeId = 2;
    var links = [];

    var hover_state = {unhover: {}};
    var hover_scale = 1.5; // By how much to scale up an element on mouse hover

    // mouse event vars
    var selected_node = null, selected_link = null, selected_interface = null;
    var mousedown_link = null, mousedown_node = null, mouseup_node = null;
    var on_select_functions = [];

    var editor = {};

    // Return the state of the network currently held by this editor.
    //
    // Returns: {nodes: [nodes], links: [links]}
    //"graph": {
        // "mode":"NORMAL",
        // "nodes": [
            // {
                // "name": "lop",
                // "lang": "java",
                // "_id": "3",
                // "_type": "vertex"
            // }, ...
        // ],
        // "edges": [
            // {
                // "weight": 1,
                // "_id": "10",
                // "_type": "edge",
                // "_source": "4",
                // "_target": "5",
                // "_label": "created"
            // },

    editor.state = function() {
      return {
        graph: {
          mode: 'NORMAL',
          nodes: _.map(nodes, function(n) {
            var s = n.state;
            s._x = Math.floor(n.x); s._y = Math.floor(n.y);
            return s;
          }),
          edges: _.map(links, function(l) {return l.state;})
        }
      };
    };

    editor.add_node = function(uuid, state) {
      return add_element('node', uuid, state);
    };

    editor.add_network = function(uuid, state) {
      return add_element('network', uuid, state);
    };

    // Call function 'f' when an element is selected
    //
    editor.on_selected = function(f) {
      on_select_functions.push(f);
      return editor;
    };

    // editor.add_link = function(source, target, uuid, state) {
      // add_link(source, target, uuid, state);
      // restart();
      // return editor;
    // };

    // Set function which populates popup
    //
    editor.before_popup = function(fn) {
      tooltip_text_fn = fn;
      return editor;
    };

    editor.update = function() {
      //path = path.data(links, function(l) { return l.uuid; });
      path
        .classed('link_selected', function(d) { return d === selected_link; })
        .classed('link_up', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'up'); }
          return false;
        })
        .classed('link_down', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'down'); }
          return false;
        })
        .classed('link_unknown', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'unknown'); }
          return true;
        })
        ;
      element
        .classed('element_selected', function(d) {
          return d === selected_node;
        })
        .classed('node_up', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'up'); }
          return false;
        })
        .classed('node_down', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'down'); }
          return false;
        })
        .classed('node_unknown', function(d) {
          if (d.s && d.s.health) { return(d.s.health == 'unknown'); }
          return true;
        })
        ;

      //restart();
      return editor;
    };

    // data ... {nodes: [], links: []}
    editor.data = function(data, remove_unused) {
      var ns = {};
      _.each(nodes, function(n) {
        n.used = false; // to find out which node is still in 'data'
        ns[n.uuid] = n;
      });
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
      });
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
    };

    function add_element(type, uuid, state, suppress_restart) {
      if (! uuid) uuid = create_uuid();
      if (! state) state = {_id: uuid, _type: type};

      var el = {type: type, id: uuid, state: state};
      el.x = state._x || (Math.random() * width);
      el.y = state._x || (0.1 * height);
      nodes.push(el);

      if (!(suppress_restart == true)) restart();
      return el;
    };

    function add_link(source, target, uuid, state) {
      if (! uuid) uuid = create_uuid();
      if (! state) {
        state = {_id: uuid, _type: 'link'};
      }
      state._source = source.id;
      state._target = target.id;

      link = {id: uuid, source: source, target: target, state: state};
      links.push(link);
      return link;
    };

    function create_uuid() {
      // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                  });
      return uuid;
    };

    function resize_svg() {
      //var w = Math.floor(width * controller.get('width'));
      //var h = Math.floor(height * controller.get('panel_height'));
      svg.attr('width', width)  // controller may not have been properly resized
         .attr('height', height);
      force.size([width, height]);
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

      element.attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    }

    // update graph (called when needed)
    function restart() {
      restart_links();
      restart_elements();

      // Set classes based on data
      editor.update();

      // set the graph in motion
      force.start();
    }

    function restart_links() {
      var p = path_g.selectAll('.link_g').data(links, function(l) { return l.id; });
      var pe = p.enter().append('svg:g').attr('class', 'link_g');
      pe.append('line')
          .attr('class', 'link link_unknown')
          .classed('selected', function(d) {
            return d === selected_link;
          })
          ;
      // Add an invisible line on top which is thicker and makes mouse selection easier
      pe.append('line')
          .attr('class', 'link_over')
          .on('click', function(d) {
            _on_select('link', d);
            restart();
          })
          // .on('mousedown', function(d) {
              // if(d3.event.ctrlKey || d3.event.altKey) return;
//
              // // select link
              // mousedown_link = d;
              // //restart();
          // })
          .on('mouseover', function(d) {
            on_mouse_over('link', d, this);
          })
          .on('mouseout', function(d) {
            on_mouse_out('link', d, this, false);
          })
          ;

      // remove old links
      p.exit().remove();

      // Update 'path' for tick.
      path = path_g.selectAll('line');
    }

    function restart_elements() {
      var c = element_g.selectAll('.element').data(nodes, function(d) { return d.id; });

      // add new nodes
      var g = c.enter().append('svg:g').attr("class", "element");
      g.filter(function(d) {
            return d.type == 'network';
          })
          .append('svg:circle')
            .attr('class', 'network network_unknown')
            .attr('r', 12)
            .call(element_event_handling)
            ;
      g.filter(function(d) {
            return d.type == 'node';
          })
          .append('svg:g')
            .attr('transform', 'translate(' + -12 + ', ' + -12 + ')')
            .append('svg:rect')
              .attr('class', 'node node_unknown')
              .attr('width', 2 * 12)
              .attr('height', 2 * 12)
              .attr('ry', 4)
              .attr('ry', 4)
              .call(element_event_handling)
              ;

      // remove old nodes
      c.exit().remove();

      // UPdate for 'tick'
      element = element_g.selectAll('.element');
    }

    function element_event_handling(selection) {
      selection
        .on('click', function(d) {
          _on_select('node', d);
          restart();
        })
        .on('mouseover', function(d) {
          on_mouse_over('element', d, this);
        })
        .on('mouseout', function(d) {
          on_mouse_out('element', d, this, false);
        })
        .on('mousedown', function(d) {
          if (d3.event.ctrlKey || d3.event.altKey) return;
          // reposition drag line
          mousedown_node = d;
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
        })
        .on('mouseup', function(d) {
          if (!mousedown_node) return;

          // needed by FF
          drag_line
            .classed('hidden', true);

          // check for drag-to-self
          mouseup_node = d;
          if (mouseup_node === mousedown_node) {
            resetMouseVars();
            return;
          }

          // unenlarge target node
          d3.select(this).attr('transform', '');

          // add link to graph (update if exists)
          var source, target, direction;
          if(mousedown_node.id < mouseup_node.id) {
            source = mousedown_node;
            target = mouseup_node;
          } else {
            source = mouseup_node;
            target = mousedown_node;
          }

          var link;
          link = links.filter(function(l) {
            return (l.source === source && l.target === target);
          })[0];
          if (!link) {
            link = add_link(source, target);
          }

          // select new link
          _on_select('link', link);
          // selected_link = link;
          // selected_node = selected_interface = null;
          restart();
        });
    }

    function _on_select(type, el) {
      switch(type) {
        case 'link':
          selected_link = (el === selected_link) ? null : el;
          selected_node = selected_interface = null;
          break;

        case 'node':
          selected_node = (el === selected_node) ? null : el;
          selected_link = selected_interface = null;
          break;

        case 'interface':
          selected_interface = (el === selected_interface) ? null : el;
          selected_link = selected_node = null;
          break;
      }
      if (selected_node || selected_link || selected_node) {
        _.each(on_select_functions, function(f) {
          f(el.state, type);
        });
      }
    }

    function on_mouse_over(type, d, el) {
      hover_state.unhover[el] = null; // just in case we re-enter before unhover triggers
      if (type == 'element') {
        // enlarge target node
        if (pop_on_mouse_over) {
          d3.select(el).attr('transform', 'scale(' + hover_scale + ')');
          if (d.type == 'node') {
            // also translate parent
            var p = d3.select(el.parentNode);
            var o = -1 * 12 * hover_scale;
            p.attr('transform', 'translate(' + o + ', ' + o + ')'); // see 'restart_elements'
          }
        }
        show_interfaces_on_element(d);
        show_tooltip(d, d3.select(el), 'element');
      } else if (type == 'link') {
        show_interfaces_on_link(d);
        show_tooltip(d, d3.select(el), 'link');
      } else {
        show_tooltip(d, d3.select(el), 'interface');
      }
    }

    function on_mouse_out(type, d, el, delayed) {
      if (! delayed) {
        hover_state.unhover[el] = {type: type, d: d};
        setTimeout(function() {
          // check if it is still needed
          if (hover_state.unhover[el]) {
            on_mouse_out(type, d, el, true);
          }
        }, 400);
        return;
      }

      if (type == 'element') {
        d3.select(el).attr('transform', '');
        if (d.type == 'node') {
          // also translate parent
          var p = d3.select(el.parentNode);
          var o = -1 * 12;
          p.attr('transform', 'translate(' + o + ', ' + o + ')'); // see 'restart_elements'
        }
        hide_interfaces_on_element();
      } else if (type == 'link') {
        hide_interfaces_on_link(d);
      }
      hide_tooltip();
    }


    function show_interfaces_on_element(element) {
      var ifs = links.filter(function(l) {
        return l.source == element || l.target == element;
      }).map(function(l) {
        return {
          target: element,
          neighbor: (l.source == element ? l.target : l.source),
          link: link
        };
      });
      show_interfaces(ifs, true);
    }

    function show_interfaces_on_link(link) {
      var ifs = [
        { target: link.source, neighbor: link.target, link: link },
        { target: link.target, neighbor: link.source, link: link }
      ];
      show_interfaces(ifs, false);
    }

    // Show the interfaces for a set of links, either for a single element
    // or a single link. If 'target_selected' is true, the target element is
    // 'enlarged' and the interfaces need to be placed further away.
    //
    function show_interfaces(links, target_selected) {
      var ifs = links.map(function(l) {
        var x, y;
        var element = l.target;
        //var n = l.source == element ? l.target : l.source;
        var n = l.neighbor;
        var dx = n.x - element.x;
        var dy = n.y - element.y;
        if (element.type == 'node') {
          var w = (target_selected && pop_on_mouse_over) ? 18 : 12;
          if (Math.abs(dx) > Math.abs(dy)) {
            x = (dx > 0) ? w : -1 * w;
            y = w * dy / Math.abs(dx);
          } else {
            x = w * dx / Math.abs(dy);
            y = (dy > 0) ? w : -1 * w;
          }
        } else {
          var d = Math.sqrt(dx * dx + dy * dy);
          var r = (target_selected && pop_on_mouse_over) ? 18 : 12;
          var frac = 1.0 * r / d;
          y = frac * dy;
          x = frac * dx;
        }
        var dir;
        if (x > Math.abs(y)) {
          dir = 'e';
        } else if (-1 * x > Math.abs(y)) {
          dir = 'w';
        } else if (y > Math.abs(x)) {
          dir = 'n';
        } else {
          dir = 's';
        }
        return {
          x: x + element.x,
          y: y + element.y,
          dir: dir,
          state: {target: l.target.state, neighbor: l.neighbor.state, link: l.link.state}
        };
      });
      interfaces_g.selectAll('.interface').data(ifs).enter().append('svg:circle')
        .attr('class', 'interface')
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) { return d.y; })
        .attr('r', 8)
        .classed('selected', function(d) {
          return d === selected_interface;
        })
        .on('mouseover', function(d) {
          on_mouse_over('interface', d, this);
        })
        .on('mouseout', function(d) {
          on_mouse_out('interface', d, this, false);
        })
        .on('mousedown', function(d) {
          _on_select('interface', d);
          restart();
        })
        ;
      var i = 0;
    }

    function hide_interfaces_on_element() {
      interfaces_g.selectAll('.interface').remove();
    }

    function hide_interfaces_on_link() {
      interfaces_g.selectAll('.interface').remove();
    }

    function mousedown() {
      // prevent I-bar on drag
      //d3.event.preventDefault();

      // because :active only works in WebKit?
      svg.classed('active', true);

      if (d3.event.ctrlKey || d3.event.altKey || mousedown_node || mousedown_link) return;
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
          element.call(force.drag);
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
          element
              .on('mousedown.drag', null)
              .on('touchstart.drag', null);
          svg.classed('ctrl', false);
      }
    }

    function show_tooltip(d, el, type) {
      if (tooltip_text_fn) {
        var html = tooltip_text_fn(d.state, d);
        if (html) { tooltip.html(html); }
      }
      tooltip.style("visibility", "visible");
      //tooltip.node().blur();
      var x, y;
      if (type == 'link') {
        x = (d.source.x + d.target.x) / 2 + 5;
        y = (d.source.y + d.target.y) / 2 + 5;
      } else {
        x = d.x + 24;
        y = d.y + 12;
      }
      tooltip.style("top", y + "px")
             .style("left", x + "px");
    }

    function hide_tooltip() {
      tooltip.style("visibility", "hidden");
    }



    //------ INIT -------

    container.each(function() {
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


      path_g = svg.append('svg:g').attr("class", "paths");
      element_g = svg.append('svg:g').attr("class", "elements");
      interfaces_g = svg.append('svg:g').attr("class", "interfaces");

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
    });

    // Init
    if (graph) {
      var nidx = {};
      _.each(graph.nodes, function(n) {
        nidx[n._id] = add_element(n._type, n._id, n, true);
      });
      _.each(graph.edges, function(e) {
        var source = nidx[e._source];
        var target = nidx[e._target];
        if (source && target) {
          add_link(source, target, e._id, e);
        }
      });
      restart();
    }


    return editor;
  };

  return graph_editor;
});
