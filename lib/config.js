'use strict';

var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
var deepExtend = require('deep-extend');
var util = require('util');

/**
 * The yaowst config handler
 *
 * @param {string|null} configFile
 * @constructor
 */
function Config(configFile) {
  if (!configFile) {
    configFile = process.env.HOME + '/.yaowst';
  }
  Object.defineProperties(this, {
    _defaultConfig: {
      value: {
        opsWorks: {
          region: 'us-east-1'
        },
        sshConfigFile: {
          file: null,
          saveMode: '24/7'
        },
        sshOptions: {
          StrictHostKeyChecking: 'no',
          UserKnownHostsFile: '/dev/null',
          IdentitiesOnly: 'yes'
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
 * @param {function(?error, ?string)} callback
 * @private
 */
Config.prototype._readConfigFile = function(callback) {
  var self = this;
  fs.exists(this._configFile, function(exists) {
    if (exists) {
      fs.stat(self._configFile, function(err, fileStat) {
        if (err) {
          return callback(err);
        } else {
          var fileMode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
          if (fileMode === '600' || fileMode === '400') {
            fs.readFile(self._configFile, 'utf8', function(err2, data) {
              if (err2) {
                return callback(new Error('Can\'t write the config file' + err2.toString()));
              } else {
                return callback(null, data.trim());
              }
            });
          } else {
            return callback(new Error('The config file "' + self._configFile + '" must have the permission 0400 or 0600'));
          }
        }
      });
    } else {
      return callback(new Error('config file dose not exists!'));
    }
  });
};


/**
 * copy the default config file
 *
 * @param {boolean} force
 * @param {function(?error)} callback
 */
Config.prototype.writeDefaultFile = function(force, callback) {
  var self = this,
    defaultConfig = {
      opsWorks: {
        region: 'us-east-1'
      },
      sshOptions: {
        StrictHostKeyChecking: 'no',
        UserKnownHostsFile: '/dev/null',
        IdentitiesOnly: 'yes'
      },
      stacks: []
    };

  fs.exists(this._configFile, function(exists) {
    if (!exists || force) {

      // check if directory exists
      var checkConfigDirExists = function(cb) {
        var configDir = path.dirname(self._configFile);
        fs.exists(configDir, function(exists2) {
          if (!exists2) {
            shell.mkdir('-p', configDir);
            return cb();
          } else {
            return cb();
          }
        });
      };

      checkConfigDirExists(function() {
        fs.writeFile(self._configFile, JSON.stringify(defaultConfig, null, '  '), {mode: '0600'}, function(err) {
          if (err) {
            return callback(new Error('Can\'t write the config file. Error: ' + err.toString()));
          } else {
            return callback();
          }
        });
      });
    } else {
      return callback(new Error('The config file already exists!'));
    }
  });
};

/**
 * get the config data from the config file
 *
 * @param {function(?error, ?object)} callback
 * @return {function(?error, ?object)}
 */
Config.prototype.getConfig = function(callback) {
  var self = this;
  if (!this._configData) {
    this._readConfigFile(function(err, configString) {
      if (err) {
        return callback(err);
      } else {
        try {
          var configJson = JSON.parse(configString),
            configData = util._extend({}, self._defaultConfig);

          // extend the default config
          deepExtend(configData, configJson);

          // store the config data
          self._configData = configData;

          return callback(null, configData);
        } catch (err2) {
          return callback(new Error('can\'t parse the config, ' + err2.toString()));
        }
      }
    });
  } else {
    return callback(null, this._configData);
  }
};

/**
 * get the config with inherit sshOptions
 *
 * @param {function(?error, ?object)} callback
 */
Config.prototype.getEnhancedConfig = function(callback) {
  this.getConfig(function(err, configData) {
    if (err) {
      return callback(err);
    } else {
      var stacks = [];
      var iterStacks = function(cnt, cb) {
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

          if (configData.opsWorks.region && !stack.region) {
            stack.region = configData.opsWorks.region;
          }

          stacks.push(stack);
          iterStacks(++cnt, cb);
        } else {
          return cb();
        }
      };

      iterStacks(0, function(err2) {
        if (err2) {
          return callback(err2);
        } else {
          configData.stacks = stacks;
          return callback(null, configData);
        }
      });
    }
  });
};


module.exports = Config;
