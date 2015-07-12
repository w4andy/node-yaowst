"use strict";

var Config = require('./config'),
  SshConfig = require('./sshconfig'),
  opsWorks = require('./opsworks'),
  util = require('util');

function Yaowst(options, callback) {
  var self = this;
  /**
   * init options
   *
   * @type {object}
   * @private
   */
  this._options = options || {};

  /**
   * the yaowst config
   *
   * @type {object}
   * @private
   */
  this._config = {};

  // init config and load data
  /**
   * the config object
   *
   * @type {Config}
   * @private
   */
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
        if (options.sshConfigFile.file) {
          config.sshConfigFile.file = options.sshConfigFile.file;
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

/**
 * get the hosts from ops works
 *
 * @param {function(?error, ?object[])} callback
 * @private
 */
Yaowst.prototype._loadHosts = function (callback) {
  var self = this;

  opsWorks.fetchStackData(self._config.stacks, callback);
};

/**
 * the ssh config object
 *
 * @type {SshConfig}
 * @private
 */
Yaowst.prototype._sshConfigObject = null;

/**
 * get the ssh config object
 *
 * @returns {SshConfig}
 * @private
 */
Yaowst.prototype._getSshConfigObject = function () {
  if (!this._sshConfigObject) {
    this._sshConfigObject = new SshConfig(this._options.sshConfigFile);
  }
  return this._sshConfigObject;
};

/**
 * save action
 * store the hosts into the ssh config file
 *
 * @param {object} option
 * @param {function(?error, ?number)} callback
 */
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
        sshConfigObject.writeConfig(hosts, function(err) {
          callback(err, hosts.length);
        });
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
            sshConfigObject.writeConfig(hostsToSave, function(err) {
              callback(err, hosts.length);
            });
          }
        });
      }
    }
  });
};


/**
 * first init action
 * create the config file and create a backup from the config file
 *
 * @param {object} option
 * @param {function(?error)} callback
 */
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

