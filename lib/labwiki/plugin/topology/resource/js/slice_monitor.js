
/**
if (typeof(LW.plugin) == "undefined") LW.plugin = {};
if (typeof(LW.plugin.topology) == "undefined") LW.plugin.topology = {};
**/

L.provide('LW.plugin.topology.slice_monitor', ['#LW.init', '/plugin/topology/js/graph_editor.js', '#LW.plugin.topology.graph_editor'], function () {

  LW.plugin.topology.slice_monitor = function(opts) {
    var graph_editor = LW.plugin.topology.graph_editor({
                          height: 1.0,
                          editable: false,
                          column_controller: LW.execute_controller
                       });
    var topology = opts['topology'];
    var uuid2el = {};
    _.each(topology.nodes, function(n) { uuid2el[n.uuid] = n; });
    _.each(topology.links, function(l) { uuid2el[l.uuid] = l; });

    function widget() {};

    widget.render = function(divs) {
      graph_editor(divs);
      //graph_editor.data({nodes: nodes, links: links}, true);
      graph_editor.data(topology, true);
      graph_editor.before_popup(function(d) {
        var t = "&nbsp;<b>" + d.name + "</b>";
        if (d.type == 'link') {
          if (d.from.ip_address) { t += ' ' + d.from.ip_address }
          if (d.to.ip_address) { t += ' - ' + d.to.ip_address }
        }
        return t;
      });
      OHUB.bind('data_source.' + opts['health_ds'] + '.changed', function(evt) {
        var rows = evt.data_source.rows();
        _.each(rows, function(row) {
          var uuid = row[1];
          var el = uuid2el[uuid];
          if (el) {
            var health = row[3];
            el['health'] = health;
          }
        });
        graph_editor.update();
      })

      return widget;
    }

    return widget;
  }

});
