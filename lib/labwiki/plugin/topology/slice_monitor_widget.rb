require 'labwiki/column_widget'
require 'labwiki/plugin/topology/slice_monitor_renderer'
require 'labwiki/plugin/topology/slice_setup_renderer'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Monitors the state of a slice
  #
  class SliceMonitorWidget < LabWiki::ColumnWidget

    def initialize(column, config_opts, unused)
      super column, :type => :slice_monitor
      #puts ">>>> SLICE MONITOR #{config_opts}"
      @topology = nil
      @slice_requested = false

      @ds_name = "slice_monitor_#{self.object_id}"
      @health_table = OMF::OML::OmlIndexedTable.new @ds_name, :uuid, [:uuid, :type, :health]
      OMF::Web::DataSourceProxy.register_datasource @health_table
      @health_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @ds_name)[0]

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
      SliceServiceProxy.instance.post('/slices', name: params[:name], topology: @topology_descr) do |response|
        info "Slice created: #{response}"
      end
      @slice_requested = true
    end

    def content_renderer()
      debug "content_renderer: #{@opts.inspect}"
      OMF::Web::Theme.require 'slice_monitor_renderer'

      @content_url = @content_opts[:url]
      content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, @content_opts)
      topology_descr = JSON.parse(content_proxy.content)

      if @slice_requested
        ropts = {editable: false, topology: topology_descr, health_ds: @ds_name}
        SliceMonitorRenderer.new(self, @health_ds_proxy, ropts)
      else
        SliceSetupRenderer.new(self, @topology_descr)
      end
    end

    def mime_type
      'slice_monitor'
    end

    def title
      #@experiment ? (@experiment.name || 'NEW') : 'No Experiment'
      "Slice #{self.object_id}"
    end

  end # class

end # module
