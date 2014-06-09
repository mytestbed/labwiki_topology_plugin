
module LabWiki::Plugin
  module Topology; end
end

require 'labwiki/plugin/topology/topology_editor_widget'
require 'labwiki/plugin/topology/slice_monitor_widget'

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
      :context => :execute,
      :name => 'topology',
      :widget_class => LabWiki::Plugin::Topology::SliceMonitorWidget
    }
  ],
  renderers: {
    :topology_editor_renderer => LabWiki::Plugin::Topology::TopologyEditorRenderer,
    :slice_monitor_renderer => LabWiki::Plugin::Topology::SliceMonitorRenderer
  },
  resources: File.dirname(__FILE__) + '/resource',
  global_js: 'js/topology_editor_global.js',

  on_authorised: lambda do
    puts ">>>>>>>> ON_AUTH"
    speaks_for = OMF::Web::SessionStore[:speak_for, :user]
    File.open('/tmp/speaks_for.xml', 'w') {|f| f.write(speaks_for) }
    puts speaks_for
  end

}

