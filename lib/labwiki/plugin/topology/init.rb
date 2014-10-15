
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_request_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'
require 'labwiki/plugin/topology/slice_create_widget'
require 'labwiki/plugin/topology/slice_service_proxy'

require 'labwiki/plugin/topology/renderer/topology_editor_renderer'
require 'labwiki/plugin/topology/renderer/slice_monitor_renderer'
require 'labwiki/plugin/topology/renderer/slice_request_renderer'
require 'labwiki/plugin/topology/renderer/slice_create_renderer'

LabWiki::Plugin::Topology::SliceServiceProxy.instance # Validate configuration

OMF::Web::ContentRepository.register_mime_type(gjson: 'text/topology')

LabWiki::PluginManager.register :topology, {
  version: LabWiki.plugin_version([0, 3, 'pre'], __FILE__),

  widgets: [
    {
      :name => 'topology/editor',
      :context => :prepare,
      :priority => lambda do |opts|
        puts ">>> PRIORITY FOR #{opts}"
        (opts[:plugin] == "topology" || opts[:url].end_with?('.gjson')) ? 500 : nil
      end,
      :search => lambda do |pat, opts, wopts, &cbk|
        opts[:mime_type] = 'text/topology'
        OMF::Web::ContentRepository.find_files(pat, opts) do |f|
          f[:img_url] = "plugin/topology/img/topology-edit-16.png"
          cbk.call(f)
        end
      end,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget,
      :handle_mime_type => 'text/topology'
    },
    {
      :name => 'topology/slice_request',
      :context => :execute,
      :priority => lambda do |opts|
        (opts[:mime_type] == 'text/topology') ? 900 : nil
      end,
      :search => lambda do |pat, opts, wopts, &cbk|
        opts[:mime_type] = 'text/topology'
        OMF::Web::ContentRepository.find_files(pat, opts) do |f|
          f[:img_url] = "plugin/topology/img/topology-edit-16.png"
          f[:widget] = 'slice_request'
          cbk.call(f)
        end
      end,
      :widget_class => LabWiki::Plugin::Topology::SliceRequestWidget,
      :handle_mime_type => 'text/topology'
    },
    {
      :name => 'topology/slice_monitor',
      :context => :execute,
      # :priority => lambda do |opts|
        # (opts[:mime_type] == 'topology') ? 200
          # : ((opts[:url].end_with? '.gjson') ? 500 : nil)
      # end,
      :search => lambda do |pat, opts, wopts, &cbk|
        puts ">>SEARCH SLICE>>> #{cbk}"
        opts[:mime_type] = 'application/topology'
        LabWiki::Plugin::Topology::SliceServiceProxy.instance.find_slice(pat, opts, wopts) do |f|
          f[:img_url] = "plugin/topology/img/topology-no-edit-16.png"
          cbk.call(f)
        end
      end,
      :widget_class => LabWiki::Plugin::Topology::SliceMonitorWidget,
      :handle_mime_type => 'topology'
    },
    {
      :name => 'topology/slice_create',
      :context => :execute,
      :widget_class => LabWiki::Plugin::Topology::SliceCreateWidget
    }

  ],
  renderers: {
    :topology_editor_renderer => LabWiki::Plugin::Topology::TopologyEditorRenderer,
    :topology_slice_request_renderer => LabWiki::Plugin::Topology::SliceRequestRenderer,
    :topology_slice_monitor_renderer => LabWiki::Plugin::Topology::SliceMonitorRenderer,
    :topology_slice_create_renderer => LabWiki::Plugin::Topology::SliceCreateRenderer
  },
  resources: File.dirname(__FILE__) + '/resource',
  global_js: 'js/topology_editor_global.js',

  on_authorised: lambda do
    speaks_for = OMF::Web::SessionStore[:speak_for, :user]
    user = OMF::Web::SessionStore[:id, :user]

    LabWiki::Plugin::Topology::SliceServiceProxy.instance.speaks_for_user(user, speaks_for)

    # LabWiki::Plugin::Topology::SliceServiceProxy.instance.get("users/#{user}/slice_members") do |status, reply|
    #   if status == :ok
    #     OMF::Web::SessionStore[:slices, :user] = reply
    #   end
    # end
  end

}
