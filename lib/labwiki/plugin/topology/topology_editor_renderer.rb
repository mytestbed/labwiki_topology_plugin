
#require 'omf-web/theme/bright/widget_chrome'

module LabWiki::Plugin::Topology

  # Override some of the functionality of the text renderer defined in OMF::Web
  class TopologyEditorRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, topology_descr, opts = {})
      super opts
      @opts = {editable: true}.merge(opts)
      @opts[:topology] = topology_descr
      @opts[:topology_name] = widget.topology_name
      @wid = @opts[:wid] = "w#{widget.object_id}"
      @widget = widget
      #@topology_descr = topology_descr
      #puts "CONTENT>>>> #{opts.inspect}"
    end

    def content
      link :href => '/resource/plugin/topology/css/graph_editor.css', :rel => "stylesheet", :type => "text/css"
      link :href => '/resource/plugin/topology/css/topology_editor.css', :rel => "stylesheet", :type => "text/css"
      #graph_id = @wid + '_graph'
      div :class => "graph_editor", :id => @wid do
        div :class => 'topology_editor'
        div :class => 'element_state lw-form'
        #rawtext @content
      end
      javascript %{
        require(['plugin/topology/js/topology_editor'], function(topo_editor) {
          var w = topo_editor($('##{@wid}'), #{@opts.to_json});
        });
      }
    end

    def title_info
      {
        img_src: "/resource/plugin/topology/img/topology-edit-32.png",
        #img_src: "/resource/vendor/mono_icons/linedpaperpencil32.png",
        title: @widget.title,
        sub_title: @widget.sub_title
      }

    end
  end

end # module
