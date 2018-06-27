'use strict';

const fs = require('fs');

/**
 * The ssh config handler
 *
 * @param {object|null} options
 * @constructor
 */
class SshConfig {

  constructor(options) {
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
  _readConfigFile(callback) {
    fs.stat(this._configFile, (err) => {
      if (err && err.code !== 'ENOENT') {
        return callback(err);
      } else if (err && err.code === 'ENOENT') {
        return callback(null, this._stringConfig);
      }
      fs.readFile(this._configFile, 'utf8', (readError, data) => {
        if (readError) {
          return callback(readError);
        } else {
          const lines = data.split('\n');
          let partType = this.PART_TYPE_ANTE;

          const iterLines = (cnt, cb) => {
            if (lines.length > cnt) {
              const line = lines[cnt].replace(/\s+$/, '');

              if (line === this.CONFIG_BEGIN) {
                partType = this.PART_TYPE_YAOWST;
              } else if (line === this.CONFIG_END) {
                partType = this.PART_TYPE_POST;
              } else {
                this._stringConfig[partType].push(line);
              }
              iterLines(++cnt, cb);
            } else {
              return cb();
            }
          };

          iterLines(0, (lineError) => {
            callback(lineError, this._stringConfig);
          });
        }
      });
    });
  }

  /**
   * backup the sshConfig file
   *
   * @param {Boolean} [initBackup] if true then use <filename>_backup_<date>
   * @param {function(?error)} callback
   */
  backUpConfig(initBackup, callback) {
    if (typeof initBackup === 'function') {
      callback = initBackup;
      initBackup = false;
    }

    fs.stat(this._configFile, (err, fileStat) => {
      if (err && err.code !== 'ENOENT') {
        return callback(err);
      } else if (err && err.code === 'ENOENT') {
        return callback();
      }
      fs.readFile(this._configFile, {encoding: 'utf8'}, (err2, data) => {
        if (err2) {
          return callback(err2);
        }
        const mode = parseInt(fileStat.mode.toString(8), 10).toString().substr(-3);
        let newFile = this._configFile + '.old';

        if (initBackup) { // use timestamp for init backup
          newFile = this._configFile + '.backup_' + new Date().toISOString().replace('T', '_').replace(/\..+/, '').replace(/:/g, '-');
        }

        fs.writeFile(newFile, data, {encoding: 'utf8', mode: mode}, function(err3) {
          callback(err3);
        });
      });
    });
  }


  /**
   * parse the yaowst config part
   *
   * @param {function(?error)} callback
   */
  parseConfig(callback) {
    this._readConfigFile((err) => {
      if (err) {
        return callback(err);
      }
      let hostConfig = {};
      const iterConfig = (cnt, cb) => {
        if (this._stringConfig.yaowst.length > cnt) {
          let line = this._stringConfig.yaowst[cnt];
          if (line.trim().substr(0, 1) !== '#') { // no configs
            if (!/^\s+/.test(line) && JSON.stringify(hostConfig) !== '{}') {
              this._config.push(hostConfig);
              hostConfig = {};
            }
            const lineData = line.trim().split(/\s+/);
            if (lineData.length > 1) {
              const configName = lineData.shift();
              let configValue = lineData.join(' ');

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
      iterConfig(0, (err2) => {
        callback(err2);
      });
    });
  }

  /**
   * write the ssh config file
   *
   * @param {object[]} hosts
   * @param {function(?error)} callback
   */
  writeConfig(hosts, callback) {
    this.backUpConfig((err) => {
      if (err) {
        return callback(err);
      }
      this._readConfigFile((err2) => {
        if (err2) {
          return callback(err2);
        }
        let yaowstLines = [
          this.CONFIG_BEGIN
        ];
        const iterNewHosts = (cnt, cb) => {
          if (hosts.length > cnt) {
            let hostConfig = hosts[cnt];
            const keys = Object.keys(hostConfig);

            if (hostConfig.Host) {
              yaowstLines.push('Host "' + hostConfig.Host + '"');
              for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key !== 'Host' && key !== 'X_AutoScalingType') {
                  yaowstLines.push('    ' + key + ' ' + hostConfig[key]);
                }
              }
              yaowstLines.push('');
            }
            setImmediate(() => {
              iterNewHosts(++cnt, cb);
            });
          } else {
            return cb();
          }
        };
        iterNewHosts(0, (err3) => {
          if (err3) {
            return callback(err3);
          }
          let completeConfig = '';
          if (this._stringConfig.ante.length) {
            completeConfig += this._stringConfig.ante.join('\n') + '\n';
          }
          completeConfig += yaowstLines.join('\n') + '\n';
          completeConfig += this.CONFIG_END + '\n';
          if (this._stringConfig.post.length) {
            completeConfig += this._stringConfig.post.join('\n');
          }

          fs.writeFile(this._configFile, completeConfig, {encoding: 'utf8'}, function(err4) {
            callback(err4);
          });
        });
      });
    });
  }

}

module.exports = SshConfig;
