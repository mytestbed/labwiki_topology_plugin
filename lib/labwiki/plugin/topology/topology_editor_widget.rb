require 'labwiki/column_widget'
require 'labwiki/plugin/topology/topology_editor_renderer'

module LabWiki::Plugin::Topology

  # Allows editing a topology descrription
  #
  class TopologyEditorWidget < LabWiki::ColumnWidget
    attr_reader :topology_name

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
      @topology_name = params[:topology_name]
      @topology_descr = {}
    end

    def on_save(params, req)
      debug "on_save: #{params}"
      repo = (OMF::Web::SessionStore[:prepare, :repos] || []).first
      error "Could not find any available repo to write" if repo.nil?
      begin
        url = repo.get_url_for_path("topology/#{params[:topology_name]}.gjson")
        repo.write(url, params[:graph], "Adding new script #{url}")
      rescue => e
        e_msg = "Failed to create #{url}. #{e.message}"
        OMF::Base::Loggable.logger('repository').error e_msg
      end
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
      "Topology #{@topology_name}"
    end


  end # class

end # module
