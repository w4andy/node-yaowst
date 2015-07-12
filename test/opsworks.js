"use strict";

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert'), fs = require('fs'),
  OpsWorks = require('../lib/opsworks');

suite('OpsWorks', function () {
  this.timeout(5000);

  suiteSetup(function () {

  });

  test('get data per layer', function (done) {
    var configFile = __dirname + '/../resources/test/configOpsWorksLayer.json';
    fs.exists(configFile, function (exists) {
      if (exists) {
        var opsWorksConfig = require(configFile);
        OpsWorks.fetchStackData(opsWorksConfig.stacks, function (err, data) {
          if (err) {
            done(err);
          } else {
            var expectedData = [{
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
              }];

            expectedData.sort();

            // set ips to null
            var changedData = [];
            data.forEach(function (row) {
              if (row.HostName) {
                row.HostName = null;
              }
              changedData.push(row);
            });

            changedData.sort();

            assert.strictEqual(JSON.stringify(changedData), JSON.stringify(expectedData));
            done();
          }
        });
      } else {
        done();
      }
    });
  });

  test('get data per stack', function (done) {
    var configFile = __dirname + '/../resources/test/configOpsWorksStack.json';
    fs.exists(configFile, function (exists) {
      if (exists) {
        var opsWorksConfig = require(configFile);
        OpsWorks.fetchStackData(opsWorksConfig.stacks, function (err, data) {
          if (err) {
            done(err);
          } else {
            var expectedData = [
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
            var changedData = [];
            data.forEach(function (row) {
              if (row.HostName) {
                row.HostName = null;
              }
              changedData.push(row);
            });

            changedData.sort();

            assert.strictEqual(JSON.stringify(changedData), JSON.stringify(expectedData));
            done();
          }
        });
      } else {
        done();
      }
    });
  });

  suiteTeardown(function () {

  });
});