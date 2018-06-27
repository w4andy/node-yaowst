'use strict';

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const deepExtend = require('deep-extend');

/**
 * The yaowst config handler
 */
class Config {

  /**
   *
   * @param {string|null} configFile
   */
  constructor(configFile) {
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
   * read config file callback
   *
   * @callback Config~readConfigFileCallback
   * @param {Error} [error]
   * @param {string} [fileContent]
   */

  /**
   * read the config file
   *
   * @param {Config~readConfigFileCallback} callback
   * @private
   */
  _readConfigFile(callback) {
    fs.stat(this._configFile, (err, stats) => {
      if (err && err.code !== 'ENOENT') {
        return callback(err);
      } else if (err && err.code === 'ENOENT') {
        return callback(new Error('config file dose not exists!'));
      } else if (!stats.isFile()) {
        return callback(new Error('config path is no file!'));
      }

      const fileMode = parseInt(stats.mode.toString(8), 10).toString().substr(-3);
      if (fileMode === '600' || fileMode === '400') {
        fs.readFile(this._configFile, 'utf8', (err2, data) => {
          if (err2) {
            return callback(new Error('Can\'t write the config file' + err2.toString()));
          } else {
            return callback(null, data.trim());
          }
        });
      } else {
        return callback(new Error('The config file "' + this._configFile + '" must have the permission 0400 or 0600'));
      }
    });
  }

  /**
   * write the default config file callback
   *
   * @callback Config~writeDefaulConfigFileCallback
   * @param {Error} [error]
   */

  /**
   * write the default config file
   *
   * @param {boolean} force
   * @param {Config~writeDefaulConfigFileCallback} callback
   */
  writeDefaultFile(force, callback) {
    let defaultConfig = {
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

    // check if directory exists
    const checkConfigDirExists = (cb) => {
      const configDir = path.dirname(this._configFile);
      fs.stat(configDir, (err) => {
        if (err && err.code !== 'ENOENT') {
          return callback(err);
        } else if (err && err.code === 'ENOENT') {
          shell.mkdir('-p', configDir);
        }
        return cb();
      });
    };

    fs.stat(this._configFile, (err) => {
      if (err && err.code !== 'ENOENT') {
        return callback(err);
      } else if (err && err.code === 'ENOENT' || force) {
        checkConfigDirExists((createErr) => {
          if (createErr) {
            return callback(createErr);
          }
          fs.writeFile(this._configFile, JSON.stringify(defaultConfig, null, 2), {mode: '0600'}, (writeErr) => {
            if (writeErr) {
              return callback(new Error('Can\'t write the config file. Error: ' + writeErr.toString()));
            }
            return callback();
          });
        });
      } else {
        return callback(new Error('The config file already exists!'));
      }
    });
  }

  /**
   * get the config data from the config file
   *
   * @param {function(?error, ?object)} callback
   * @return {function(?error, ?object)}
   */
  getConfig(callback) {
    if (!this._configData) {
      this._readConfigFile((err, configString) => {
        if (err) {
          return callback(err);
        }
        try {
          const configJson = JSON.parse(configString);
          const configData = Object.assign({}, this._defaultConfig);

          // extend the default config
          deepExtend(configData, configJson);

          // store the config data
          this._configData = configData;

          return callback(null, configData);
        } catch (err2) {
          return callback(new Error('can\'t parse the config, ' + err2.toString()));
        }
      });
    } else {
      return callback(null, this._configData);
    }
  }

  /**
   * get the config with inherit sshOptions
   *
   * @param {function(?error, ?object)} callback
   */
  getEnhancedConfig(callback) {
    this.getConfig((err, configData) => {
      if (err) {
        return callback(err);
      }
      let stacks = [];
      const iterStacks = (cnt, cb) => {
        if (configData.stacks.length > cnt) {
          let stack = configData.stacks[cnt];
          const baseSshOptions = Object.assign({}, configData.sshOptions);
          const stackSshOptions = stack.sshOptions || {};

          // add ssh options
          stack.sshOptions = Object.assign(baseSshOptions, stackSshOptions);

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

    });
  }
}

module.exports = Config;
