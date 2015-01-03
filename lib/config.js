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
    configFile = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.yaowst/config.json';
  }
  Object.defineProperties(this, {
    _defaultConfig: {
      value: {
        sshConfigFile: {
          file: null,
          saveMode: '24/7',
          force: false
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
  var self = this;

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
        fs.readFile(__dirname + '/../resources/base_config.json', function (err, fileData) {
          if (err) {
            callback(err);
          } else {
            fs.writeFile(self._configFile, fileData, {mode: '0600'}, function (err) {
              if (err) {
                console.log(err);
                callback(new Error('Can\'t write the config file. Error: ' + err.toString()));
              } else {
                callback();
              }
            });
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
  var self = this;
  this.getConfig(function (err, configData) {
    if (err) {
      callback(err);
    } else {
      var stacks = [], layers = [], baseLayers = [];
      var iterStacks = function (cnt, callback) {
        if (configData.stacks.length > cnt) {
          layers = [];
          var stack = configData.stacks[cnt],
            baseSshOptions = util._extend({}, configData.sshOptions),
            stackSshOptions = stack.sshOptions || {};

          stack.sshOptions = util._extend(baseSshOptions, stackSshOptions);

          if (stack.layers && util.isArray(stack.layers) && stack.layers.length) {
            baseLayers = stack.layers;
            iterLayers(0, stack.sshOptions, function(err) {
              if (err) {
                callback(err);
              } else {
                stack.layers = layers;
                stacks.push(stack);
                iterStacks(++cnt, callback);
              }
            });
          } else {
            stack.layers = [];
            stacks.push(stack);
            iterStacks(++cnt, callback);
          }
        } else {
          callback();
        }
      };

      var iterLayers = function(cnt, stackSshOptions, callback) {
        if (baseLayers.length > cnt) {
          var layer = baseLayers[cnt],
            baseSshOptions = util._extend({}, stackSshOptions),
            layerSshOptions = layer.sshOptions || {};

          layer.sshOptions = util._extend(baseSshOptions, layerSshOptions);

          layers.push(layer);
          iterLayers(++cnt, stackSshOptions, callback);
        } else {
          callback();
        }
      };

      iterStacks(0, function(err) {
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