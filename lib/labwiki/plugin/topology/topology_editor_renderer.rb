
#require 'omf-web/theme/bright/widget_chrome'

module LabWiki::Plugin::Topology

  # Override some of the functionality of the text renderer defined in OMF::Web
  class TopologyEditorRenderer < Erector::Widget
    include OMF::Common::Loggable

    def initialize(widget, topology_descr, opts = {})
      super opts
      @opts = opts.dup
      @opts[:topology] = topology_descr
      @widget = widget
      #@topology_descr = topology_descr
      #puts "CONTENT>>>> #{opts.inspect}"
    end

    def content
      link :href => '/plugin/topology/css/topology_editor.css', :rel => "stylesheet", :type => "text/css"
      @wid = "w#{@widget.object_id}"
      graph_id = @wid + '_graph'
      div :class => "topology_editor", :id => @wid do
        render_toolbar ['add_node']
        div :id => graph_id, :class => 'canvas'
        #rawtext @content
      end
      javascript %{
        if (typeof(LW.plugin.topology) == "undefined") LW.plugin.topology = {}; // shouldn't need this here

        L.require('#LW.plugin.topology.topology_editor', '/plugin/topology/js/topology_editor.js', function() {
          OML.widgets.#{@wid} = LW.plugin.topology.topology_editor(#{@opts.to_json}).render(d3.select('\##{graph_id}'));
        })
      }
    end

    def render_toolbar(buttons)
      js_toolbar = []
        div :class => "widget_toolbar" do
          ol :class => "widget_toolbar" do
            buttons.each do |name|
              id = "#{@wid}_#{name}_a"
              li :class => 'cmd_' + name do
                a :id => id, :href => "#", :title => name  do
                  span name, :class => :toolbar
                end
              end
              js_toolbar << %{
                $('\##{id}').click(function(){
                  OML.widgets.#{@wid}.on_#{name}_pressed();
                  return false;
                });
              }
            end
          end
        end
        javascript(%{
          #{js_toolbar.join("\n");}
        })

    end

  end

end # module
