require 'labwiki/column_widget'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Request a new slice
  #
  class SliceRequestWidget < LabWiki::ColumnWidget
    attr_reader :topology
    renderer :topology_slice_request_renderer

    def initialize(column, config_opts, opts)
      super column, :type => :slice_monitor
      debug "new: #{opts}"
      unless @content_url = opts[:url]
        raise "Expected 'url' in opts - #{opts}"
      end
      content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, opts)
      @topology = JSON.parse(content_proxy.content)
    end

    def on_request_slice(params, req)
      debug "on_request_slice: #{params}"
      # SliceServiceProxy.instance.post('/slices', name: params[:name], topology: @topology_descr) do |status, response|
        # info "Slice request: #{status} - #{response}"
      # end
      opts = {
        action: :on_new_slice,
        url: @content_url,
        slice_name: params[:name]
      }
      raise LabWiki::RedirectWidget.new('topology/slice_monitor', opts)
    end

    def mime_type
      'slice_monitor'
    end

    def title
      "New Slice"
    end

  end # class

end # module
