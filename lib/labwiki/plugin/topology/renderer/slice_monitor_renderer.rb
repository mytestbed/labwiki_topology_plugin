
module LabWiki::Plugin::Topology

  class SliceMonitorRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, unused)
      @slice_name = widget.slice_name
      @opts = {
        editable: false,
        topology: widget.topology,
        topology_url: widget.topology_url,
        health_ds_name: widget.health_ds_name,
        slice_name: @slice_name
      }
      @widget = widget
      super @opts
    end

    def content
      link :href => 'resource/plugin/topology/css/graph_editor.css', :rel => "stylesheet", :type => "text/css"
      @wid = "w#{@widget.object_id}"

      div :class => "slice_monitor", :id => @wid do
        div :class => 'graph_editor', :contenteditable => "false"
      end
      javascript %{
        require(['plugin/topology/js/slice_monitor'], function(slice_monitor) {
          slice_monitor($('##{@wid}'), LW.execute_controller, #{@opts.to_json});
        })
      }
    end

    def title_info
      {
        img_src: "/resource/plugin/topology/img/topology-no-edit-32.png",
        title: "Slice '#{@slice_name || 'Unknown'}'",
        sub_title: "Based on #{@widget.topology_url}"
      }
    end
  end
end # module
