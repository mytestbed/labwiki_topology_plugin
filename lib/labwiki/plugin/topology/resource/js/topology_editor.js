
define(['theme/labwiki/js/labwiki', 'plugin/topology/js/graph_editor'], function (LW, GraphEditor) {

  var topology_editor = function(container, opts) {
    var editable = opts.editable || true;
    var toolbar_buttons = {};
    var graph_editor = GraphEditor(container.find('.canvas'), {
                          editable: editable,
                          height: 1.0, //opts.height || 0.5,
                          column_controller: LW.prepare_controller
                       });

    function widget() {};

    // --- INIT ----

    graph_editor.before_popup(function(d, id) {
      var t = "&nbsp;<b>ID:</b> " + id + "";
      return t;
    });

    // Toolbar buttons
    var pc = LW.prepare_controller;
    var b = toolbar_buttons;

    b.add_node = pc.add_toolbar_button({name: 'add-node', awsome: 'square-o', tooltip: 'Add Node', active: editable},
      function(ctxt) {
        graph_editor.add_node();
      });

    b.add_network = pc.add_toolbar_button({name: 'add-network', awsome: 'circle-o', tooltip: 'Add Network', active: false},
      function(ctxt) {
      });

    // widget.on_add_node_pressed = function() {
      // graph_editor.add_node();
      // return widget;
    // };

    return widget;
  };

  return topology_editor;
});
