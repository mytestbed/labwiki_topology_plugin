
define(['theme/labwiki/js/labwiki', 'plugin/topology/js/graph_editor', 'theme/labwiki/js/form_builder'],
  function (LW, GraphEditor, FormBuilder) {

    var slice_monitor = function(controller, opts) {
      //controller.show_alert('info', 'Your slice request has been sent to slice authority service');
      var container = null;
      var uuid2el = {};
      var graph_editor = null;
      var graph = null;

      function initGraphEditor(graph) {
        var topology = graph.graph;
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
        updateTopology(graph);
        //graph_editor.update_state()

        graph_editor.before_popup(function(d) {
          d = uuid2el[d._id]; // newest state TODO: fix that
          var t = "<ul><li>Name: <b>" + d.name + "</b></li>";
          switch (d._type) {
            case ('node'):
              t += '<li>Status: <b>' + d.status + '</b></li>';
              var ssh = d.ssh_login;
              if (ssh) {
                t += '<li>SSH: <b>' + ssh.hostname + ':' + ssh.port + '</b></li>';
              }
              break;
            case ('link'):
              //if (d.from.ip_address) { t += '<li>From: <b>' + d.from.ip_address + '</b></li>'; }
              //if (d.to.ip_address) { t += '<li>From: <b>' + d.to.ip_address + '</b></li>'; }
              break;
          }
          return t + '</ul>';
        });
      }

      function updateTopology(graph) {
        var topology = graph.graph;
        _.each(topology.nodes, function(n) { uuid2el[n._id] = n; });
        _.each(topology.links, function(l) { uuid2el[l._id] = l; });
        graph_editor.update_state(function(d) {
          switch(d._type) {
            case 'node':
              var s = uuid2el[d._id];
              return 'node_' + (s.status || 'unknown');
            case 'link':
              var s = uuid2el[d._id];
              return 'link_' + (s.status || 'unknown');
          }
        });
      }

      function checkTopoStatus() {
        var req = {
          action: 'get_topology',
          col: 'execute',
          widget_id: opts['widget_id']
        };
        controller.request_action(req, 'GET', function(data) {
          var delay = null;
          switch (data.code) {
            case 200:
              var firstTime = (graph == null);
              graph = data.topology;
              if (firstTime) {
                // first time
                initGraphEditor(graph);
              } else {
                updateTopology(graph);
              }
              delay = 30;
              break;
            case 504:
              delay = data.delay || 5;
              break;
          }
          if (delay) {
            setTimeout(checkTopoStatus, delay * 1000);
          }
          var i = 0;
        }, function(type, msg) {
          // ignore all updates for the moment
        });
      }

      function widget() {};

      widget.render = function(container_) {
        container = container_;
//        OHUB.bind('data_source.' + opts['topology_ds_name'] + '.changed', function(evt) {
//          var r = evt.data_source.rows()[0];
//          if (r[1] != 'ok') {
//            controller.show_alert('warn', 'Some issues with obtaining slice\'s topology');
//            return;
//          }
//          var topology = r[2];
//          initGraphEditor(container, topology);
//        });

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

        checkTopoStatus();
        return widget;
      };

      return widget;
    };

    return slice_monitor;
  }
);
