labwiki_topology_plugin
=======================

A plugin for Labwiki to view and manipulate topologies

## Installation

Clone the git repo:

    git clone https://github.com/mytestbed/labwiki_topology_plugin.git

Then edit labwiki's configuration file to enable the plugin. E.g:

    labwiki:
      port: 4601
      plugins:
        experiment:
          ec_runner: /var/lib/omfwebapps/labwiki_6/test/omf_exec/omf_exec_6.sh
          ignore_slice: true
        topology:
          init: 'labwiki/plugin/topology/init'

Then start labwiki, including the path to the plugin library. E.g:

    ruby -I lib -I ../omf_web/lib -I ../labwiki_topology_plugin/lib lib/labwiki.rb --lw-config <config_file> -p 4601 start


## Try it

Download two sample files from example directory https://github.com/mytestbed/labwiki_topology_plugin/tree/master/example
and place into your repo's oidl directory. If Labwiki is configured with iRods integration, this can be done via iRods interface.

### Monitor topology

Try search exogeni5nodemanifest.rspec.json in Execute panel's search box (right column)


### Edit topology

Try search editmanifest.rspec in Prepare panel's search box (middle column)

