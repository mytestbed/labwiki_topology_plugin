
require 'singleton'
require 'open-uri'
require 'rexml/document'
require 'rexml/xpath'

module LabWiki::Plugin::Topology

  class SliceServiceProxy < OMF::Base::LObject
    # Time after which to re-check a user's slice membership
    SLICE_CHECK_INTERVAL = 60

    include Singleton

    attr_reader :report_problems_to

    @@slice_memberships_for_users = {}

    def find_slice(pattern, opts, wopts, &cbk)
      slice_memberships do |status, memberships|
        next unless status == :ok

        regex = Regexp.new(pattern)
        memberships.each do |sm|
          # "slice_urn"=>"urn:publicid:IDN+ch.geni.net:max_mystery_project+slice+foo96", "role"=>"LEAD", "href"=>"..."
          slice_urn = sm['slice_urn']
          name = slice_urn.split('+')[-1]
          next unless (name =~ regex)
          slice_url = URI.parse(sm['href']).path + '/slice'
          cbk.call({
            #url: r["href"], name: r["name"], status: r['status'],
            slice_url: slice_url, name: "Slice #{name}",
            mime_type: 'slice', widget: 'slice_monitor' #, plugin: 'experiment'
          })
        end
      end
    end

    # Return an array of slice memberships for the logged in user.
    # If that infomration is not known yet, or stale, a call to
    # SliceService will be initiated and the result delivered in
    # the optional callback.
    #
    def slice_memberships(&callback)
      user = _user_urn
      smr = @@slice_memberships_for_users[user]
      if smr.nil? || (Time.now - smr[:checked_at]) > SLICE_CHECK_INTERVAL
        get "users/#{user}/slice_memberships" do |status, reply|
          if status == :ok
            memberships = reply.map do |sm|
              # extract slice name
              sm[:slice_name] = sm['slice_urn'].split('+')[-1]
              sm
            end
            @@slice_memberships_for_users[user] = {
              checked_at: Time.now,
              memberships: memberships
            }
            reply = memberships
          end
          callback.call(status, reply) if callback
        end
        nil
      else
        memberships = smr[:memberships]
        callback.call(:ok, memberships) if callback
        memberships
      end
    end

    def request_slivers slice_membership_uuid, resources, &callback
      url = "/users/#{_user_urn}/slice_memberships/#{slice_membership_uuid}/slice/resources"
      put url, resources, 'application/gjson', &callback
    end

    def speaks_for_user(user, speaks_for)
      post "users/#{_user_urn}", speaks_for: speaks_for
    end

    # Return an array of hashes containing the 'name' and 'urn'
    # of all aggregates we can request resources from
    def aggregates
      @aggregates
    end

    # Return true if user is authorised or not (call callback with boolean as well)
    def user_authorised?(&callback)
      authorised = false
      begin
        xml = REXML::Document.new(Net::HTTP.get(URI("#{@url}/speaks_fors/#{_user_urn}")))
        expires = REXML::XPath.first(xml, "//credential/expires").text
        authorised = Time.parse(expires) > Time.now
      rescue
        authorised = false
      end
      callback.call(authorised) if callback
      authorised
    end

    def get(path, query = {}, &callback)
      _call(:aget, path, query: query, &callback)
    end

    def post(path, body = '', mime_type = nil, &callback)
      params = {body: body}
      params[:head] = {'Content-Type' => mime_type} if mime_type
      _call(:apost, path, params, &callback)
    end

    def put(path, body = '', mime_type = nil, &callback)
      params = {body: body}
      params[:head] = {'Content-Type' => mime_type} if mime_type
      _call(:aput, path, params, &callback)
    end

    def healthy?
      @healthy
    end

    protected

    def _call(action, path, params, &callback)
      session_ctxt = OMF::Web::SessionContext.new # preserve session for callback
      Fiber.new do
        begin
          debug "#{action} #{@url}/#{path} - #{params}"[0 .. 80]
          params[:path] = path.to_s
          params[:redirects] ||= 1
          http = EventMachine::HttpRequest.new(@url).send(action, params)
          http.callback do
            session_ctxt.call do # restore original session context
              begin
                #puts ">>>>> class: #{http.class} response: #{http.response_header.status} -- #{http.redirects} - #{http.last_effective_url.path}"
                response = http.response
                case code = http.response_header.status
                when 200
                  callback.call(:ok, JSON.parse(response)) if callback
                when 404
                  warn "Slice service has returned a 404 error - #{response} "
                  callback.call(:error, {code: code, response: response}) if callback
                when 504
                  # not ready try again in a while, but make sure we treat promises correctly
                  begin
                    jresponse = JSON.parse(response)
                  rescue
                    jresponse = {"delay" => 10}
                  end
                  lpath = http.last_effective_url.path
                  if lpath.start_with? '/promises'
                    callback.call(:progress, jresponse["progress"] || []) if callback
                    EM.add_timer((jresponse['delay'] || 10).to_i) do
                      _call(:get, lpath, {}, &callback)
                    end
                  else
                    # just simply retry again
                    callback.call(:progress, jresponse["progress"] || []) if callback
                    EM.add_timer((jresponse['delay'] || 10).to_i) do
                      _call(action, path, params, &callback)
                    end
                  end
                else
                  warn "Slice service has returned unhandled '#{code}' error - #{response} "
                  callback.call(:error, {code: code, response: response}) if callback
                end
              rescue => ex
                warn "Exception while processing reply from slice service - #{ex}"
                debug ex.backtrace.join("\n\t")
              end
            end
          end
          http.errback do
            session_ctxt.call do # restore original session context
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
          end
        rescue => ex
          warn "Exception while calling slice service - #{ex}"
          debug ex.backtrace.join("\n\t")
        end
      end.resume
    end

    # Return the urn for the logged in user
    def _user_urn
      user = OMF::Web::SessionStore[:urn, :user]
      unless user
        warn "Can't find 'urn' for user '#{OMF::Web::SessionStore[:urn, :id]}'"
        return nil
      end
      user
    end

    def _check_service
      get 'version' do |status, reply|
        unless status == :ok && reply['service'] == 'SliceService'
          error "Seem to be connected to wrong service - #{reply}"
          yield
        end
        info "Using slice service '#{reply['version']}'"
        @healthy = true
        _get_aggregates

        # get 'users/urn:publicid:IDN+ch.geni.net+user+maxott/slice_memberships', _level: 2, _refresh: true do |p, r|
        #   puts ">>>> #{p} - #{r}"
        # end
      end
    end

    def _get_aggregates
      get 'authorities', _level: 2 do |status, reply|
        yield unless status == :ok

        @aggregates = reply.map do |au|
          next nil unless au.key? 'aggregate_manager_2'

          {name: au['name'], urn: au['urn']}
        end.compact
        #puts ">>>> AGG>>> #{@aggregates}"
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
