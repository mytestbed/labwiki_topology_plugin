
/**
if (typeof(LW.plugin) == "undefined") LW.plugin = {};
if (typeof(LW.plugin.topology) == "undefined") LW.plugin.topology = {};
**/

L.provide('LW.plugin.topology.topology_editor', ['#LW.init', '/plugin/topology/js/graph_editor.js', '#LW.plugin.topology.graph_editor'], function () {

  LW.plugin.topology.topology_editor = function(opts) {
    var graph_editor = LW.plugin.topology.graph_editor({
                          height: 0.5,
                          column_controller: LW.prepare_controller
                       });;

    function widget() {};

    widget.render = function(divs) {
      graph_editor(divs);
      return widget;
    }

    widget.on_add_node_pressed = function() {
      graph_editor.add_node();
      return widget;
    }

    return widget;
  }

});
