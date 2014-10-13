
define(['theme/labwiki/js/labwiki'],
  function (LW) {

    var slice_create = function(controller, opts) {
      //controller.show_alert('info', 'Your slice request has been sent to slice authority service');
      var progress_rows_processed = 0;
      var first_time = null;
      var progress_table;

      function widget() {};

      function process_progress_msg(line) {
        var m = line.match('([^ ]*)( *)(.*)')
        var time = new Date(m[1].slice(0, -1)); // chop off trailing ':'
        if (first_time == null) first_time = time;
        var rel_time = (time - first_time) / 1000;
        var am = null;
        var spaces = m[2].length - 1; // first space is always there
        var msg = m[3];
        if (msg[0] == '[') {
          var m2 = msg.match('\\[([^\\]]*)\\]( *)(.*)');
          var urn = m2[1];
          am = urn.split('+')[1];
          spaces += m2[2].length;
          msg = m2[3];
        }
        var row = '<tr><td>' + rel_time + '</td><td>' + msg + '</td></tr>';
        progress_table.prepend(row);
        var i = 0;
      }

      function show_progress(slice_url) {
        var slice_descr = {
          //mime_type: "slice",
          action: 'new',
          name: opts['slice_name'],
          slice_url: slice_url,
          widget: "topology/slice_monitor"
        };
        controller.load_content(slice_descr);
      }

      widget.render = function(container) {
        OHUB.bind('data_source.' + opts['progress_ds_name'] + '.changed', function(evt) {
          var rows = evt.data_source.rows();
          var new_rows = rows.slice(progress_rows_processed);
          _.each(new_rows, function(row) {
            var type = row[1];
            var msg = row[2];
            switch (type) {
              case 'progress':
                process_progress_msg(msg);
                break;
              case 'done':
                show_progress(msg);
                break;
              default:
                var i = 0;
            }
          })
          progress_rows_processed = rows.length;
        });

        progress_table = container.find('table.slice-progress')
        return widget;
      };

      return widget;
    };

    return slice_create;
  }
);
