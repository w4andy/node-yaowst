"use strict";

/* global suite: false, setup: false, test: false,
 teardown: false, suiteSetup: false, suiteTeardown: false */

var assert = require('assert'),
  os = require('os'), fs = require('fs'),
  OpsWorks = require('../lib/opsworks'),
  util = require('util');

suite('opsWorks', function () {
  this.timeout(5000);

  var opsworksConnfig = {};

  suiteSetup(function (done) {
    var configFile = __dirname + '/../resources/test/configOpsworks.json';
    fs.exists(configFile, function (exists) {
      if (exists) {
        opsworksConnfig = require(configFile);
        done();
      } else {
        done(new Error('configOpsworks.json file don\'t exists, copy the configOpsworks.json.default and add you Id\'s.'));
      }
    });
  });

  test('get data from ops works', function (done) {
    OpsWorks.fetchStackData(opsworksConnfig.stacks, function (err, data) {
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
            UserKnownHostsFile: '~/.ssh/known_hosts_opsworks'
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

        data.forEach(function(row) {
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
  });

  suiteTeardown(function () {

  });
});