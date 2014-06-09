module LabWiki::Plugin::Topology
  class SliceSetupRenderer < Erector::Widget
    include OMF::Base::Loggable

    def initialize(widget, topology_descr, opts = {})
      super opts
      @opts = opts
      @opts[:topology] = topology_descr
    end

    def content
      div class: 'lw-form' do
        form role: 'form' do
          div class: 'form-group' do
            label for: 'slice' do
              text 'Slice'
            end
            input class: 'form-control', placeholder: 'Slice name', required: true, name: 'slice'
            input type: 'hidden', value: "<xml></xml>", name: 'speak-for-credential'
          end

          button type: 'submit', class: 'btn btn-default' do
            text 'Submit'
          end
        end
      end
    end
  end
end
