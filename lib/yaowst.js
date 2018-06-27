'use strict';

const Config = require('./config');
const SshConfig = require('./sshconfig');
const opsWorks = require('./opsworks');

class Yaowst {

  constructor(options, callback) {
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

    /**
     * the ssh config object
     *
     * @type {SshConfig}
     * @private
     */
    this._sshConfigObject = null;

    // init config and load data
    /**
     * the config object
     *
     * @type {Config}
     * @private
     */
    this._configObject = new Config(options.configFile);
    this._configObject.getEnhancedConfig((err, config) => {
      if (err) {
        return callback(err);
      }
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
      this._config = config;
      callback();
    });
  }

  /**
   * get the hosts from ops works
   *
   * @param {function(?error, ?Array)} callback
   * @private
   */
  _loadHosts(callback) {
    opsWorks.fetchStackData(this._config.stacks, callback);
  }

  /**
   * get the ssh config object
   *
   * @return {SshConfig}
   * @private
   */
  _getSshConfigObject() {
    if (!this._sshConfigObject) {
      this._sshConfigObject = new SshConfig(this._options.sshConfigFile);
    }
    return this._sshConfigObject;
  }

  /**
   * save action
   * store the hosts into the ssh config file
   *
   * @param {object} option
   * @param {function(?error, ?number)} callback
   */
  save(option, callback) {
    let saveMode = this._config.sshConfigFile.saveMode;
    const sshConfigObject = this._getSshConfigObject();
    const allowedSaveModes = [sshConfigObject.SAVE_MODE_24_7, sshConfigObject.SAVE_MODE_ALL];

    if (option.saveMode && allowedSaveModes.indexOf(option.saveMode) === -1) {
      option.saveMode = null;
    }

    if (option.saveMode) {
      saveMode = option.saveMode;
    }

    this._loadHosts(function(err, hosts) {
      if (err) {
        return callback(err);
      }
      if (saveMode === sshConfigObject.SAVE_MODE_ALL) {
        sshConfigObject.writeConfig(hosts, (err2) => {
          callback(err2, hosts.length);
        });
      } else {
        let hostsToSave = [];
        const iterHosts = (cnt, cb) => {
          if (hosts.length > cnt) {
            const entry = hosts[cnt];

            if (entry.X_AutoScalingType === '24/7' || entry.X_AutoScalingType === 'BASE_CONFIG') {
              hostsToSave.push(entry);
            }

            setImmediate(() => {
              iterHosts(++cnt, cb);
            });
          } else {
            return cb();
          }
        };

        iterHosts(0, function(err3) {
          if (err3) {
            return callback(err3);
          }
          sshConfigObject.writeConfig(hostsToSave, (err4) => {
            callback(err4, hosts.length);
          });
        });
      }
    });
  }

  /**
   * first init action
   * create the config file and create a backup from the config file
   *
   * @param {object} option
   * @param {function(?error)} callback
   */
  firstInit(option, callback) {
    this._configObject.writeDefaultFile(option.force, (err) => {
      if (err) {
        return callback(err);
      }
      this._getSshConfigObject().backUpConfig(true, (err2) => {
        callback(err2);
      });
    });
  }
}


module.exports = Yaowst;
