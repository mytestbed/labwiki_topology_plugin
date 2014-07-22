module LabWiki::Plugin::Topology
  class SliceRequestRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, opts = {})
      super opts
      @widget = widget
      @opts = opts
      #@opts[:topology] = topology_descr
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

      div class: 'lw-form' do
        form role: 'form', id: 'setup-slice-form-execute', method: 'POST' do
          div class: 'form-group' do
            label for: 'slice' do
              text 'Slice'
            end
            input class: 'form-control', placeholder: 'Slice name', required: true, name: 'slice'
          end

          button type: 'submit', class: 'btn btn-default' do
            text 'Request Slice'
          end
        end
      end
      javascript %{
          $('#setup-slice-form-execute').submit(function(event) {
            var opts = {
              action: 'request_slice',
              col: 'execute',
              plugin: 'topology',
              mime_type: 'text/topology',
              name: $('#setup-slice-form-execute input[name="slice"]').val()
            };

            LW.execute_controller.refresh_content(opts, 'POST');
            event.preventDefault();
          });
      }
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
