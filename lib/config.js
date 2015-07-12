"use strict";

var fs = require('fs'),
  path = require('path'),
  shell = require('shelljs'),
  deepExtend = require('deep-extend'),
  util = require('util');

/**
 * The yaowst config handler
 * @param {String|null} configFile
 * @constructor
 */
function Config(configFile) {
  if (!configFile) {
    configFile = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.yaowstconfig.json';
  }
  Object.defineProperties(this, {
    _defaultConfig: {
      value: {
        opsWorks: {},
        sshConfigFile: {
          file: null,
          saveMode: '24/7'
        },
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null'
        },
        stacks: []
      },
      writable: false
    },
    _configFile: {
      value: configFile,
      writable: false
    },
    _configData: {
      value: null,
      writable: true
    }
  });

}

/**
 * read the config file
 *
 * @param {function(Error, String)} callback
 * @private
 */
Config.prototype._readConfigFile = function (callback) {
  var self = this;
  fs.exists(this._configFile, function (exists) {
    if (exists) {
      fs.stat(self._configFile, function (err, fileStat) {
        if (err) {
          callback(err);
        } else {
          var fileMode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
          if (fileMode === '600' || fileMode === '400') {
            fs.readFile(self._configFile, 'utf8', function (err, data) {
              if (err) {
                callback(new Error('Can\'t write the config file' + err.toString()));
              } else {
                callback(null, data.trim());
              }
            });
          } else {
            callback(new Error('The config file "' + self._configFile + '" must have the permission 0400 or 0600'));
          }
        }
      });
    } else {
      callback(new Error('config file dose not exists!'));
    }
  });
};


/**
 * copy the default config file
 *
 * @param {boolean} force
 * @param {function(Error)} callback
 */
Config.prototype.writeDefaultFile = function (force, callback) {
  var self = this,
    defaultConfig = {
      sshOptions: {
        StrictHostKeyChecking: 'no',
        UserKnownHostsFile: '/dev/null'
      },
      stacks: []
    };

  fs.exists(this._configFile, function (exists) {
    if (!exists || force) {

      // check if directory exists
      var checkConfigDirExists = function (callback) {
        var configDir = path.dirname(self._configFile);
        fs.exists(configDir, function (exists) {
          if (!exists) {
            shell.mkdir('-p', configDir);
            callback();
          } else {
            callback();
          }
        });
      };

      checkConfigDirExists(function () {
        fs.writeFile(self._configFile, JSON.stringify(defaultConfig, null, '  '), {mode: '0600'}, function (err) {
          if (err) {
            console.log(err);
            callback(new Error('Can\'t write the config file. Error: ' + err.toString()));
          } else {
            callback();
          }
        });
      });
    } else {
      callback(new Error('The config file already exists!'));
    }
  });
};

/**
 * get the config data from the config file
 *
 * @param {function(Error, Object)} callback
 */
Config.prototype.getConfig = function (callback) {
  var self = this;
  if (!this._configData) {
    this._readConfigFile(function (err, configString) {
      if (err) {
        callback(err);
      } else {
        try {
          var configJson = JSON.parse(configString),
            configData = util._extend({}, self._defaultConfig);

          // extend the default config
          deepExtend(configData, configJson);

          // store the config data
          self._configData = configData;

          callback(null, configData);
        } catch (err) {
          callback(new Error('can\'t parse the config, ' + err.toString()));
        }
      }
    });
  } else {
    callback(null, this._configData);
  }
};


/**
 * get the config with inherit sshOptions
 *
 * @param {function(Error, Object)} callback
 */
Config.prototype.getEnhancedConfig = function (callback) {
  this.getConfig(function (err, configData) {
    if (err) {
      callback(err);
    } else {
      var stacks = [];
      var iterStacks = function (cnt, callback) {
        if (configData.stacks.length > cnt) {
          var stack = configData.stacks[cnt],
            baseSshOptions = util._extend({}, configData.sshOptions),
            stackSshOptions = stack.sshOptions || {};

          // add ssh options
          stack.sshOptions = util._extend(baseSshOptions, stackSshOptions);

          // add global opsWorks settings
          if (configData.opsWorks.accessKeyId && !stack.accessKeyId) {
            stack.accessKeyId = configData.opsWorks.accessKeyId;
          }

          if (configData.opsWorks.secretAccessKey && !stack.secretAccessKey) {
            stack.secretAccessKey = configData.opsWorks.secretAccessKey;
          }

          stacks.push(stack);
          iterStacks(++cnt, callback);
        } else {
          callback();
        }
      };

      iterStacks(0, function (err) {
        if (err) {
          callback(err);
        } else {
          configData.stacks = stacks;
          callback(null, configData);
        }
      });
    }
  });
};


module.exports = Config;