

task :package do
	files = `git ls-files`.split(/\n/)
	p files
	rm "dist/signalreports-app.zip" if File.exist?("dist/signalreports-app.zip")
	sh "zip", "dist/signalreports-app.zip", *files
end
