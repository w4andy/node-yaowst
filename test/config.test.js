'use strict';

/* global suite: false, setup: false, test: false,
    teardown: false, suiteSetup: false, suiteTeardown: false */

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Config = require('../lib/config');

suite('Config', function() {
  const filePathWriteTest = path.join(os.tmpdir(), 'configWriteTest_' + new Date().getTime() + '.json');
  const filePathReadTest = path.join(__dirname, '../resources/test/configReadTest.json');

  suiteSetup((done) => {
    // check if read test file has 0600
    fs.stat(filePathReadTest, (err, stats) => {
      if (err && err.code !== 'ENOENT') {
        return done(err);
      } else if (err && err.code === 'ENOENT') {
        return done();
      }
      const fileMode = parseInt(stats.mode.toString(8), 10).toString().substr(-3);
      if (fileMode === '600' || fileMode === '400') {
        done();
      } else {
        fs.chmod(filePathReadTest, '0600', function(err2) {
          done(err2);
        });
      }
    });
  });

  suiteTeardown(() => {
    fs.unlinkSync(filePathWriteTest);
  });

  test('write the base_config.json file', (done) => {
    const config = new Config(filePathWriteTest);
    const baseConfig = {
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

    config.writeDefaultFile(true, (err) => {
      if (err) {
        return done(err);
      }
      const fileContent = fs.readFileSync(filePathWriteTest, 'utf8').trim();
      const fileContentJson = JSON.parse(fileContent);

      assert.deepStrictEqual(fileContentJson, baseConfig);
      done();
    });
  });

  test('read the config file', (done) => {
    const config = new Config(filePathReadTest);
    const expectedData = {
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

    config.getConfig((err, configData) => {
      if (err) {
        return done(err);
      }
      assert.deepStrictEqual(configData, expectedData);
      done();
    });
  });

  test('read the config file and enrichment the config data', (done) => {
    const config = new Config(filePathReadTest);
    const expectedData = {
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

    config.getEnhancedConfig((err, configData) => {
      if (err) {
        return done(err);
      }
      assert.deepStrictEqual(configData, expectedData);
      done();
    });
  });
});
