
define(['theme/labwiki/js/labwiki', 'plugin/topology/js/graph_editor', 'theme/labwiki/js/form_builder'],
  function (LW, GraphEditor, FormBuilder) {

    var topology_editor = function(container, opts) {
      var editable = opts.editable || true;
      var topology_name = opts.topology_name;
      var toolbar_buttons = {};
      var selected_element = null;

      var parameters = {
        node: {
          name: { label: 'Name', type: 'text' },
          urn: { label: 'URN', optional: true, size: 24 },
          sliver_type: { label: 'Sliver Type', type: 'text', def_value: null},
          disk_image: { label: 'Disk Image', type: 'text', size: 24, def_value: null},
          exclusive: {label: 'Exclusive?', type: 'boolean', def_value: false}
        },
        network: {
          name: { label: 'Name', type: 'text' },
          netmask: { label: 'Netmask', type: 'text', def_value: '255.255.255.0' },
        },
        interface: {
          name: { label: 'Name', type: 'text' },
          ip: { label: 'IP Address', type: 'text' },
          netmask: { label: 'Netmask', type: 'text', def_value: '255.255.255.0' },
        },
        link: {
          capacity: { label: 'Capacity', type: 'int', def_value: false },
          delay: { label: 'Delay', type: 'int', def_value: false },
        }
      };

      var sample_graph = {nodes: [{_id:"8ec2c565-c3b5-452c-be2b-d58d18fe590b", _type:"node", _x:269, _y:218},
                           {_id:"98020d5a-2888-446c-990b-c37d8fe37f37", _type:"node", _x:205, _y:90}],
                   edges: [{_id:"5bcbcfa4-e624-41f6-8ab5-6fd712ab6fcc", _type:"link",
                              _source:"8ec2c565-c3b5-452c-be2b-d58d18fe590b", _target:"98020d5a-2888-446c-990b-c37d8fe37f37"}]
                };

      var controller = LW.prepare_controller;
      var width = Math.floor(controller.get('width'));
      var height = Math.floor(controller.get('panel_height') - 230);

      var graph_editor_id = opts.wid + '-ge';
      var graph_editor = GraphEditor(sample_graph, container.find('.topology_editor'), {
                            id: graph_editor_id,
                            editable: editable,
                            width: width, height: height,
                            column_controller: LW.prepare_controller
                         });

      var entity_editor = FormBuilder(container.find('.element_state'));

      function widget() {};

      widget.show_details_for = function(entity) {
        if (! entity) {
          entity_editor({rows: []}); // empty form
          return widget;
        }
        var pd = parameters[entity._type];
        var rows = _.map(pd, function(ed, id){
          ed.id = id;
          ed.value = entity[id];
          if (ed.def_value_entity) {
            ed.def_value = ed.def_value_entity[id];
          }
          ed._entity = entity;
          return ed;
        });
        entity_editor({rows: rows});
        return widget;
      };

      // Remove selected element
      function on_remove() {
        graph_editor.remove_element(selected_element._id);
      }

      // Return a description of the currently displayed graph
      //
      function graph() {
        var graph = graph_editor.state().graph;
        var defs = graph.defaults = {};
        _.each(parameters, function(ey_def, name) {
          var ey = defs[name] = {};
          _.each(ey_def, function(def, name) {
            if (def.def_value_entity) {
              ey[name] = {ref: def.def_value_entity._id};
            } else if (def.def_value) {
              ey[name] = {value: def.def_value};
            }
          });
        });
        return graph;
      }


      // --- INIT ----

      OHUB.bind(graph_editor_id + '.selected', function(ev) {
        var b = toolbar_buttons;
        selected_element = ev.state;
        toolbar_buttons.remove.enable(selected_element != null);
        widget.show_details_for(selected_element);
      });

      entity_editor.on_change(function(value, row) {
        row._entity[row.id] = value;
      });

      // Add a checkbok to mark some of the entries as defaults for all otehr entities of the same type
      entity_editor.on_row_built(function(rdecl, row, rowId) {
        if (!_.has(rdecl, 'def_value')) return;

        var vc = $('<input />');
        vc.change(function() {
          if (vc.is(':checked')) {
            rdecl.def_value_entity = rdecl._entity;
          } else if (rdecl.def_value_entity == rdecl._entity) {
            rdecl.def_value_entity = null;
          }
        });
        vc.attr('type', 'checkbox');
        vc.attr('class', "field def_value fn");
        if (rdecl.def_value_entity == rdecl._entity) {
          vc.attr('checked', 'checked');
        }
        $('<td />').attr('class', 'row_def_value').append('<span>Def</span>').append(vc).appendTo(row);
      });


      graph_editor.before_popup(function(entity) {
        var name = entity.name;
        if (!name) {
          if (entity._id) {
            name = entity._id.slice(28);
          } else {
            name = 'Unknown';
          }
        }
        var t = "&nbsp;<b>" + (entity._type || 'Unknown') + ":</b> " + name + "";
        return t;
      });

      // Toolbar buttons
      var pc = LW.prepare_controller;
      var b = toolbar_buttons;

      b.save = pc.add_toolbar_button({name: 'save', awsome: 'floppy-o', tooltip: 'Save', active: true},
        function() {
          // var graph = graph_editor.state().graph;
          // var defs = graph.defaults = {};
          // _.each(parameters, function(ey_def, name) {
            // var ey = defs[name] = {};
            // _.each(ey_def, function(def, name) {
              // if (!def.def_value) return;
              // var e = ey[name] = {value: def.def_value};
              // if (def.def_value_entity) e.entity = def.def_value_entity._id;
            // });
          // });
          var g = graph();
          var opts = {
            action: 'save',
            col: 'prepare',
            plugin: 'topology',
            graph: g,
            topology_name: topology_name
          };
          LW.plan_controller.request_action(opts, 'POST', function(reply) {
            var i = 0;
          });
          return false;
        });
      b.undo = pc.add_toolbar_button({name: 'undo', awsome: 'undo', tooltip: 'Undo', active: false}, function() {
        self.on_undo_pressed();
        return false;
      });
      b.redo = pc.add_toolbar_button({name: 'redo', awsome: 'repeat', tooltip: 'Redo', active: false}, function() {
        self.on_redo_pressed();
        return false;
      });
      b.remove = pc.add_toolbar_button({name: 'remove', glyph: 'remove', tooltip: 'Delete', active: false}, function() {
        on_remove();
        return false;
      });

      pc.add_toolbar_separator();

      b.add_node = pc.add_toolbar_button({name: 'add-node', awsome: 'square-o', tooltip: 'Add Node', active: editable},
        function(ctxt) {
          graph_editor.add_node();
        });

      b.add_network = pc.add_toolbar_button({name: 'add-network', awsome: 'circle-o', tooltip: 'Add Network', active: editable},
        function(ctxt) {
          graph_editor.add_network();
        });

      // widget.on_add_node_pressed = function() {
        // graph_editor.add_node();
        // return widget;
      // };

      return widget;
    };

    return topology_editor;
  }
);
