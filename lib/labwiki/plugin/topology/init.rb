
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'
require 'labwiki/plugin/topology/slice_service_proxy'

LabWiki::Plugin::Topology::SliceServiceProxy.instance # Validate configuration

OMF::Web::ContentRepository.register_mime_type(gjson: 'text/topology')

LabWiki::PluginManager.register :topology, {
  version: LabWiki.plugin_version([0, 2, 'pre'], __FILE__),

  widgets: [
    {
      :name => 'topology',
      :context => :prepare,
      :priority => lambda do |opts|
        #puts ">>> PRIORITY FOR #{opts}"
        (opts[:url].end_with? '.rspec') ? 500 : nil
      end,
      :search => lambda do |pat, opts, wopts|
        opts[:mime_type] ||= 'text/topology'
        OMF::Web::ContentRepository.find_files(pat, opts)
      end,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget,
      :handle_mime_type => 'text/topology'
    },
    {
      :name => 'topology',
      :context => :execute,
      :priority => lambda do |opts|
        (opts[:mime_type] == 'topology') ? 200 : nil
      end,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget,
      :handle_mime_type => 'topology'
    }
  ],
  renderers: {
    :topology_editor_renderer => LabWiki::Plugin::Topology::TopologyEditorRenderer,
    :slice_setup_renderer => LabWiki::Plugin::Topology::SliceSetupRenderer,
    :slice_monitor_renderer => LabWiki::Plugin::Topology::SliceMonitorRenderer
  },
  resources: File.dirname(__FILE__) + '/resource',
  global_js: 'js/topology_editor_global.js',

  on_authorised: lambda do
    speaks_for = OMF::Web::SessionStore[:speak_for, :user]
    user = OMF::Web::SessionStore[:urn, :user]
    LabWiki::Plugin::Topology::SliceServiceProxy.instance.speaks_for_user(user, speaks_for)
  end

}
