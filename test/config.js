'use strict';

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert');
var os = require('os');
var fs = require('fs');
var path = require('path');
var Config = require('../lib/config');

suite('Config', function() {
  var filePathWriteTest = path.join(os.tmpDir(), 'configWriteTest_' + new Date().getTime() + '.json'),
    filePathReadTest = path.join(__dirname, '../resources/test/configReadTest.json');

  suiteSetup(function(done) {
    // check if read test file has 0600
    fs.exists(filePathReadTest, function(exists) {
      if (exists) {
        fs.stat(filePathReadTest, function(err, fileStat) {
          if (err) {
            done(err);
          } else {
            var fileMode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
            if (fileMode === '600' || fileMode === '400') {
              done();
            } else {
              fs.chmod(filePathReadTest, '0600', function(err2) {
                done(err2);
              });
            }
          }
        });
      } else {
        done();
      }
    });
  });


  test('write the base_config.json file', function(done) {
    var config = new Config(filePathWriteTest),
      baseConfig = {
        opsWorks: {
          region: 'us-east-1'
        },
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null',
          IdentitiesOnly: 'yes'
        },
        stacks: []
      };

    config.writeDefaultFile(true, function(err) {
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

  test('read the config file', function(done) {
    var config = new Config(filePathReadTest),
      expectedData = {
        stacks: [
          {
            name: 'opsworks_one',
            id: 'sssssss',
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
          IdentitiesOnly: 'yes',
          User: 'node'
        },
        sshConfigFile: {
          file: null,
          saveMode: '24/7'
        },
        opsWorks: {
          region: 'us-east-1',
          accessKeyId: 'xxxxxxxxx',
          secretAccessKey: 'yyyyyyyy'
        }
      };

    config.getConfig(function(err, configData) {
      if (err) {
        done(err);
      } else {
        assert.strictEqual(JSON.stringify(configData), JSON.stringify(expectedData));
        done();
      }
    });
  });

  test('read the config file and enrichment the config data', function(done) {
    var config = new Config(filePathReadTest),
      expectedData = {
        stacks: [
          {
            name: 'opsworks_one',
            id: 'sssssss',
            sshOptions: {
              User: 'node',
              IdentitiesOnly: 'yes',
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
            ],
            accessKeyId: 'xxxxxxxxx',
            secretAccessKey: 'yyyyyyyy',
            region: 'us-east-1'
          }
        ],
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
          IdentitiesOnly: 'yes',
          User: 'node'
        },
        sshConfigFile: {
          file: null,
          saveMode: '24/7'
        },
        opsWorks: {
          region: 'us-east-1',
          accessKeyId: 'xxxxxxxxx',
          secretAccessKey: 'yyyyyyyy'
        }
      };

    config.getEnhancedConfig(function(err, configData) {
      if (err) {
        done(err);
      } else {
        assert.strictEqual(JSON.stringify(configData), JSON.stringify(expectedData));
        done();
      }
    });
  });


  suiteTeardown(function() {
    fs.unlinkSync(filePathWriteTest);
  });
});
