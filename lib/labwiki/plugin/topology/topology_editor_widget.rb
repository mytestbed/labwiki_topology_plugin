require 'labwiki/column_widget'
require 'labwiki/plugin/topology/topology_editor_renderer'

module LabWiki::Plugin::Topology

  # Allows editing a topology descrription
  #
  class TopologyEditorWidget < LabWiki::ColumnWidget

    def initialize(column, config_opts, unused)
      unless column == :prepare
        raise "Should only be used in ':prepare' column"
      end
      super column, :type => :topology
      #puts ">>>> EDITOR: #{config_opts}"
      @topology = nil
    end

    def on_new_topology(params, req)
      debug "on_new_topology: '#{params}'"
      @topology_descr = {}
    end

    def on_save(params, req)
      debug "on_save: #{params}"
      nil
    end

    def content_renderer()
      debug "content_renderer: #{@opts}"
      OMF::Web::Theme.require 'topology_editor_renderer'

      # content_url = @content_opts[:url]
      # content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(content_url, @content_opts)
      # topology_descr = content_proxy.content
      TopologyEditorRenderer.new(self, @topology_descr)
    end

    def mime_type
      'topology'
    end

    def title
      #@experiment ? (@experiment.name || 'NEW') : 'No Experiment'
      "Topology #{self.object_id}"
    end


  end # class

end # module
