require 'labwiki/column_widget'
require 'omf_oml/table'
require 'omf_oml/indexed_table'

module LabWiki::Plugin::Topology

  # Create a slice and reports on the initial progress
  #
  class SliceCreateWidget < LabWiki::ColumnWidget

    attr_reader :slice_name, :state, :urn, :topology_url, :progress_ds_name
    renderer :topology_slice_create_renderer

    def initialize(column, config_opts, opts)
      super column, :type => :slice_create
      debug "new slice create: #{opts}"

      # TODO: We should really find a simpler solution to push one off data to browser
      @progress_ds_name = ttn = "slice_create_#{self.object_id}"
      @progress_table = OMF::OML::OmlTable.new ttn, [:type, :msg]
      OMF::Web::DataSourceProxy.register_datasource @progress_table rescue warn $!
      @progress_ds_proxy = OMF::Web::DataSourceProxy.for_source(name: @progress_ds_name)[0]
    end

    # Redirect from SliceRequest widget. This now will call the SliceService and get
    # the slice crearted and provisioned.
    #
    def on_new_slice(params, req)
      debug "on_new_slice: #{params}"

      @topology_url = params[:topology]
      topo = OMF::Web::ContentRepository.read_content(@topology_url, params)
      @slice_name = params[:slice_name]

      progress_cnt = 0
      SliceServiceProxy.instance.slice_memberships do |status, memberships|
        # not sure how to deliver errors
        unless status == :ok
          if status == :progress
            memberships.each {|msg| @progress_table << ['progress', msg]}
          else
            @progress_table << [status, memberships]
          end
          next
        end

        ssm = memberships.find do |sm|
          sm[:slice_name] == @slice_name
        end
        if ssm
          debug "Requesting sliver for: #{ssm}"
          # SLice already exists, re-provision it
          ms_path = URI.parse(ssm['href']).path
          ms_uri = ms_path.split('/')[-1]
          SliceServiceProxy.instance.request_slivers ms_uri, topo do |a, msg|
            case a
            when :progress
              new_progress = msg[progress_cnt .. -1]
              #puts "PROGRESS(#{progress_cnt})>>> #{msg.inspect} ----- #{new_progress}"
              if new_progress
                new_progress.each {|msg| @progress_table << ['progress', msg]}
                progress_cnt = msg.length
              end
            when :ok
              slice_path = ms_path + '/slice'
              debug "Slivers created - #{slice_path}"
              @progress_table << ['done', slice_path] # should trigger a move to slice monitor
            else
              @progress_table << [a, msg] # not sure what we do with this
            end
            #puts ">>>> REQUEST SLIVER - #{a} - #{msg}"
          end
        end
      end
    end

    # As widgets are dynamically added, we need register datasources from within the
    # widget renderer.
    #
    def datasources
      [@progress_ds_proxy]
    end

  end # class

end # module
