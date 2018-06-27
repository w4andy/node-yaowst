'use strict';

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const SshConfig = require('../lib/sshconfig');

suite('SshConfig', function() {
  const writeFilePath = path.join(os.tmpdir(), 'sshWriteTest_' + new Date().getTime());
  const writeFileBackupPath = writeFilePath + '.old';

  suiteSetup(() => {
  });

  suiteTeardown(() => {
    fs.unlinkSync(writeFilePath);
    if (fs.existsSync(writeFileBackupPath)) {
      fs.unlinkSync(writeFileBackupPath);
    }
  });

  test('read the ssh config', (done) => {
    const sshConfig = new SshConfig({file: path.join(__dirname, '../resources/test/sshConfig')});
    sshConfig.parseConfig((err) => {
      if (err) {
        done(err);
      }
      const ante = [
          'Host "moon"',
          '    HostName 127.0.0.1',
          '    User root',
          ''
        ],
        post = [
          '',
          'Host "sun"',
          '    HostName 127.0.0.1',
          '    User root',
          ''
        ],
        yaowst = [
          'Host "opsworks_one_one_*"',
          '    User root',
          '    StrictHostKeyChecking no',
          '    IdentityFile ~/.ssh/opsworks',
          '',
          'Host "opsworks_one_one_1"',
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
      assert.strictEqual(sshConfig._stringConfig.yaowst.join('\n'), yaowst.join('\n'));
      assert.deepStrictEqual(sshConfig._config, config);
      done();
    });
  });

  test('write config file', (done) => {
    const sshConfig = new SshConfig({file: writeFilePath});
    const startConfig = [
      'Host "moon"',
      '    HostName 127.0.0.1',
      '    User root',
      '',
      '## yaowst begin ##',
      '',
      '## yaowst end ##',
      '',
      'Host "sun"',
      '    HostName 127.0.0.1',
      '    User root',
      ''
    ];

    // create empty file
    fs.writeFile(writeFilePath, startConfig.join('\n'), (err) => {
      if (err) {
        done(err);
      }
      const config = [
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
      sshConfig.writeConfig(config, (err2) => {
        if (err2) {
          done(err2);
        }
        fs.stat(writeFileBackupPath, (errStats, stats) => {
          if (errStats) {
            return done(errStats);
          } else if (!stats.isFile()) {
            return done(new Error('backup path is no file'));
          }

          fs.readFile(writeFilePath, {encoding: 'utf8'}, (err3, actualData) => {
            if (err3) {
              done(err3);
            }
            let expectedData = '';
            expectedData += 'Host "moon"\n';
            expectedData += '    HostName 127.0.0.1\n';
            expectedData += '    User root\n';
            expectedData += '\n';
            expectedData += '## yaowst begin ##\n';
            expectedData += 'Host "opsworks_one_one_*"\n';
            expectedData += '    User root\n';
            expectedData += '    StrictHostKeyChecking no\n';
            expectedData += '    IdentityFile ~/.ssh/opsworks\n';
            expectedData += '\n';
            expectedData += 'Host "opsworks_one_one_1"\n';
            expectedData += '    HostName 10.0.0.1\n';
            expectedData += '\n';
            expectedData += 'Host "opsworks_one_one_2"\n';
            expectedData += '    HostName 10.0.0.2\n';
            expectedData += '    User node\n';
            expectedData += '\n';
            expectedData += '## yaowst end ##\n';
            expectedData += '\n';
            expectedData += 'Host "sun"\n';
            expectedData += '    HostName 127.0.0.1\n';
            expectedData += '    User root\n';

            assert.strictEqual(actualData, expectedData);
            done();

          });
        });
      });
    });
  });
});
