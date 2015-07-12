"use strict";

var Config = require('./config'),
  SshConfig = require('./sshconfig'),
  opsWorks = require('./opsworks'),
  util = require('util');

function Yaowst(options, callback) {
  var self = this;
  this._options = options || {};

  // init config and load data
  this._configObject = new Config(options.configFile);
  this._configObject.getEnhancedConfig(function (err, config) {
    if (err) {
      callback(err);
    } else {
      if (!config.sshConfigFile) {
        config.sshConfigFile = {};
      }
      // overwrite ssh config file
      if (options.sshConfigFile) {
        if (options.sshConfigFile.configFile) {
          config.sshConfigFile.configFile = options.sshConfigFile.configFile;
        }
        if (options.sshConfigFile.saveMode) {
          config.sshConfigFile.saveMode = options.sshConfigFile.saveMode;
        }
      }
      self._config = config;
      callback();
    }
  });
}

Yaowst.prototype._config = {};

Yaowst.prototype._loadHosts = function (callback) {
  var self = this;

  opsWorks.fetchStackData(self._config.stacks, callback);
};

Yaowst.prototype._sshConfigObject = null;
Yaowst.prototype._getSshConfigObject = function () {
  if (!this._sshConfigObject) {
    this._sshConfigObject = new SshConfig(this._options.sshConfigFile);
  }
  return this._sshConfigObject;
};

Yaowst.prototype.save = function (option, callback) {
  var saveMode = this._config.sshConfigFile.saveMode,
    sshConfigObject = this._getSshConfigObject(),
    allowedSaveModes = [sshConfigObject.SAVE_MODE_24_7, sshConfigObject.SAVE_MODE_ALL];

  if (option.saveMode && allowedSaveModes.indexOf(option.saveMode) === -1) {
    option.saveMode = null;
  }

  if (option.saveMode) {
    saveMode = option.saveMode;
  }

  this._loadHosts(function(err, hosts) {
    if (err) {
      callback(err);
    } else {
      if (saveMode === sshConfigObject.SAVE_MODE_ALL) {
        sshConfigObject.writeConfig(hosts, callback);
      } else {
        var hostsToSave = [];
        var iterHosts = function(cnt, callback) {
          if (hosts.length > cnt) {
            var entry = hosts[cnt];

            if (entry.X_AutoScalingType === '24/7' || entry.X_AutoScalingType === 'BASE_CONFIG') {
              hostsToSave.push(entry);
            }

            setImmediate(function() {
              iterHosts(++cnt, callback);
            });
          } else {
            callback();
          }
        };

        iterHosts(0, function(err) {
          if (err) {
            callback(err);
          } else {
            sshConfigObject.writeConfig(hostsToSave, callback);
          }
        });
      }
    }
  });

};

Yaowst.prototype.firstInit = function (option, callback) {
  var self = this;
  this._configObject.writeDefaultFile(option.force, function (err) {
    if (err) {
      callback(err);
    } else {
      self._getSshConfigObject().backUpConfig(true, function (err) {
        callback(err);
      });
    }
  });
};

module.exports = Yaowst;

