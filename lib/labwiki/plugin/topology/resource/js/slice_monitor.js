
define(['theme/labwiki/js/labwiki', 'plugin/topology/js/graph_editor', 'theme/labwiki/js/form_builder'],
  function (LW, GraphEditor, FormBuilder) {

    var slice_monitor = function(controller, opts) {
      //controller.show_alert('info', 'Your slice request has been sent to slice authority service');

      var uuid2el = {};
      var graph_editor = null;

      function initGraphEditor(container, graph) {
        topology = graph.graph;
        if (topology.edges) {
          topology.links = topology.edges; // TODO: Hack for shortcoming in SliceService
        }
        _.each(topology.nodes, function(n) { uuid2el[n._id] = n; });
        _.each(topology.links, function(l) { uuid2el[l._id] = l; });
        graph_editor = GraphEditor(graph, container.find('.graph_editor'), {
          //id: graph_editor_id,
          height: 1.0,
          editable: false,
          //width: width, height: height, // resize below
          column_controller: controller
        });
        //graph_editor.update_state()

        graph_editor.before_popup(function(d) {
          var t = "&nbsp;<b>" + d.name + "</b>";
          if (d.type == 'link') {
            if (d.from.ip_address) { t += ' ' + d.from.ip_address; }
            if (d.to.ip_address) { t += ' - ' + d.to.ip_address; }
          }
          return t;
        });
      }

      function widget() {};

      widget.render = function(container) {
        OHUB.bind('data_source.' + opts['topology_ds_name'] + '.changed', function(evt) {
          var r = evt.data_source.rows()[0];
          if (r[1] != 'ok') {
            controller.show_alert('warn', 'Some issues with obtaining slice\'s topology');
            return;
          }
          var topology = r[2];
          initGraphEditor(container, topology);
        });

        OHUB.bind('data_source.' + opts['health_ds_name'] + '.changed', function(evt) {
          if (!graph_editor) return;

          var rows = evt.data_source.rows();
          _.each(rows, function(row) {
            var uuid = row[1];
            var el = uuid2el[uuid];
            if (el) {
              var health = row[3];
              el['health'] = health;
            }
          });
          graph_editor.update_state();
        });

        return widget;
      };

      return widget;
    };

    return slice_monitor;
  }
);
