LW.prepare_controller.add_tool('Topology Editor',
  '<form class="form-inline" role="form" id="new_topology_editor_form_prepare">\
     <input class="form-control" name="topo_name" placeholder="Topology name" type="text" value="" required>\
     <button class="btn btn-success">Create</button>\
   </form>'
);

$('#new_topology_editor_form_prepare .btn').click(function(event) {
    var input = $('#new_topology_editor_form_prepare').find('input');
    var topology_name = input.val();
    var mime_type = 'data/rspec';

    var opts = {
      action: 'new_topology',
      col: 'prepare',
      plugin: 'topology',
      mime_type: mime_type,
      topology_name: topology_name
    };
    LW.prepare_controller.refresh_content(opts, 'POST');

});
