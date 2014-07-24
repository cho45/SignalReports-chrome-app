exports.config = {
    seleniumAddress: 'http://localhost:4444/wd/hub',
    capabilities: {
        'browserName': 'chrome',
        'chromeOptions':{
            'args': ['load-and-launch-app=' + require('path').resolve('.')]
        }
    },
    specs: [
        'specs/main_spec.js'
    ],

    jasmineNodeOpts: {
        showColors: true // Use colors in the command line report.
    }
};
