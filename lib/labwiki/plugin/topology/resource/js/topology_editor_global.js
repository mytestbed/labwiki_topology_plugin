
LW.prepare_controller.add_tool('Topology Editor',
  '<input class="form-control" name="topo_name" placeholder="Topology name" type="text" value="" required>\
   <button class="btn" type="submit">Create</button>',
  function(form, status_cbk) {
    var input = form.find('input');
    var topology_name = input.val();
    var mime_type = 'data/rspec';

    var opts = {
      action: 'new',
      col: 'prepare',
      plugin: 'topology',
      mime_type: mime_type,
      topology_name: topology_name
    };
    LW.execute_controller.refresh_content(opts, 'POST', status_cbk);
    return false;
  }
);

