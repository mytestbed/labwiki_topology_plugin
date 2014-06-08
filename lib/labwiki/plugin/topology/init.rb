
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'

OMF::Web::ContentRepository::MIME_TYPE[:gjson] = 'text/gjson'

LabWiki::PluginManager.register :topology, {
  :version => LabWiki.plugin_version([0, 2, 'pre'], __FILE__),

  :search => lambda do ||
  end,
  :selector => lambda do ||
  end,
  :widgets => [
    {
      :context => :prepare,
      :name => 'topology',
      :priority => lambda do |opts|
        #puts ">>> PRIORITY FOR #{opts}"
        (opts[:url].end_with? '.rspec') ? 500 : nil
      end,
      :search => lambda do |pat, opts, wopts|
        opts[:mime_type] ||= 'text/gjson'
        OMF::Web::ContentRepository.find_files(pat, opts)
      end,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget
    },
    {
      :context => :execute,
      :name => 'topology',
      :priority => lambda do |opts|
        puts ">>> PRIORITY FOR #{opts}"
        (opts[:url].end_with? '.rspec.json') ? 500 : nil
      end,
      :widget_class => LabWiki::Plugin::Topology::SliceMonitorWidget
    }
  ],
  :renderers => {
    :topology_editor_renderer => LabWiki::Plugin::Topology::TopologyEditorRenderer,
    :slice_monitor_renderer => LabWiki::Plugin::Topology::SliceMonitorRenderer
  },
  :resources => File.dirname(__FILE__) + '/resource',
  :global_js => 'js/topology_editor_global.js'

}

