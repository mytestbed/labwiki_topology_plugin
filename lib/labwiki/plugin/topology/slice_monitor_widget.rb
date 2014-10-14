require 'labwiki/column_widget'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Monitors the state of a slice
  #
  class SliceMonitorWidget < LabWiki::ColumnWidget
    TOPOLOGY_CHECK_INTERVAL = 30

    attr_reader :topology, :topology_url, :slice_name, :health_ds_name, :topology_ds_name
    renderer :topology_slice_monitor_renderer

    def initialize(column, config_opts, opts)
      super column, :type => :slice_monitor
      debug "new slice monitor: #{opts}"
      #puts ">>>> SLICE MONITOR #{opts} -- cfg: #{config_opts}"

      @topology = nil

      # TODO: We should really find a simpler solution to push one off data to browser
      # @topology_ds_name = ttn = "slice_monitor_topo_#{self.object_id}"
      # @topology_table = OMF::OML::OmlTable.new ttn, [:status, :topology]
      # OMF::Web::DataSourceProxy.register_datasource @topology_table rescue warn $!
      # @topology_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @topology_ds_name)[0]



      # content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@content_url, opts)
      # @topology = JSON.parse(content_proxy.content)
      @slice_name = opts[:name]

      @health_ds_name = "slice_monitor_health_#{self.object_id}"
      @health_table = OMF::OML::OmlIndexedTable.new @health_ds_name, :_id, [:_id, :type, :health]
      OMF::Web::DataSourceProxy.register_datasource @health_table
      @health_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @health_ds_name)[0]


      # Thread.new do
      #   begin
      #     loop do
      #       @health_table << ["445a213c-9ae4-4f1d-a3d2-4895dadb225b", 'node', ['up', 'down', 'unknown'].sample]
      #       @health_table << ["d9dc231c-dec1-4519-b2b6-d246ffd34e3e", 'link', ['up', 'down', 'unknown'].sample]
      #       sleep 2
      #     end
      #   rescue Exception => ex
      #     puts "ERROR: #{ex}"
      #   end
      # end
    end

    def on_get_content(params, req)
      debug "on_get_content: #{params}"

      desc = params[:descriptor]
      puts ">>>>>> #{desc}"

      unless @slice_url = desc[:slice_url]
        raise "Expected 'slice_url' in descriptor - #{desc}"
      end

      # Kickstart initial topology collection
      on_get_topology(params, req)

      # SliceServiceProxy.instance.get(@slice_url + '/topology') do |status, reply|
      #   next unless status == :ok
      #   @topology_table << [status, reply]
      #   report_health_from_topology(reply)
      # end
    end

    def on_get_topology(params, req)
      puts "REQUEST FOR TOPOLOGY - #{@slice_url}"

      if @topology_checked_at.nil? || (Time.now - @topology_checked_at) > TOPOLOGY_CHECK_INTERVAL
        @topology_checked_at = Time.now
        SliceServiceProxy.instance.get(@slice_url + '/topology') do |status, reply|
          next unless status == :ok
          #@topology_table << [status, reply]
          @topology = reply
          report_health_from_topology(reply)
        end
        {code: 504, delay: 10}
      else
        {code: 200, topology: @topology}
      end
    end

    # # Redirect from SliceRequest widget. This now will call the SliceService and get
    # # the slice crearted and provisioned.
    # #
    # def on_new_slice(params, req)
    #   debug "on_new_slice: #{params}"
    #
    #   topo = OMF::Web::ContentRepository.read_content(params[:topology], params)
    #   slice_name = params[:slice_name]
    #   SliceServiceProxy.instance.slice_memberships do |status, memberships|
    #     # not sure how to deliver errors
    #     yield unless status == :ok
    #
    #     ssm = memberships.find do |sm|
    #       sm[:slice_name] == slice_name
    #     end
    #     if ssm
    #       debug "Requesting sliver for: #{ssm}"
    #       # SLice already exists, re-provision it
    #       ms_uri = URI.parse(ssm['href']).path.split('/')[-1]
    #       SliceServiceProxy.instance.request_slivers ms_uri, topo do |a, msg|
    #         puts ">>>> REQUEST SLIVER - #{a} - #{msg}"
    #       end
    #     end
    #   end
    # end

    def report_health_from_topology(topology)

    end

    # As widgets are dynamically added, we need register datasources from within the
    # widget renderer.
    #
    def datasources
      #[@topology_ds_proxy, @health_ds_proxy]
      [@health_ds_proxy]
    end

    # def on_new_slice(params, req)
    #   @slice_name = params[:name]
    #   SliceServiceProxy.instance.post('/slices', name: @slice_name, topology: @topology) do |status, response|
    #     info "Slice request: #{status} - #{response}"
    #   end
    #   @slice_requested = true
    # end

    # def mime_type
    #   'slice_monitor'
    # end

    # def title
      # #@experiment ? (@experiment.name || 'NEW') : 'No Experiment'
      # "Monitor Slice '#{@slice_name || 'Unknown'}'"
    # end

  end # class

end # module
