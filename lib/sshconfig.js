'use strict';

var fs = require('fs');

/**
 * The ssh config handler
 *
 * @param {object|null} options
 * @constructor
 */
function SshConfig(options) {
  if (!options) {
    options = {};
  }
  if (!options.file) {
    options.file = process.env.HOME + '/.ssh/config';
  }
  Object.defineProperties(this, {
    _configFile: {
      value: options.file,
      writable: false
    },
    _stringConfig: {
      value: {
        ante: [],
        post: [],
        yaowst: []
      },
      writable: true
    },
    _config: {
      value: [],
      writable: true
    },
    CONFIG_BEGIN: {
      value: '## yaowst begin ##',
      writable: false
    },
    CONFIG_END: {
      value: '## yaowst end ##',
      writable: false
    },
    PART_TYPE_ANTE: {
      value: 'ante',
      writable: false
    },
    PART_TYPE_POST: {
      value: 'post',
      writable: false
    },
    PART_TYPE_YAOWST: {
      value: 'yaowst',
      writable: false
    },
    SAVE_MODE_ALL: {
      value: 'all',
      writable: false
    },
    SAVE_MODE_24_7: {
      value: '24/7',
      writable: false
    }
  });
}

/**
 * read the ssh config file and split the config data into ante yaowst, post yaowst and yaowst config lines
 *
 * @param {function(?error, ?object)} callback
 * @private
 */
SshConfig.prototype._readConfigFile = function(callback) {
  var self = this;
  fs.exists(this._configFile, function(exists) {
    if (exists) {
      fs.readFile(self._configFile, 'utf8', function(err, data) {
        if (err) {
          return callback(err);
        } else {
          var lines = data.split('\n'), partType = self.PART_TYPE_ANTE;

          var iterLines = function(cnt, cb) {
            if (lines.length > cnt) {
              var line = lines[cnt].replace(/\s+$/, '');

              if (line === self.CONFIG_BEGIN) {
                partType = self.PART_TYPE_YAOWST;
              } else if (line === self.CONFIG_END) {
                partType = self.PART_TYPE_POST;
              } else {
                self._stringConfig[partType].push(line);
              }
              iterLines(++cnt, cb);
            } else {
              return cb();
            }
          };

          iterLines(0, function(err2) {
            callback(err2, self._stringConfig);
          });
        }
      });
    } else {
      return callback(null, self._stringConfig);
    }
  });
};

/**
 * backup the sshConfig file
 *
 * @param {Boolean} [initBackup] if true then use <filename>_backup_<date>
 * @param {function(?error)} callback
 */
SshConfig.prototype.backUpConfig = function(initBackup, callback) {
  var self = this;

  if (typeof initBackup === 'function') {
    callback = initBackup;
    initBackup = false;
  }

  fs.exists(this._configFile, function(exists) {
    if (exists) {
      fs.stat(self._configFile, function(err, fileStat) {
        if (err) {
          return callback(err);
        } else {
          fs.readFile(self._configFile, {encoding: 'utf8'}, function(err2, data) {
            if (err2) {
              return callback(err2);
            } else {
              var newFile = self._configFile + '.old',
                mode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);

              if (initBackup) { // use timestamp for init backup
                newFile = self._configFile + '.backup_' + new Date().toISOString().replace('T', '_').replace(/\..+/, '').replace(/:/g, '-');
              }

              fs.writeFile(newFile, data, {encoding: 'utf8', mode: mode}, function(err3) {
                callback(err3);
              });
            }
          });
        }
      });
    } else {
      return callback();
    }
  });
};

/**
 * parse the yaowst config part
 *
 * @param {function(?error)} callback
 */
SshConfig.prototype.parseConfig = function(callback) {
  var self = this;
  this._readConfigFile(function(err) {
    if (err) {
      return callback(err);
    } else {
      var hostConfig = {};
      var iterConfig = function(cnt, cb) {
        if (self._stringConfig.yaowst.length > cnt) {
          var line = self._stringConfig.yaowst[cnt];
          if (line.trim().substr(0, 1) !== '#') { // no configs
            if (!/^\s+/.test(line) && JSON.stringify(hostConfig) !== '{}') {
              self._config.push(hostConfig);
              hostConfig = {};
            }
            var lineData = line.trim().split(/\s+/);
            if (lineData.length > 1) {
              var configName = lineData.shift(),
                configValue = lineData.join(' ');

              if (configName === 'Host') {
                if (configValue.substr(0, 1) === '"') {
                  configValue = configValue.substr(1);
                }
                if (configValue.substr(-1, 1) === '"') {
                  configValue = configValue.substr(0, configValue.length - 1);
                }
              }
              hostConfig[configName] = configValue;
            }
          }
          iterConfig(++cnt, cb);
        } else {
          return cb();
        }
      };
      iterConfig(0, function(err2) {
        callback(err2);
      });
    }
  });
};

/**
 * write the ssh config file
 *
 * @param {object[]} hosts
 * @param {function(?error)} callback
 */
SshConfig.prototype.writeConfig = function(hosts, callback) {
  var self = this;
  this.backUpConfig(function(err) {
    if (err) {
      return callback(err);
    } else {
      self._readConfigFile(function(err2) {
        if (err2) {
          return callback(err2);
        } else {
          var yaowstLines = [
            self.CONFIG_BEGIN
          ];
          var iterNewHosts = function(cnt, cb) {
            if (hosts.length > cnt) {
              var hostConfig = hosts[cnt],
                keys = Object.keys(hostConfig), i;

              if (hostConfig.Host) {
                yaowstLines.push('Host "' + hostConfig.Host + '"');
                for (i = 0; i < keys.length; i++) {
                  var key = keys[i];
                  if (key !== 'Host' && key !== 'X_AutoScalingType') {
                    yaowstLines.push('    ' + key + ' ' + hostConfig[key]);
                  }
                }
                yaowstLines.push('');
              }
              setImmediate(function() {
                iterNewHosts(++cnt, cb);
              });
            } else {
              return cb();
            }
          };
          iterNewHosts(0, function(err3) {
            if (err3) {
              return callback(err3);
            } else {
              var completeConfig = '';
              if (self._stringConfig.ante.length) {
                completeConfig += self._stringConfig.ante.join('\n') + '\n';
              }
              completeConfig += yaowstLines.join('\n') + '\n';
              completeConfig += self.CONFIG_END + '\n';
              if (self._stringConfig.post.length) {
                completeConfig += self._stringConfig.post.join('\n');
              }

              fs.writeFile(self._configFile, completeConfig, {encoding: 'utf8'}, function(err4) {
                callback(err4);
              });
            }
          });
        }
      });
    }
  });
};

module.exports = SshConfig;
