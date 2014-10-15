

define(['vendor/d3/d3'], function () { // 'd3' will be in the global namespace
  function MisformattedGJSONException(message) {
    this.message = message;
    this.name = "MisformattedGJSONException";
  }

  var graph_editor = function(graph, container, opts) {

    var ohub_id = opts.id || 'graph_editor';
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

    var hover_state = {primary: {}};
    //var hover_stack = [];
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
                // "_head": {} // interface on target
                // "_tail": {} // interface on source
            // },

    editor.state = function() {
      var interfaces = [];
      return {
        graph: {
          mode: 'NORMAL',
          edges: _.map(links, function(l) {
            var s = l.s;
            if (l.head) {
              var hs = l.head.state;
              interfaces.push(hs);
              //s._head = hs._id;
            }
            if (l.tail) {
              var ts = l.tail.state;
              interfaces.push(ts);
              //s._tail = ts._id;
            }
            return s;
          }),
          nodes: _.map(nodes, function(n) {
            var s = n.s;
            s._x = Math.floor(n.x); s._y = Math.floor(n.y);
            return s;
          }),
          interfaces: interfaces
        }
      };
    };

    editor.add_node = function(uuid, state) {
      return add_element('node', uuid, state);
    };

    editor.add_network = function(uuid, state) {
      return add_element('network', uuid, state);
    };

    editor.remove_element = function(uuid) {
      var node = _.find(nodes, function(n) { return n.id == uuid; });
      if (node) {
        remove_node(node);
      } else {
        var link = _.find(links, function(l) { return l.id == uuid; });
        if (link) {
          remove_link(link);
        }
      }
      _on_select(null);
      return editor;
    };


    // Call function 'f' when an element is selected
    //
    editor.on_selected = function(f) {
      on_select_functions.push(f);
      return editor;
    };

    // Return the selected element or null if none.
    editor.selected = function() {
      var selected = selected_node || selected_link || selected_node;
      return selected ? selected.s : null;
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

    editor.update_state = function(class_selector_f) {

      function klass_selector(d) {
        if ($(this).attr('class') == 'link_over') {
          return; // ignore invisible link overlay
        };
        var ca = [d.type];
        if (d.type == 'node' || d.type == 'network') {
          ca.push('element'); // All vertices like element have 'element' as class
        }
        if (class_selector_f) {
          var sc = class_selector_f(d.s);
          d.custom_class = sc;
          if (sc) ca.push(sc);
        } else {
          if (d.custom_class) ca.push(d.custom_class);
        }
        var health = (d.s || {})['health'] || 'unknown';
        ca.push(d.type + '_health_' + health);
        return ca.join(' ');
      }

      path
        .attr('class', klass_selector)
        .classed('link_selected', function(d) {
          return d === selected_link;
        })
        ;
      element
        .attr('class', klass_selector)
        .classed('element_selected', function(d) {
          return d === selected_node;
        })
        ;
      return editor;
    };

    // data ... {nodes: [], links: []}
    editor.data = function(data, remove_unused) {
      var graph = data.graph;
      if (! graph) {
        throw new MisformattedGJSONException("Missing top-level 'graph'");
      }
      var ns = {};
      _.each(nodes, function(n) {
        n.used = false; // to find out which node is still in 'data'
        ns[n._id] = n;
      });
      _.each(graph.nodes, function(n) {
        var nel = ns[n._id];
        if (! nel) {
          nel = {
            id: n._id,
            type: n._type,
            x: 0.5 * width,
            y: 0.5 * height,
            s: n
          };
          ns[n._id] = nel;
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
        ls[l._id] = l;
      });
      _.each(graph.edges, function(l) {
        var lel = ls[l._id];
        if (! lel) {
          lel = {
            id: l._id,
            type: l._type,
            source : ns[l._source], //from.node],
            target : ns[l._target], //to.node],
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

    editor.resize = function(w, h) {
      width = w;
      height = h;
      resize_svg();
      restart();
    };

    function add_element(type, uuid, state, suppress_restart) {
      if (! uuid) uuid = create_uuid();
      if (! state) state = {_id: uuid, _type: type};

      var el = {type: type, id: uuid, s: state};
      el.x = state._x || (Math.random() * width);
      el.y = state._x || (0.1 * height);
      nodes.push(el);

      if (!(suppress_restart == true)) restart();
      return el;
    };

    function remove_node(node) {
      var connecting_links = _.filter(links, function(l) {
        return l.source === node || l.target === node;
      });
      links = _.difference(links, connecting_links);
      nodes = _.filter(nodes, function(n) {
        return n != node;
      });
      restart();
    }

    // Add a link between 'source' and 'target' with 'state'. Optionally associate
    // state with the head and tail of the link (used for interfaces).
    //
    function add_link(source, target, uuid, state, head, tail) {
      if (! uuid) uuid = create_uuid();
      if (! state) {
        state = {_id: uuid, _type: 'link'};
      }
      state._source = source.id;
      state._target = target.id;

      var link = {id: uuid, type: 'link', source: source, target: target, s: state};
      if (tail || source.type == 'node') {
        if (! tail) {
          tail = { _id: create_uuid(), _type: 'interface', _node: source.id, _link: state._id };
        }
        link.tail = { id: tail._id, type: 'interface', target: source, neighbor: target, link: link, s: tail };
      }
      if (head || target.type == 'node') {
        if (! head) {
          head = { _id: create_uuid(), _type: 'interface', _node: target.id, _link: state._id };
        }
        link.head = { id: head._id, type: 'interface', target: target, neighbor: source, link: link, s: head };
      }
      links.push(link);
      return link;
    };

    function remove_link(link) {
      links = _.difference(links, link);
      restart();
    }


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

      restart_interfaces();
    }

    // update graph (called when needed)
    function restart() {
      restart_links();
      restart_elements();
      restart_interfaces();

      // Set classes based on data
      editor.update_state();

      // set the graph in motion
      force.links(links);  // just in case they changed
      force.nodes(nodes);
      force.start();
    }

    function restart_links() {
      var p = path_g.selectAll('.link_g').data(links, function(l) { return l.id; });
      var pe = p.enter().append('svg:g').attr('class', 'link_g');
      pe.append('line')
          .attr('class', 'link link_unknown')
          ;
      ;
      // Add an invisible line on top which is thicker and makes mouse selection easier
      pe.append('line')
          .attr('class', 'link_over')
          .on('click', function(d) {
            _on_select('link', d);
            d3.event.stopPropagation();
            restart();
          })
          .on('mouseover', function(d) {
            on_mouse_over('link', d, this);
          })
          .on('mouseout', function(d) {
            on_mouse_out('link', d, this, false);
          })
          ;

      // remove old links
      p.exit().remove();

      path_g.selectAll('.link')
        .classed('selected', function(d) {
          return d === selected_link;
        })
        ;

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
            .attr('class', 'network')
            .attr('r', 12)
            .call(element_event_handling)
            ;
      g.filter(function(d) {
            return d.type == 'node';
          })
          .append('svg:g')
            .attr('transform', 'translate(' + -12 + ', ' + -12 + ')')
            .append('svg:rect')
              .attr('class', 'node')
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
        .on('keydown', keydown)
        .on('click', function(d) {
          _on_select('node', d);
          d3.event.stopPropagation();
          restart();
        })
        .on('mouseover', function(d) {
          on_mouse_over('element', d, this);
        })
        .on('mouseout', function(d) {
          on_mouse_out('element', d, this, false);
        })
        .on('mousedown', function(d) {
          mousedown_node = {d: d};

          if (d3.event.ctrlKey || d3.event.altKey) {
            mousedown_node.action = 'node'; // drag node
            drag_line
                .classed('hidden', true);
            var pos = d3.mouse(this); //mouse location relative to element
            d.x_off = pos[0];
            d.y_off = pos[1];
           return;
          }
          // reposition drag line
          if (editable) {
            mousedown_node.action = 'link'; // drag link
            drag_line
                .classed('hidden', false)
                .style("visibility", "visible")
                .attr("x1",  d.x)
                .attr("y1",  d.y)
                .attr("x2",  d.x)
                .attr("y2",  d.y)
                // .on('click', function(d) {
                  // var i = 0;
                // })
                ;
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

          if (mousedown_node.action == 'link') {

            // add link to graph (update if exists)
            var source = mousedown_node.d;
            var target = mouseup_node;
            if (source === target) return; // loop

            var link;
            link = links.filter(function(l) {
              return (l.source === source && l.target === target);
            })[0];
            if (!link) {
              link = add_link(source, target);
            }

            // select new link
            _on_select('link', link);
          }
          restart();
        });
    }

    function _on_select(type, d) {
      //console.log("selected", d);
      _.each(_.compact([selected_node, selected_link, selected_interface]), function (s) { s.selected = false; });
      switch(type) {
        case 'link':
          selected_link = (d === selected_link) ? null : d;
          selected_node = selected_interface = null;
          break;

        case 'node':
          selected_node = (d === selected_node) ? null : d;
          selected_link = selected_interface = null;
          break;

        case 'interface':
          selected_interface = (d === selected_interface) ? null : d;
          selected_link = selected_node = null;
          break;

        case null:
          selected_link = selected_node = selected_interface = null;
          break;
      }
      var selected = selected_node || selected_link || selected_interface;
      if (selected) {
        selected.selected = true;
        selected.selected_at = new Date(); // debounce click in open canvas (see svg.on('click'))
        _.each(on_select_functions, function(f) {
          f(d.s, type);
        });
      }
      restart_interfaces(); // make sure unselected interfaces are being removed
      if (d3.event) d3.event.stopPropagation();
      OHUB.trigger(ohub_id + '.selected', {state: selected ? d.s : null, editor: editor});
    }

    function on_mouse_over(type, d, el) {
      // trigger potentially delayed 'mouse_out' event
      var dmo = hover_state.on_mouse_out;
      if (dmo) {
        if (type != 'interface') {
          on_mouse_out(dmo.type, dmo.d, dmo.el, true);
          hover_state.on_mouse_out = null;
        } else {
          hover_state.on_mouse_out.cancel_timer = true; // Tell potential timer to back off
        }
      }
      //hover_state.unhover[el] = null; // just in case we re-enter before unhover triggers
      //hover_stack.unshift({type: type, d: d, el: el});
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

    // When the mouse leaves a node or link and moves
    // over an associated interface we should still keep
    // the link or node activated. As we don't know that
    // immediately we need to delay executing it.
    //
    function on_mouse_out(type, d, el, immediate) {
      if (! immediate) {
        hover_state.on_mouse_out = {type: type, d: d, el: el};
        setTimeout(function() {
          // check if it is still needed
          var dmo = hover_state.on_mouse_out;
          if (dmo && dmo.el == el && dmo.cancel_timer != true) {
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
      }
      // hide all interfaces which were in 'hover' state
      interfaces_g.selectAll('.interface').each(function(d) { d.hover = false; });
      restart_interfaces();

      hide_tooltip();
    }


    function show_interfaces_on_element(element) {
      console.log("links: " + links.length, links);
      var ifs = _.compact(_.map(links, function(l) {
        if (l.source == element) return l.tail;
        if (l.target == element) return l.head;
      }));
      show_interfaces(ifs, true);
    }

    function show_interfaces_on_link(link) {
      var ifs = _.compact([link.head, link.tail]);
      show_interfaces(ifs, false);
    }

    // Show the interfaces for a set of links, either for a single element
    // or a single link. If 'target_selected' is true, the target element is
    // 'enlarged' and the interfaces need to be placed further away.
    //
    function show_interfaces(interfaces, target_selected) {
      var ifs = interfaces.map(function(l) {
        l.hover = true;
        return l;
      });
      interfaces_g.selectAll('.interface').data(ifs, function(d) {
        return d.id;
      })
        .enter().append('svg:circle')
          .attr('class', 'interface')
          .on('mouseover', function(d) {
            on_mouse_over('interface', d, this);
          })
          .on('mouseout', function(d) {
            on_mouse_out('interface', d, this, true);
          })
          .on('click', function(d, el) {
            d.el = this;
            _on_select('interface', d);
            restart();
          })
          ;
      restart_interfaces();
    }

    function restart_interfaces() {
      // Remove lingering interfaces
      var a = interfaces_g.selectAll('.interface').filter(function(d) {
        return !(d.selected || d.hover);
      }).remove();
      //var b = a.exit();//.remove();

      interfaces_g.selectAll('.interface')
        .each(update_interface_location)
        .classed('selected', function(d) {
          return d === selected_interface;
        })
        .attr('cx', function(d) {
          return d.x_off + d.target.x;
        })
        .attr('cy', function(d) { return d.y_off + d.target.y; })
        .attr('r', 8)
        ;
    }

    function update_interface_location(l) {
      var x, y;
      var element = l.target;
      //var n = l.source == element ? l.target : l.source;
      var n = l.neighbor;
      var dx = n.x - element.x;
      var dy = n.y - element.y;
      if (element.type == 'node') {
        var w = (element.selected && pop_on_mouse_over) ? 18 : 12;
        if (Math.abs(dx) > Math.abs(dy)) {
          x = (dx > 0) ? w : -1 * w;
          y = w * dy / Math.abs(dx);
        } else {
          x = w * dx / Math.abs(dy);
          y = (dy > 0) ? w : -1 * w;
        }
      } else {
        // network
        var d = Math.sqrt(dx * dx + dy * dy);
        var r = (element.selected && pop_on_mouse_over) ? 18 : 12;
        var frac = 1.0 * r / d;
        y = frac * dy;
        x = frac * dx;
      }
      l.x_off = x;
      l.y_off = y;

      if (x > Math.abs(y)) {
        l.dir = 'e';
      } else if (-1 * x > Math.abs(y)) {
        l.dir = 'w';
      } else if (y > Math.abs(x)) {
        l.dir = 'n';
      } else {
        l.dir = 's';
      }

    }

    function hide_unselected_interfaces() {
      restart_interfaces();
      // interfaces_g.selectAll('.interface').filter(function(d) {
        // return d.hover != true && d.selected != true;
      // }).remove();
    }

    function hide_interfaces() {
      restart_interfaces();
      // interfaces_g.selectAll('.interface').filter(function(d) {
        // //console.log(">> interface: " + (selected_interface != d) + " d: " + d.state.target._id);
        // return d != selected_interface;
      // }).remove();
    }

    function hide_interfaces_on_element() {
      hide_interfaces();
    }

    function hide_interfaces_on_link() {
      hide_interfaces();
    }

    function mousedown() {
      // prevent I-bar on drag
      //d3.event.preventDefault();

      // because :active only works in WebKit?
      svg.classed('active', true);

      if (d3.event.ctrlKey || d3.event.altKey || mousedown_node || mousedown_link) return;
    }

    function mousemove() {
      //console.log('mouse_move', mousedown_node);
      if(!mousedown_node) return;

      if (mousedown_node.action == 'node') {
        hide_tooltip();
        var pos = d3.mouse(this);
        var d = mousedown_node.d;
        d.x = pos[0] + d.x_off;
        d.y = pos[1] + d.y_off;
        tick();
        //restart();

      } else if (editable && mousedown_node.action == 'link') {
        // update drag line
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
        var html = tooltip_text_fn(d.s, d);
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
          .append('svg')
          .attr('class', 'graph_editor')
          ;
      // controller.on({
        // "change:width": function() { resize_svg(); restart(); },
        // "change:panel_height": function() { resize_svg(); restart(); }
      // });
      resize_svg();

      tooltip =  div.append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("z-index", "10")
          .style("visibility", "hidden")
          .text("a simple tooltip");


      // line displayed when dragging new nodes
      drag_line = svg.append('line')
          //.attr('class', 'link dragline hidden')
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
          .on('click', function(a, b, c) {
            // Clear any potentially selected element
            var sel = selected_link || selected_node || selected_interface;
            if (sel) {
              var delay = new Date() - sel.selected_at;
              if (delay > 100) { // msec
                _on_select(null);
                restart();
              }
            }
          })
          .on('keydown', function() {
            var i = 0;
          })

          .on('keyup', keyup)
          ;
      div.on('keydown', keydown)
          .on('keyup', keyup)
          .on('mouseover', function() {
            //div.node().focus();
          })
          .on('mouseout', function() {
            div.node().blur();
          })
          ;
      restart();
    });

    // Init
    if (graph) {
      editor.data(graph, false);
    }
//    if (graph) {
//      var nidx = {};
//      var ifidx = {};
//      _.each(graph.interfaces || [], function(inf) {
//        var link = inf._link;
//        var ifs = ifidx[link];
//        if (!ifs) ifs = ifidx[link] = [];
//        ifs.push(inf);
//      });
//      _.each(graph.nodes, function(n) {
//        var ne = nidx[n._id] = add_element(n._type, n._id, n, true);
//        if (n._x) ne.x = n._x;
//        if (n._y) ne.y = n._y;
//      });
//      _.each(graph.edges, function(e) {
//        var source = nidx[e._source];
//        var target = nidx[e._target];
//        if (source && target) {
//          var link = add_link(source, target, e._id, e);
//          var ifs = ifidx[e._id];
//          if (ifs) {
//            _.each(ifs, function(inf) {
//              var node = inf._node;
//              if (node == source.id) {
//                link.tail.state = inf;
//              } else {
//                link.head.state = inf;
//              }
//            });
//          }
//        }
//      });
//      restart();
//    }


    return editor;
  };

  return graph_editor;
});
