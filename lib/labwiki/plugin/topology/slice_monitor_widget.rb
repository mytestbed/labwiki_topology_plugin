require 'labwiki/column_widget'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Monitors the state of a slice
  #
  class SliceMonitorWidget < LabWiki::ColumnWidget

    attr_reader :topology, :topology_url, :slice_name, :health_ds_name
    renderer :topology_slice_monitor_renderer

    def initialize(column, config_opts, opts)
      super column, :type => :slice_monitor
      debug "new: #{opts}"
      puts ">>>> SLICE MONITOR #{opts} -- cfg: #{config_opts}"
      unless @content_url = @topology_url = opts[:url]
        raise "Expected 'url' in opts - #{opts}"
      end
      content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, opts)
      @topology = JSON.parse(content_proxy.content)
      @slice_name = opts[:slice_name]

      @health_ds_name = "slice_monitor_#{self.object_id}"
      @health_table = OMF::OML::OmlIndexedTable.new @health_ds_name, :uuid, [:uuid, :type, :health]
      OMF::Web::DataSourceProxy.register_datasource @health_table
      @health_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @health_ds_name)[0]


      Thread.new do
        begin
          loop do
            @health_table << ["445a213c-9ae4-4f1d-a3d2-4895dadb225b", 'node', ['up', 'down', 'unknown'].sample]
            @health_table << ["d9dc231c-dec1-4519-b2b6-d246ffd34e3e", 'link', ['up', 'down', 'unknown'].sample]
            sleep 2
          end
        rescue Exception => ex
          puts "ERROR: #{ex}"
        end
      end
    end

    def on_new_slice(params, req)
      @slice_name = params[:name]
      SliceServiceProxy.instance.post('/slices', name: @slice_name, topology: @topology) do |status, response|
        info "Slice request: #{status} - #{response}"
      end
      @slice_requested = true
    end

    # def on_get_content(params, req)
      # super(params, req)
      # @slice_requested = false
    # end
#
    # def content_renderer()
      # debug "content_renderer: #{@opts.inspect}"
#
      # @content_url = @content_opts[:url]
      # content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, @content_opts)
      # @topology_descr = JSON.parse(content_proxy.content)
#
      # ropts = {editable: false, topology: @topology_descr}
      # if @slice_requested
        # ropts[:health_ds] = @ds_name
        # ropts[:health_ds_proxy] = @health_ds_proxy
        # OMF::Web::Theme.create_renderer(:topology_slice_monitor_renderer, self, ropts)
      # else
        # OMF::Web::Theme.create_renderer(:topology_slice_setup_renderer, self, ropts)
      # end
    # end

    def mime_type
      'slice_monitor'
    end

    # def title
      # #@experiment ? (@experiment.name || 'NEW') : 'No Experiment'
      # "Monitor Slice '#{@slice_name || 'Unknown'}'"
    # end

  end # class

end # module
