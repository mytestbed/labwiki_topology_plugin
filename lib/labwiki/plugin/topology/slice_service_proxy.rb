
require 'singleton'
require 'open-uri'

module LabWiki::Plugin::Topology

  class SliceServiceProxy < OMF::Base::LObject
    include Singleton
    attr_reader :report_problems_to

    def speaks_for_user(user, speaks_for, &callback)
      post "users/#{URI::encode user}", { speaks_for: speaks_for }, &callback
    end

    def get(path, query = {}, &callback)
      _call(:aget, path, query: query, &callback)
    end

    def post(path, body = '', &callback)
      _call(:apost, path, body: body, &callback)
    end

    def healthy?
      @healthy
    end

    protected

    def _call(action, path, params, &callback)
      Fiber.new do
        begin
          debug "#{action} #{@url}/#{path} - #{params}"[0 .. 80]
          params[:path] = path.to_s
          http = EventMachine::HttpRequest.new(@url).send(action, params)
          http.callback do
            begin
              callback.call(:ok, JSON.parse(http.response)) if callback
            rescue => ex
              warn "Exception while processing reply from slice service - #{ex}"
            end
          end
          http.errback do
            begin
              err_reply = JSON.parse(http.response)
              if err_reply["type"] == "retry"
                # Retry if reply indicated so
                EM.add_timer(err_reply["delay"].to_i) do
                  _call(action, path, params, &callback)
                end
              else
                warn "Calling '#{path}' on Slice Service '#{@url}' failed - #{http.error}"
                callback.call(:error, reply) if callback
              end
            rescue => ex
              warn "Exception while processing error from slice service - #{ex}"
            end
          end
        rescue => ex
          warn "Exception while calling slice service - #{ex}"
          debug ex.backtrace.join("\n\t")
        end
      end.resume
    end

    def _check_service
      get 'version' do |status, reply|
        unless reply['service'] == 'SliceService'
          error "Seem to be connected to wrong service - #{reply}"
          yield
        end
        info "Using slice service '#{reply['version']}'"
        @healthy = true
      end
    end

    def initialize
      unless @opts = LabWiki::Configurator['plugins/topology/slice_service']
        raise "Can't find configuration for 'plugins/topology/slice_service'"
      end
      unless @url = @opts[:url]
        raise "Can't find url for Slice Service 'plugins/topology/slice_service/url'"
      end
      @healthy = false
      @report_problems_to = @opts[:report_problems_to]
      EventMachine.next_tick { _check_service }
      #speaks_for_user('max+ott', "<xml></xml>")
    end
  end
end
