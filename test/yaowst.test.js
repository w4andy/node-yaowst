'use strict';

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Yaowst = require('../lib/yaowst');

suite('Yaowst', function() {
  this.timeout(5000);
  const configFilePathWrite = path.join(__dirname, '../resources/test/configYaowst.json');

  suiteSetup((done) => {
    // check if test config file has 0600
    fs.stat(configFilePathWrite, (err, fileStat) => {
      if (err && err.code !== 'ENOENT') {
        return done(err);
      } else if (err && err.code === 'ENOENT') {
        return done();
      }
      const fileMode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
      if (fileMode === '600' || fileMode === '400') {
        return done();
      }
      fs.chmod(configFilePathWrite, '0600', (err2) => {
        done(err2);
      });
    });
  });

  suiteTeardown(() => {});

  test('first init yaowst', (done) => {
    const configFilePath = path.join(os.tmpdir(), 'configWriteTest_' + new Date().getTime() + '.json');
    const sshConfigFile = path.join(os.tmpdir(), 'sshConf_' + new Date().getTime());

    const yaowst = new Yaowst({
      configFile: configFilePath,
      sshConfigFile: {file: sshConfigFile}
    }, (err) => {
      assert.strictEqual(err.message, 'config file dose not exists!');
      yaowst.firstInit({}, (initErr) => {
        if (initErr) {
          return done(initErr);
        }
        fs.stat(configFilePath, (statErr) => {
          if (statErr) {
            return done(statErr);
          }
          fs.readFile(configFilePath, 'utf8', (readErr, fileContent) => {
            if (readErr) {
              done(readErr);
            } else {
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
              assert.deepStrictEqual(JSON.parse(fileContent), baseConfig);
              done();
            }
          });
        });
      });
    });
  });

  test('write ssh config', (done) => {
    const sshConfigFile = path.join(os.tmpdir(), 'sshConf_' + new Date().getTime());

    fs.stat(configFilePathWrite, (statErr) => {
      if (statErr && statErr.code !== 'ENOENT') {
        return done(statErr);
      } else if (statErr && statErr.code === 'ENOENT') {
        // skip test if file not exists
        return done();
      }
      const yaowst = new Yaowst({
        configFile: configFilePathWrite,
        sshConfigFile: {file: sshConfigFile}
      }, function(err) {
        if (err) {
          return done(err);
        }
        yaowst.save({}, (saveErr, cnt) => {
          if (saveErr) {
            return done(saveErr);
          }
          assert.strictEqual(cnt, 4);
          fs.stat(sshConfigFile, (statErr2) => {
            if (statErr2) {
              return done(statErr2);
            }
            fs.readFile(sshConfigFile, 'utf8', (readErr, actualData) => {
              if (readErr) {
                return done(readErr);
              }
              actualData = actualData.replace(/HostName (?:[0-9]{1,3}\.){3}[0-9]{1,3}/g, 'HostName none');
              let expectedData = '';
              expectedData += '## yaowst begin ##\n';
              expectedData += 'Host "opsworks_one_one_1"\n';
              expectedData += '    HostName none\n';
              expectedData += '    IdentitiesOnly yes\n';
              expectedData += '    UserKnownHostsFile ~/.ssh/known_hosts_opsworks\n';
              expectedData += '    StrictHostKeyChecking no\n';
              expectedData += '    IdentityFile ~/.ssh/opsworks\n';
              expectedData += '    User yaowst_test\n';
              expectedData += '\n';
              expectedData += 'Host "opsworks_one_two_*"\n';
              expectedData += '    IdentitiesOnly yes\n';
              expectedData += '    UserKnownHostsFile ~/.ssh/known_hosts_opsworks\n';
              expectedData += '    StrictHostKeyChecking no\n';
              expectedData += '    IdentityFile ~/.ssh/opsworks\n';
              expectedData += '    User yaowst_test\n';
              expectedData += '\n';
              expectedData += 'Host "opsworks_one_two_1"\n';
              expectedData += '    HostName none\n';
              expectedData += '\n';
              expectedData += 'Host "opsworks_one_two_2"\n';
              expectedData += '    HostName none\n';
              expectedData += '\n';
              expectedData += '## yaowst end ##\n';

              assert.strictEqual(actualData, expectedData);
              done();
            });
          });
        });
      });
    });
  });
});
