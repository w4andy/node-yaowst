"use strict";

var fs = require('fs');

/**
 * The ssh config handler
 * @param {Object|null} options
 * @constructor
 */
function SshConfig(options) {
  if (!options) {
    options = {};
  }
  if (!options.file) {
    options.file = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.ssh/config';
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
 * @param {function(Error, Object)} callback
 * @private
 */
SshConfig.prototype._readConfigFile = function (callback) {
  var self = this;
  fs.exists(this._configFile, function (exists) {
    if (exists) {
      fs.readFile(self._configFile, 'utf8', function (err, data) {
        if (err) {
          callback(err);
        } else {
          var lines = data.split("\n"), partType = self.PART_TYPE_ANTE;

          var iterLines = function (cnt, callback) {
            if (lines.length > cnt) {
              var line = lines[cnt].replace(/\s+$/, '');

              if (line === self.CONFIG_BEGIN) {
                partType = self.PART_TYPE_YAOWST;
              } else if (line === self.CONFIG_END) {
                partType = self.PART_TYPE_POST;
              } else {
                self._stringConfig[partType].push(line);
              }
              iterLines(++cnt, callback);
            } else {
              callback();
            }
          };

          iterLines(0, function (err) {
            callback(err, self._stringConfig);
          });
        }
      });
    } else {
      callback(null, self._stringConfig);
    }
  });
};

/**
 * backup the sshConfig file
 *
 * @param {Boolean} [initBackup] if true then use <filename>_backup_<date>
 * @param {function(Error)} callback
 */
SshConfig.prototype.backUpConfig = function (initBackup, callback) {
  var self = this;

  if (typeof initBackup === 'function') {
    callback = initBackup;
    initBackup = false;
  }

  fs.exists(this._configFile, function (exists) {
    if (exists) {
      fs.stat(self._configFile, function (err, fileStat) {
        if (err) {
          callback(err);
        } else {
          fs.readFile(self._configFile, {encoding: 'utf8'}, function (err, data) {
            if (err) {
              callback(err);
            } else {
              var newFile = self._configFile + '.old',
                mode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);

              if (initBackup) { // use timestamp for init backup
                newFile = self._configFile + '.backup_' + new Date().toISOString().replace(/T/, '_').replace(/\..+/, '');
              }

              fs.writeFile(newFile, data, {encoding: 'utf8', mode: mode}, function (err) {
                callback(err);
              });
            }
          });
        }
      });
    } else {
      callback();
    }
  });
};

/**
 * parse the yaowst config part
 *
 * @param {function(Error)} callback
 */
SshConfig.prototype.parseConfig = function (callback) {
  var self = this;
  this._readConfigFile(function (err) {
    if (err) {
      callback(err);
    } else {
      var hostConfig = {};
      var iterConfig = function (cnt, callback) {
        if (self._stringConfig.yaowst.length > cnt) {
          var line = self._stringConfig.yaowst[cnt];
          if (line.trim().substr(0, 1) !== '#') { // no configs
            if (!/^\s+/.test(line) && JSON.stringify(hostConfig) !== '{}') {
              self._config.push(hostConfig);
              hostConfig = {};
            }
            var lineData = line.trim().split(/\s+/);
            if (lineData.length > 1) {
              var configName = lineData.shift();
              hostConfig[configName] = lineData.join(' ');
            }
          }
          iterConfig(++cnt, callback);
        } else {
          callback();
        }
      };
      iterConfig(0, function (err) {
        callback(err);
      });
    }
  });
};

/**
 * write the ssh config file
 *
 * @param {Object[]} hosts
 * @param {function(Error)} callback
 */
SshConfig.prototype.writeConfig = function (hosts, callback) {
  var self = this;
  this.backUpConfig(function (err) {
    if (err) {
      callback(err);
    } else {
      self._readConfigFile(function (err) {
        if (err) {
          callback(err);
        } else {
          var yaowstLines = [
            self.CONFIG_BEGIN
          ];
          var iterNewHosts = function (cnt, callback) {
            if (hosts.length > cnt) {
              var hostConfig = hosts[cnt],
                keys = Object.keys(hostConfig), i;

              if (hostConfig.Host) {
                yaowstLines.push('Host ' + hostConfig.Host);
                for (i = 0; i < keys.length; i++) {
                  var key = keys[i];
                  if (key !== 'Host' && key !== 'X_AutoScalingType') {
                    yaowstLines.push('    ' + key + ' ' + hostConfig[key]);
                  }
                }
                yaowstLines.push('');
              }
              setImmediate(function() {
                iterNewHosts(++cnt, callback);
              });
            } else {
              callback();
            }
          };
          iterNewHosts(0, function (err) {
            if (err) {
              callback(err);
            } else {
              var completeConfig = '';
              if (self._stringConfig.ante.length) {
                completeConfig += self._stringConfig.ante.join("\n") + "\n";
              }
              completeConfig += yaowstLines.join("\n") + "\n";
              completeConfig += self.CONFIG_END + "\n";
              if (self._stringConfig.post.length) {
                completeConfig += self._stringConfig.post.join("\n") + "\n";
              }

              fs.writeFile(self._configFile, completeConfig, {encoding: 'utf8'}, function (err) {
                callback(err);
              });
            }
          });
        }
      });
    }
  });
};

module.exports = SshConfig;

