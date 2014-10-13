
define(['theme/labwiki/js/labwiki'],
  function (LW) {

    var slice_request = function(controller, opts) {
      var existing_slices_select = null;

      function widget() {};

      function init_request_form(container) {
        var form = container.find('.setup-slice-form-execute');
        var slice_name_input = form.find('input[name="slice_name"]');
        var submit_button = form.find('button[type=submit]');
        existing_slices_select = form.find('select[name="existing_slices"]');
        var destroy_warning = form.find('.sliver-destroy-warning');

        slice_name_input.change(function() {
          var sname = slice_name_input.val();
          if (sname != '') {
            submit_button.removeAttr('disabled');
          } else {
            submit_button.attr('disabled', 'disabled');
          }
          existing_slices_select.val(sname);
          if (existing_slices_select.val() == sname) {
            // replacing existing resources
            destroy_warning.show();
          } else {
            destroy_warning.hide();
          }
          var i = 0;

        });
        existing_slices_select.change(function() {
          var sname = existing_slices_select.val();
          if (sname == '---') sname = '';
          slice_name_input.val(sname);
          slice_name_input.trigger("change");
        });
        form.submit(function (event) {
          var slice_name = slice_name_input.val();
          var opts = {
            action: 'request_slice',
            col: 'execute',
            plugin: 'topology',
            mime_type: 'text/topology',
            //name: $('#setup-slice-form-execute input[name="slice"]').val()
            name: slice_name
          };

          LW.execute_controller.refresh_content(opts, 'POST');
          event.preventDefault();
        });
      }

      function process_existing_slice_name(name) {
        var option  = '<option>' + name + '</option>';
        existing_slices_select.append(option);
      }

      widget.render = function(container) {
        init_request_form(container);

        var slice_names_rows_processed = 0;
        OHUB.bind('data_source.' + opts['slice_names_ds_name'] + '.changed', function (evt) {
          var rows = evt.data_source.rows();
          var new_rows = rows.slice(slice_names_rows_processed);
          slice_names_rows_processed = rows.length;
          _.each(new_rows, function(row) {
            var name = row[1];
            process_existing_slice_name(name);
          });

        });

        return widget;
      }; // end of render

      return widget;
    };

    return slice_request;
  }
);
