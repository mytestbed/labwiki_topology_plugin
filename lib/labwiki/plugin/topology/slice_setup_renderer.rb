module LabWiki::Plugin::Topology
  class SliceSetupRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, topology_descr, opts = {})
      super opts
      @widget = widget
      @opts = opts
      @opts[:topology] = topology_descr
    end

    def content
      if @widget.slice_requested.nil?
        div class: 'lw-form' do
          form role: 'form', id: 'setup-slice-form-execute', method: 'POST' do
            div class: 'form-group' do
              label for: 'slice' do
                text 'Slice'
              end
              input class: 'form-control', placeholder: 'Slice name', required: true, name: 'slice'
            end

            button type: 'submit', class: 'btn btn-default' do
              text 'Submit'
            end
          end
        end
        javascript %{
          $('#setup-slice-form-execute').submit(function(event) {
            var opts = {
              action: 'new_slice',
              col: 'execute',
              plugin: 'topology',
              mime_type: 'topology',
              name: $('#setup-slice-form-execute input[name="slice"]').val()
            };

            LW.execute_controller.refresh_content(opts, 'POST');
            event.preventDefault();
          });
        }
      else
        div class: 'alert alert-info' do
          text 'Your slice request has been sent to slice authority service'
        end
      end
    end

    def title_info
      {
        img_src: "/resource/plugin/topology/img/topology-no-edit-32.png",
        title: "Set up slice",
        sub_title: "based on #{@widget.sub_title}"
      }
    end
  end
end
