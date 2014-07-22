
define(['theme/labwiki/js/labwiki', 'plugin/topology/js/graph_editor', 'theme/labwiki/js/form_builder'],
  function (LW, GraphEditor, FormBuilder) {

    var slice_monitor = function(container, controller, opts) {
      controller.show_alert('info', 'Your slice request has been sent to slice authority service');

      var topology = opts['topology'];
      var uuid2el = {};
      _.each(topology.nodes, function(n) { uuid2el[n.uuid] = n; });
      _.each(topology.links, function(l) { uuid2el[l.uuid] = l; });

      var graph_editor = GraphEditor(topology, container.find('.graph_editor'), {
                          //id: graph_editor_id,
                          height: 1.0,
                          editable: false,
                          //width: width, height: height, // resize below
                          column_controller: controller
                       });

      function widget() {};

      widget.render = function(divs) {
        graph_editor(divs);
        //graph_editor.data({nodes: nodes, links: links}, true);
        graph_editor.data(topology, true);
        graph_editor.before_popup(function(d) {
          var t = "&nbsp;<b>" + d.name + "</b>";
          if (d.type == 'link') {
            if (d.from.ip_address) { t += ' ' + d.from.ip_address; }
            if (d.to.ip_address) { t += ' - ' + d.to.ip_address; }
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
        });

        return widget;
      };



      return widget;
    };

    return slice_monitor;
  }
);
