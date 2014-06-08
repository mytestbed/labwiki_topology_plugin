
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'

OMF::Web::ContentRepository.register_mime_type(gjson: 'topology')

LabWiki::PluginManager.register :topology, {
  :version => LabWiki.plugin_version([0, 2, 'pre'], __FILE__),

  :widgets => [
    {
      :name => 'topology',
      :context => :prepare,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget,
      :handle_mime_type => 'topology'
    },
    {
      :context => :execute,
      :name => 'topology',
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

