
module LabWiki::Plugin::Topology

  class SliceCreateRenderer < Erector::Widget

    def initialize(widget, unused)
      @slice_name = widget.slice_name
      @opts = {
        topology_url: widget.topology_url,
        progress_ds_name: widget.progress_ds_name,
        slice_name: @slice_name
      }
      @widget = widget
      super @opts
    end

    def content
      link :href => 'resource/plugin/topology/css/slice_create.css', :rel => "stylesheet", :type => "text/css"
      @wid = "w#{@widget.object_id}"

      div :class => "slice_monitor", :id => @wid do
        render_properties
        render_progress
      end
      #//

      javascript %{
        require(['plugin/topology/js/slice_create', 'omf/data_source_repo'], function(SliceProgress, ds) {
          #{@widget.datasources.map {|ds| ds.to_javascript()}.join()}
          SliceProgress(LW.execute_controller, #{@opts.to_json}).render($('##{@wid}'));
        })
      }
    end

    def render_properties
      div :class => 'slice-status' do
        table :class => 'slice-status table table-bordered', :style => 'width: auto'  do
          render_field_static :name => 'Name', :value => @widget.slice_name
          render_field_static :name => 'Status', :value => @widget.state
          render_field_static :name => 'URN', :value => @widget.urn
          turl = @widget.topology_url
          render_field_static :name => 'Topology', value: turl, url: "lw:prepare/topology_edit?url=#{turl}"
        end
      end
    end

    def render_progress
      div 'Progress', class: 'slice-section'
      div :class => 'slice-progress' do
        table :class => 'slice-progress'
      end
    end

    def title_info
      {
        img_src: "/resource/plugin/topology/img/topology-no-edit-32.png",
        title: "Slice '#{@slice_name || 'Unknown'}'",
        sub_title: "Based on #{@widget.topology_url}"
      }
    end

    def render_field_static(prop, with_comment = true)
      comment = prop[:comment]
      name = prop[:name].downcase
      tr do
        td name + ':', :class => "desc"
        td :class => "input", :colspan => (comment ? 1 : 2) do
          if url = prop[:url]
            opts = (url.start_with? 'lw:') ? {xhref: url} : {href: url}
            a prop[:value], opts
          else
            v = prop[:value]
            opts = {
              :class => (v ? 'defined' : 'undefined'),
              :id => (prop[:html_id] || "#{@data_id}_s_#{name}")
            }
            span v || 'undefined', opts
          end
        end
        if with_comment && comment
          td :class => "comment" do
            text comment
          end
        end
      end
    end

    ##########


  end # class
end # module
