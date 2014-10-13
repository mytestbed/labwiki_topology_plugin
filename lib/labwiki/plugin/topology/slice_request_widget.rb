require 'labwiki/column_widget'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Request a new slice
  #
  class SliceRequestWidget < LabWiki::ColumnWidget
    attr_reader :topology, :slice_names_ds_name
    renderer :topology_slice_request_renderer

    def initialize(column, config_opts, opts)
      super column, :type => :slice_monitor
      debug "new: #{opts}"
      unless @content_url = opts[:url]
        raise "Expected 'url' in opts - #{opts}"
      end
      content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, opts)
      @topology = JSON.parse(content_proxy.content)

      # TODO: We should really find a simpler solution to push one off data to browser
      @slice_names_ds_name = tsn = "slice_request_#{self.object_id}"
      @slice_names_table = OMF::OML::OmlTable.new tsn, [:name]
      OMF::Web::DataSourceProxy.register_datasource @slice_names_table rescue warn $!
      @slice_names_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @slice_names_ds_name)[0]
      SliceServiceProxy.instance.slice_memberships do |status, memberships|
        # not sure how to deliver errors
        next unless status == :ok

        memberships.each do |sm|
          @slice_names_table << [sm[:slice_name]]
        end
      end
    end

    def on_request_slice(params, req)
      debug "on_request_slice: #{params}"
      # SliceServiceProxy.instance.post('/slices', name: params[:name], topology: @topology_descr) do |status, response|
        # info "Slice request: #{status} - #{response}"
      # end
      opts = {
        action: :on_new_slice,
        topology: @content_url,
        slice_name: params[:name]
      }
      raise LabWiki::RedirectWidget.new('topology/slice_create', opts)
    end

    def mime_type
      'slice_monitor'
    end

    def title
      "New Slice"
    end

    # As widgets are dynamically added, we need register datasources from within the
    # widget renderer.
    #
    def datasources
      [@slice_names_ds_proxy]
    end
  end # class

end # module
