"use strict";

var fs = require('fs');

/**
 * The ssh config handler
 * @param {String|null} configFile
 * @constructor
 */
function SshConfig(configFile) {
  if (!configFile) {
    configFile = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] + '/.ssh/config';
  }
  Object.defineProperty(this, '_configFile', {value: configFile});
}

SshConfig.prototype._readConfigFile = function(callback) {
  var self = this;
  fs.exists(this._configFile, function(exists) {
    if(exists) {
      fs.readFile(self._configFile, function(err, data) {
        if (err) {
          callback(err);
        } else {
          callback(null, data);
        }
      });
    } else {
      callback(new Error('ssh config file dose not exists!'));
    }
  });
};


module.exports = SshConfig;

