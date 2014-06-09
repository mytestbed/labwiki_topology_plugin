require 'labwiki/column_widget'
require 'labwiki/plugin/topology/topology_editor_renderer'

module LabWiki::Plugin::Topology

  # Allows editing a topology descrription
  #
  class TopologyEditorWidget < LabWiki::ColumnWidget
    attr_reader :topology_name

    def initialize(column, config_opts, opts)
      unless column == :prepare
        raise "Should only be used in ':prepare' column"
      end
      super column, :type => :topology
      #puts ">>>> EDITOR: #{config_opts} - #{opts}"

      @is_new = true
      if @url = opts[:url]
        @name = @url.split('/')[-1].split('.')[0]
        @repo = OMF::Web::ContentRepository.find_repo_for(@url, opts)
        @is_new = false
      end
    end

    def on_new_topology(params, req)
      debug "on_new_topology: '#{params}'"
      @name = params[:topology_name]

      @repo = (OMF::Web::SessionStore[:prepare, :repos] || []).first
      unless @repo
        error "Could not find any available repo to write"
        return
      end
      @url = @repo.get_url_for_path("topology/#{@name}.gjson")
      @is_new = true
      nil
    end

    def on_save(params, req)
      debug "on_save: #{params} - url: #{@url}"

      begin
        @repo.write(@url, JSON.pretty_generate(params[:graph]), "Creating or updating script #{@url}")
      rescue => e
        e_msg = "Failed to save #{@url}. #{e.message}"
        OMF::Base::Loggable.logger('repository').error e_msg
      end
      @is_new = false
      nil
    end

    def on_get_content(params, req)
      debug "on_get_content: #{params}"
      @content_url = params[:url]
      @content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(params[:url], params)
      @topology_name = params[:name].gsub(/\.gjson/, '')
      @topology_descr = JSON.parse(@content_proxy.content)
    end

    def content_renderer()
      debug "content_renderer: #{@opts} -- content_opts: #{@content_opts}"
      OMF::Web::Theme.require 'topology_editor_renderer'

      raise "Undefined @url" unless @url
      #content_proxy = OMF::Web::ContentRepository.create_content_proxy_for(@url, @content_opts)
      #topology_descr = content_proxy.content
      topology_descr = @is_new ? nil : @repo.read(@url)
      TopologyEditorRenderer.new(self, topology_descr)
    end

    def mime_type
      'topology'
    end

    def title
      "#{(@name || 'Unknown').capitalize}"
    end

    def sub_title
      @content_proxy.name if @content_proxy
    end

    def content_url
      @content_url
    end
  end # class

end # module
