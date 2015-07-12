"use strict";

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert'),
  os = require('os'), fs = require('fs'),
  Yaowst = require('../lib/yaowst');

suite('Yaowst', function () {
  this.timeout(5000);
  var configFilePathWrite = __dirname + '/../resources/test/configYaowst.json';

  suiteSetup(function (done) {
    // check if test config file has 0600
    fs.exists(configFilePathWrite, function(exists) {
      if (exists) {
        fs.stat(configFilePathWrite, function(err, fileStat) {
          if (err) {
            done(err);
          } else {
            var fileMode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
            if (fileMode === '600' || fileMode === '400') {
              done();
            } else {
              fs.chmod(configFilePathWrite, '0600', function(err) {
                done(err);
              });
            }
          }
        });
      } else {
        done();
      }
    });
  });

  test('first init yaowst', function (done) {
    var configFilePath = os.tmpDir() + '/configWriteTest_' + new Date().getTime() + '.json',
      sshConfigFile = os.tmpDir() + '/sshConf_' + new Date().getTime();
    var yaowst = new Yaowst({
      configFile: configFilePath,
      sshConfigFile: {file: sshConfigFile}
    }, function (err) {
      assert.strictEqual(err.message, 'config file dose not exists!');
      yaowst.firstInit({}, function (err) {
        if (err) {
          done(err);
        } else {
          fs.exists(configFilePath, function (exists) {
            assert.strictEqual(exists, true);
            fs.readFile(configFilePath, 'utf8', function (err, fileContent) {
              if (err) {
                done(err);
              } else {
                var baseConfig = {
                  sshOptions: {
                    StrictHostKeyChecking: 'no',
                    UserKnownHostsFile: '/dev/null'
                  },
                  stacks: []
                };
                var fileContentJson = JSON.parse(fileContent);
                assert.strictEqual(JSON.stringify(fileContentJson), JSON.stringify(baseConfig));
                done();
              }
            });
          });
        }
      });
    });
  });

  test('write ssh config', function (done) {
    var sshConfigFile = os.tmpDir() + '/sshConf_' + new Date().getTime();

    fs.exists(configFilePathWrite, function(exists) {
      if (exists) {
        var yaowst = new Yaowst({
          configFile: configFilePathWrite,
          sshConfigFile: {file: sshConfigFile}
        }, function (err) {
          if (err) {
            done(err);
          } else {
            yaowst.save({}, function(err, cnt) {
              if (err) {
                done(err);
              } else {
                assert.strictEqual(cnt, 4);
                fs.exists(sshConfigFile, function(exists) {
                  assert.strictEqual(exists, true);
                  fs.readFile(sshConfigFile, 'utf8', function (err, actualData) {
                    if (err) {
                      done(err);
                    } else {
                      actualData = actualData.replace(/HostName (?:[0-9]{1,3}\.){3}[0-9]{1,3}/g, "HostName none");
                      var expectedData = '';
                      expectedData += "## yaowst begin ##\n";
                      expectedData += "Host opsworks_one_one_1\n";
                      expectedData += "    HostName none\n";
                      expectedData += "    UserKnownHostsFile ~/.ssh/known_hosts_opsworks\n";
                      expectedData += "    StrictHostKeyChecking no\n";
                      expectedData += "    IdentityFile ~/.ssh/opsworks\n";
                      expectedData += "    User yaowst_test\n";
                      expectedData += "\n";
                      expectedData += "Host opsworks_one_two_*\n";
                      expectedData += "    UserKnownHostsFile ~/.ssh/known_hosts_opsworks\n";
                      expectedData += "    StrictHostKeyChecking no\n";
                      expectedData += "    IdentityFile ~/.ssh/opsworks\n";
                      expectedData += "    User yaowst_test\n";
                      expectedData += "\n";
                      expectedData += "Host opsworks_one_two_1\n";
                      expectedData += "    HostName none\n";
                      expectedData += "\n";
                      expectedData += "Host opsworks_one_two_2\n";
                      expectedData += "    HostName none\n";
                      expectedData += "\n";
                      expectedData += "## yaowst end ##\n";

                      assert.strictEqual(actualData, expectedData);
                      done();
                    }
                  });
                });
              }
            });
          }
        });
      } else {
        // skip test if file not exists
        done();
      }
    });

  });

  suiteTeardown(function () {
  });
});