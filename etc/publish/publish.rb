#!/usr/bin/env ruby

require 'rubygems'
require 'google/api_client'
require 'google/api_client/client_secrets'
require 'google/api_client/auth/file_storage'
require 'google/api_client/auth/installed_app'
require 'logger'
require 'adif'

# ENV['BROWSER'] = 'echo'

class ADIFGoogleDrivePublisher
	API_VERSION = 'v2'
	CREDENTIAL_STORE_FILE = "#{$0}-oauth2.json"

	def initialize
	end

	def setup
		@client = Google::APIClient.new(:application_name => 'ADIF Publisher', :application_version => '1.0.0')
		file_storage = Google::APIClient::FileStorage.new(CREDENTIAL_STORE_FILE)
		if file_storage.authorization.nil?
			client_secrets = Google::APIClient::ClientSecrets.load
			flow = Google::APIClient::InstalledAppFlow.new(
				:client_id => client_secrets.client_id,
				:client_secret => client_secrets.client_secret,
				:scope => ['https://www.googleapis.com/auth/drive']
			)
			@client.authorization = flow.authorize(file_storage)
		else
			@client.authorization = file_storage.authorization
		end
		@drive = @client.discovered_api('drive', API_VERSION)
	end

	def publish
		root = @client.execute(
			:api_method => @drive.files.list,
			:parameters => {
				'q' => 'title = "signalreports" and mimeType = "application/vnd.google-apps.folder"'
			},
		).data["items"][0]

		parent = @client.execute(
			:api_method => @drive.files.list,
			:parameters => {
				'q' => '"%s" in parents and title = "backup" and mimeType = "application/vnd.google-apps.folder"' % [ root["id"] ]
			},
		).data["items"][0]

		files = @client.execute(
			:api_method => @drive.files.list,
			:parameters => {
				'q' => '"%s" in parents and modifiedDate > "%s"' % [ parent["id"], (Time.now - (60 * 60 * 24 * 2)).utc.strftime('%Y-%m-%dT%H:%M:%S') ]
			},
		).data["items"]

		file =  files.sort_by {|i| i["title"] }.last

		p file["downloadUrl"]

		adi = @client.execute(
			:uri => file["downloadUrl"]
		).body

		data = ADIF.parse_adi(adi)
		require 'pp'
		pp data
	end
end


publisher = ADIFGoogleDrivePublisher.new
publisher.setup
publisher.publish

