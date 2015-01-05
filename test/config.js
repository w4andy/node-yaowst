"use strict";

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert'),
  os = require('os'), fs = require('fs'),
  Config = require('../lib/config');

suite('Config', function () {
  var filePathWriteTest = os.tmpDir() + '/configWriteTest_' + new Date().getTime() + '.json',
    filePathReadTest = __dirname + '/../resources/test/configReadTest.json';

  suiteSetup(function () {

  });


  test('write the base_config.json file', function (done) {
    var config = new Config(filePathWriteTest),
      baseConfig = {
        sshConfigFile: {},
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null'
        },
        stacks: []
      };

    config.writeDefaultFile(true, function (err) {
      if (err) {
        done(err);
      } else {
        var fileContent = fs.readFileSync(filePathWriteTest, 'utf8').trim(),
          fileContentJson = JSON.parse(fileContent);

        assert.strictEqual(JSON.stringify(fileContentJson), JSON.stringify(baseConfig));
        done();
      }
    });
  });

  test('read the config file', function (done) {
    var config = new Config(filePathReadTest),
      expectedData = {
        stacks: [
          {
            name: 'opsworks_one',
            id: 'sssssss',
            accessKeyId: 'xxxxxxxxx',
            secretAccessKey: 'yyyyyyyy',
            sshOptions: {
              StrictHostKeyChecking: 'yes',
              IdentityFile: '~/.ssh/opsworks'
            },
            layers: [
              {
                id: 'd1',
                name: 'xx',
                alias: 'opsworks_one_one_'
              },
              {
                id: 'd2',
                name: 'yy',
                alias: 'opsworks_one_two_',
                sshOptions: {
                  Port: 9999
                }
              },
              {
                id: 'd3',
                name: 'zz',
                alias: 'opsworks_one_two_',
                sshOptions: {
                  User: 'root'
                }
              }
            ]
          }
        ],
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
          User: 'node'
        },
        sshConfigFile: {
          file: null,
          saveMode: "24/7"
        }
      };

    config.getConfig(function (err, configData) {
      if (err) {
        done(err);
      } else {
        assert.strictEqual(JSON.stringify(configData), JSON.stringify(expectedData));
        done();
      }
    });
  });

  test('read the config file and enrichment the config data', function (done) {
    var config = new Config(filePathReadTest),
      expectedData = {
        stacks: [
          {
            name: 'opsworks_one',
            id: 'sssssss',
            accessKeyId: 'xxxxxxxxx',
            secretAccessKey: 'yyyyyyyy',
            sshOptions: {
              User: 'node',
              UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
              StrictHostKeyChecking: 'yes',
              IdentityFile: '~/.ssh/opsworks'
            },
            layers: [
              {
                id: 'd1',
                name: 'xx',
                alias: 'opsworks_one_one_'
              },
              {
                id: 'd2',
                name: 'yy',
                alias: 'opsworks_one_two_',
                sshOptions: {
                  Port: 9999
                }
              },
              {
                id: 'd3',
                name: 'zz',
                alias: 'opsworks_one_two_',
                sshOptions: {
                  User: 'root'
                }
              }
            ]
          }
        ],
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
          User: 'node'
        },
        sshConfigFile: {
          file: null,
          saveMode: "24/7"
        }
      };

    config.getEnhancedConfig(function (err, configData) {
      if (err) {
        done(err);
      } else {
        assert.strictEqual(JSON.stringify(configData), JSON.stringify(expectedData));
        done();
      }
    });
  });


  suiteTeardown(function () {
    fs.unlinkSync(filePathWriteTest);
  });
});