LW.prepare_controller.add_tool('Topology Editor',
  '<div class="form-inline" id="new_topology_editor_form_prepare">\
     <input name="file_name" placeholder="File name" type="text" value="">\
     <button class="btn btn-primary">Create</button>\
   </div>'
);

$('#new_topology_editor_form_prepare .btn').click(function(event) {
    var input = $('#new_topology_editor_form_prepare').find('input');
    var url = input.val();
    var mime_type = 'data/rspec';

    var opts = {
      action: 'new_topology',
      col: 'prepare',
      plugin: 'topology',
      mime_type: mime_type,
      url: url
    };
    LW.prepare_controller.refresh_content(opts, 'POST');

});
