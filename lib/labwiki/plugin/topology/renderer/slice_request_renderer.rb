module LabWiki::Plugin::Topology
  class SliceRequestRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, unused)
      @widget = widget
      @opts = {
        slice_names_ds_name: widget.slice_names_ds_name,
        topology: widget.topology
      }
      super @opts
    end

    def content
      link :href => '/resource/plugin/topology/css/graph_editor.css', :rel => "stylesheet", :type => "text/css"
      link :href => '/resource/plugin/topology/css/slice_request.css', :rel => "stylesheet", :type => "text/css"

      unless SliceServiceProxy.instance.healthy?
        reporter = SliceServiceProxy.instance.report_problems_to
        div class: "alert alert-danger", role: "alert" do
          b "Oh snap! "
          text "The Slice Service doesn't look happy. "
          if reporter
            text "Please report this to "
            a reporter, href: reporter
            text '.'
          else
            text 'Unfortunately, there is nobody registered to help you. Just yell loudly, maybe it helps.'
          end
        end
        return
      end

      @wid = "w#{@widget.object_id}"
      div :class => "slice_request", :id => @wid do
        div class: 'lw-form' do
          form role: 'form', class: 'setup-slice-form-execute', method: 'POST' do
            div class: 'form-group' do
              label for: 'slice_name' do
                text 'Slice Name'
              end
              input class: 'form-control', placeholder: 'Slice name', required: true, name: 'slice_name'
            end
            div class: 'form-group' do
              label for: 'existing_sliced' do
                text 'Existing Slices'
              end
              select class: 'form-control', name: 'existing_slices' do
                option '---', value: '---'
              end
            end
            div class: 'sliver-destroy-warning bg-danger', style: 'display: none;' do
              text "Warning! This will destroy existing resources in slice"
            end
            button type: 'submit', class: 'btn btn-primary', disabled: 'disabled' do
              text 'Request Slice'
            end
          end
        end
        javascript %{
          require(['plugin/topology/js/slice_request', 'omf/data_source_repo'], function(SliceRequest, ds) {
            #{@widget.datasources.map {|ds| ds.to_javascript()}.join()}
            SliceRequest(LW.execute_controller, #{@opts.to_json}).render($('##{@wid}'));
          })
        }
      end
    end

    def title_info
      {
        img_src: "/resource/plugin/topology/img/topology-no-edit-32.png",
        title: "New Slice",
        sub_title: "Based on #{@widget.content_url}"
      }
    end
  end
end
