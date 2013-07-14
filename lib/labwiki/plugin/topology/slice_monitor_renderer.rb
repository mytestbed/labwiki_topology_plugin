
#require 'omf-web/theme/bright/widget_chrome'

module LabWiki::Plugin::Topology

  # Override some of the functionality of the text renderer defined in OMF::Web
  class SliceMonitorRenderer < Erector::Widget
    include OMF::Common::Loggable

    def initialize(widget, health_ds_proxy, opts = {})
      super opts
      @health_ds_proxy = health_ds_proxy
      @opts = {editable: false}.merge(opts)
      @widget = widget
    end

    def content
      link :href => '/plugin/topology/css/graph_editor.css', :rel => "stylesheet", :type => "text/css"
      @wid = "w#{@widget.object_id}"
      graph_id = @wid + '_graph'
      div :class => "slice_monitor", :id => @wid do
        div :id => graph_id, :class => 'graph_editor', :contenteditable => "true"
      end
      javascript %{
        if (typeof(LW.plugin.topology) == "undefined") LW.plugin.topology = {}; // shouldn't need this here

        L.require('#LW.plugin.topology.slice_monitor', '/plugin/topology/js/slice_monitor.js', function() {
          #{@health_ds_proxy.to_javascript(unique_col: 'uuid')}
          OML.widgets.#{@wid} = LW.plugin.topology.slice_monitor(#{@opts.to_json}).render(d3.select('\##{graph_id}'));
        })
      }
    end

  end

end # module
