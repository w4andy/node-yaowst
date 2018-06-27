'use strict';

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const OpsWorks = require('../lib/opsworks');

suite('OpsWorks', function() {
  this.timeout(5000);

  suiteSetup(() => {});
  suiteTeardown(() => {});

  test('get data per layer', function(done) {
    const configFile = path.join(__dirname, '../resources/test/configOpsWorksLayer.json');
    fs.stat(configFile, (err) => {
      if (err && err.code !== 'ENOENT') {
        return done(err);
      } else if (err && err.code === 'ENOENT') {
        return done();
      }
      const opsWorksConfig = require(configFile);
      OpsWorks.fetchStackData(opsWorksConfig.stacks, function(fetchErr, data) {
        if (fetchErr) {
          done(fetchErr);
        }
        const expectedData = [
          {
            Host: 'opsworks_one_one_1',
            HostName: null,
            X_AutoScalingType: '24/7',
            User: 'yaowst_test',
            StrictHostKeyChecking: 'no',
            IdentityFile: '~/.ssh/opsworks',
            UserKnownHostsFile: '~/.ssh/known_hosts_opsworks'
          },
          {
            Host: 'opsworks_one_two_*',
            Port: 9999,
            User: 'yaowst_test',
            StrictHostKeyChecking: 'no',
            IdentityFile: '~/.ssh/opsworks',
            UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
            X_AutoScalingType: 'BASE_CONFIG'
          },
          {
            Host: 'opsworks_one_two_1',
            HostName: null,
            X_AutoScalingType: '24/7'
          },
          {
            Host: 'opsworks_one_two_2',
            HostName: null,
            X_AutoScalingType: '24/7'
          }
        ];

        expectedData.sort();

        // set ips to null
        let changedData = [];
        data.forEach(function(row) {
          if (row.HostName) {
            row.HostName = null;
          }
          changedData.push(row);
        });

        changedData.sort();

        assert.strictEqual(JSON.stringify(changedData), JSON.stringify(expectedData));
        done();
      });
    });
  });

  test('get data per stack', function(done) {
    const configFile = path.join(__dirname, '../resources/test/configOpsWorksStack.json');
    fs.stat(configFile, (err) => {
      if (err && err.code !== 'ENOENT') {
        return done(err);
      } else if (err && err.code === 'ENOENT') {
        return done();
      }
      const opsWorksConfig = require(configFile);
      OpsWorks.fetchStackData(opsWorksConfig.stacks, function(err, data) {
        if (err) {
          done(err);
        }
        const expectedData = [
          {
            Host: 'yaowst-*',
            UserKnownHostsFile: '~/.ssh/known_hosts_opsworks',
            IdentityFile: '~/.ssh/opsworks',
            StrictHostKeyChecking: 'no',
            User: 'yaowst_test',
            X_AutoScalingType: 'BASE_CONFIG'
          },
          {
            Host: 'yaowst-test-layer-one1',
            HostName: null,
            X_AutoScalingType: '24/7'
          },
          {
            Host: 'yaowst-test-layer-one2',
            HostName: null,
            X_AutoScalingType: '24/7'
          },
          {
            Host: 'yaowst-web1',
            HostName: null,
            X_AutoScalingType: '24/7'
          }];

        expectedData.sort();

        // set ips to null
        const changedData = [];
        data.forEach(function(row) {
          if (row.HostName) {
            row.HostName = null;
          }
          changedData.push(row);
        });

        changedData.sort();

        assert.strictEqual(JSON.stringify(changedData), JSON.stringify(expectedData));
        done();

      });
    });
  });

});
