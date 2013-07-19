
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'

LabWiki::PluginManager.register :topology, {
  :search => lambda do ||
  end,
  :selector => lambda do ||
  end,
  :widgets => [
    {
      :context => :prepare,
      :priority => lambda do |opts|
        #puts ">>> PRIORITY FOR #{opts}"
        (opts[:url].end_with? '.rspec') ? 500 : nil
      end,
      :widget_class => LabWiki::Plugin::Topology::TopologyEditorWidget
    },
    {
      :context => :execute,
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
  :resources => File.dirname(__FILE__) + '/resource' # should find a more portable solution
}

