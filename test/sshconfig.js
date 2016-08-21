'use strict';

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert');
var os = require('os');
var fs = require('fs');
var path = require('path');
var SshConfig = require('../lib/sshconfig');

suite('SshConfig', function() {
  var writeFilePath = path.join(os.tmpDir(), 'sshWriteTest_' + new Date().getTime()),
    writeFileBackupPath = writeFilePath + '.old';

  suiteSetup(function() {

  });

  test('read the ssh config', function(done) {
    var sshConfig = new SshConfig({file: path.join(__dirname, '../resources/test/sshConfig')});
    sshConfig.parseConfig(function(err) {
      if (err) {
        done(err);
      } else {
        var ante = [
            'Host moon',
            '    HostName 127.0.0.1',
            '    User root',
            ''
          ],
          post = [
            '',
            'Host sun',
            '    HostName 127.0.0.1',
            '    User root',
            ''
          ],
          yaost = [
            'Host opsworks_one_one_*',
            '    User root',
            '    StrictHostKeyChecking no',
            '    IdentityFile ~/.ssh/opsworks',
            '',
            'Host opsworks_one_one_1',
            '    HostName 10.0.0.1',
            '',
            'Host opsworks_one_one_2',
            '    HostName 10.0.0.2',
            '    User node',
            ''
          ],
          config = [
            {
              Host: 'opsworks_one_one_*',
              User: 'root',
              StrictHostKeyChecking: 'no',
              IdentityFile: '~/.ssh/opsworks'
            },
            {
              Host: 'opsworks_one_one_1',
              HostName: '10.0.0.1'
            },
            {
              Host: 'opsworks_one_one_2',
              HostName: '10.0.0.2',
              User: 'node'
            }
          ];
        assert.strictEqual(sshConfig._stringConfig.ante.join('\n'), ante.join('\n'));
        assert.strictEqual(sshConfig._stringConfig.post.join('\n'), post.join('\n'));
        assert.strictEqual(sshConfig._stringConfig.yaowst.join('\n'), yaost.join('\n'));
        assert.strictEqual(JSON.stringify(sshConfig._config), JSON.stringify(config));
        done();
      }
    });
  });

  test('write config file', function(done) {
    var sshConfig = new SshConfig({file: writeFilePath}),
      startConfig = [];

    startConfig.push('Host moon');
    startConfig.push('    HostName 127.0.0.1');
    startConfig.push('    User root');
    startConfig.push('');
    startConfig.push('## yaowst begin ##');
    startConfig.push('');
    startConfig.push('## yaowst end ##');
    startConfig.push('');
    startConfig.push('Host sun');
    startConfig.push('    HostName 127.0.0.1');
    startConfig.push('    User root');
    startConfig.push('');

    // create empty file
    fs.writeFile(writeFilePath, startConfig.join('\n'), function(err) {
      if (err) {
        done(err);
      } else {
        var config = [
          {
            Host: 'opsworks_one_one_*',
            User: 'root',
            StrictHostKeyChecking: 'no',
            IdentityFile: '~/.ssh/opsworks'
          },
          {
            Host: 'opsworks_one_one_1',
            HostName: '10.0.0.1'
          },
          {
            Host: 'opsworks_one_one_2',
            HostName: '10.0.0.2',
            User: 'node'
          }
        ];
        sshConfig.writeConfig(config, function(err2) {
          if (err2) {
            done(err2);
          } else {
            fs.exists(writeFileBackupPath, function(exists) {
              assert.strictEqual(exists, true);

              fs.readFile(writeFilePath, {encoding: 'utf8'}, function(err3, actualData) {
                if (err3) {
                  done(err3);
                } else {
                  var expectedData = '';
                  expectedData += 'Host moon\n';
                  expectedData += '    HostName 127.0.0.1\n';
                  expectedData += '    User root\n';
                  expectedData += '\n';
                  expectedData += '## yaowst begin ##\n';
                  expectedData += 'Host opsworks_one_one_*\n';
                  expectedData += '    User root\n';
                  expectedData += '    StrictHostKeyChecking no\n';
                  expectedData += '    IdentityFile ~/.ssh/opsworks\n';
                  expectedData += '\n';
                  expectedData += 'Host opsworks_one_one_1\n';
                  expectedData += '    HostName 10.0.0.1\n';
                  expectedData += '\n';
                  expectedData += 'Host opsworks_one_one_2\n';
                  expectedData += '    HostName 10.0.0.2\n';
                  expectedData += '    User node\n';
                  expectedData += '\n';
                  expectedData += '## yaowst end ##\n';
                  expectedData += '\n';
                  expectedData += 'Host sun\n';
                  expectedData += '    HostName 127.0.0.1\n';
                  expectedData += '    User root\n';

                  assert.strictEqual(actualData, expectedData);
                  done();
                }
              });
            });
          }
        });
      }
    });
  });

  suiteTeardown(function() {
    fs.unlink(writeFilePath);
    if (fs.existsSync(writeFileBackupPath)) {
      fs.unlink(writeFileBackupPath);
    }
  });

});
