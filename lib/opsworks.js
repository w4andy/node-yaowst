'use strict';

var aws = require('aws-sdk');
var step = require('step');
var util = require('util');

var opsWorks = {};

// update the region for the aws config
aws.config.update({region: 'us-east-1'});

/**
 * Parse the aws response
 *
 * @param {object} data
 * @param {Array} instances
 * @param {function(?Error, ?Array)} callback
 * @return {function(?Error, ?Array)}
 */
var parseInstanceData = function(data, instances, callback) {
  var instanceData = [], alias = null, prefix = null;

  if (data.alias) {
    alias = data.alias;
  }
  if (data.prefix) {
    prefix = data.prefix;
  }

  if (instances && instances.Instances && instances.Instances.length) {
    var iterInstances = function(cnt, cb) {
      if (instances.Instances.length > cnt) {
        var instance = instances.Instances[cnt],
          host = instance.Hostname,
          sshData = {
            Host: null,
            HostName: null,
            X_AutoScalingType: null
          };

        var addInstance = function() {
          if (instance.Status === 'online' && instance.PublicIp) {
            sshData.HostName = instance.PublicIp;
            instanceData.push(sshData);
          }
          setImmediate(function() {
            iterInstances(++cnt, cb);
          });
        };

        if (alias) {
          if (/\d+$/.test(host)) {
            var hostNumber = host.match(/(\d+)$/);
            host = alias + hostNumber[1];
          } else {
            host = alias + instance.Hostname;
          }
        } else if (prefix) {
          host = prefix + instance.Hostname;
        }
        sshData.Host = host;

        var autoScalingType = '24/7';
        if (instance.AutoScalingType) {
          autoScalingType = instance.AutoScalingType;
        }
        sshData.X_AutoScalingType = autoScalingType;

        // add sshOptions
        if (data.sshOptions && typeof data.sshOptions === 'object') {
          var keys = Object.keys(data.sshOptions);
          var iterSshOptions = function(cnt2) {
            if (keys.length > cnt2) {
              var option = data.sshOptions[cnt2];
              if (option) {
                sshData[keys] = option;
              }
              setImmediate(function() {
                iterSshOptions(++cnt2);
              });
            } else {
              addInstance();
            }
          };
          iterSshOptions(0);
        } else {
          addInstance();
        }
      } else {
        return cb(null, instanceData);
      }
    };
    iterInstances(0, callback);
  } else {
    return callback(null, instanceData);
  }
};

/**
 * enrich the instance data with ssh options
 *
 * @param {object} options
 * @param {Array} instances
 * @param {function(?error, ?Array)} callback
 * @return {function(?error, ?Array)}
 */
var enrichInstanceData = function(options, instances, callback) {
  if (options.sshOptions) {
    if (instances.length > 1 && (options.alias || options.prefix)) {
      // add ssh settings before instances
      var sshOptions = util._extend({Host: null}, options.sshOptions);

      if (options.alias) {
        sshOptions.Host = options.alias + '*';
      } else if (options.prefix) {
        sshOptions.Host = options.prefix + '*';
      } else {
        return callback(new Error('no alias or prefix found'));
      }
      sshOptions.X_AutoScalingType = 'BASE_CONFIG';

      instances.unshift(sshOptions);
      return callback(null, instances);
    } else {
      // one instance or no alias/prefix
      var enrichInstances = [];

      var iterInstances = function(cnt, cb) {
        if (instances.length > cnt) {
          enrichInstances.push(util._extend(instances[cnt], options.sshOptions));
          setImmediate(function() {
            iterInstances(++cnt, cb);
          });
        } else {
          return cb();
        }
      };

      iterInstances(0, function() {
        callback(null, enrichInstances);
      });
    }
  } else {
    return callback(null, instances);
  }
};

/**
 * process the layers in one stack
 *
 * @param {object} stackData
 * @param {object} options
 * @param {aws.OpsWorks} opsworks
 * @param {function(?Error, ?Array)} callback
 */
var processLayer = function(stackData, options, opsworks, callback) {
  if (stackData.sshOptions) {
    var sshOptions = util._extend({}, stackData.sshOptions);
    if (!options.sshOptions) {
      options.sshOptions = sshOptions;
    } else {
      options.sshOptions = util._extend(sshOptions, options.sshOptions);
    }
  }

  opsworks.describeInstances({LayerId: options.id}, function(err, instances) {
    if (err) {
      return callback(err);
    } else {
      parseInstanceData(options, instances, function(err2, instanceData) {
        if (err2) {
          return callback(err2);
        } else {
          enrichInstanceData(options, instanceData, callback);
        }
      });
    }
  });
};

/**
 * process one stack
 *
 * @param {object} data
 * @param {function(?error, ?Array)} callback
 */
var processStack = function(data, callback) {
  var stackData = {
    name: data.name || null,
    id: data.id || null,
    sshOptions: data.sshOptions || {},
    prefix: data.prefix || null
  };

  if (!data.accessKeyId || !data.secretAccessKey) {
    callback(new Error('no aws credentials for ' + data.name));
    return;
  }

  var opsworks = new aws.OpsWorks({
    accessKeyId: data.accessKeyId,
    secretAccessKey: data.secretAccessKey
  });


  if (data.layers && util.isArray(data.layers) && data.layers.length) {
    step(
      function load() {
        var i;
        for (i = 0; i < data.layers.length; i++) {
          var layer = data.layers[i];
          if (layer) {
            processLayer(stackData, layer, opsworks, this.parallel());
          }
        }
      },
      function loaded(err) {
        if (err) {
          return callback(err);
        } else {
          var instances = [], args = arguments;
          var iterLayers = function(cnt, cb) {
            if (args.length > cnt) {
              var layer = args[cnt];

              instances = instances.concat(layer);

              setImmediate(function() {
                iterLayers(++cnt, cb);
              });
            } else {
              return cb();
            }
          };

          iterLayers(1, function(err2) { // start with 1, 0 is Error Object or null
            if (err2) {
              return callback(err2);
            } else {
              return callback(null, instances);
            }
          });
        }
      }
    );
  } else {
    opsworks.describeInstances({StackId: stackData.id}, function(err, instances) {
      if (err) {
        return callback(err);
      } else {
        parseInstanceData(stackData, instances, function(err2, instanceData) {
          if (err2) {
            return callback(err2);
          } else {
            enrichInstanceData(data, instanceData, callback);
          }
        });
      }
    });
  }
};


/**
 * fetch the stacks and generate the ssh config data
 *
 * @param {Array} stacks
 * @param {function(?error, ?Array)} callback
 */
opsWorks.fetchStackData = function(stacks, callback) {
  step(
    function load() {
      var i;
      for (i = 0; i < stacks.length; i++) {
        var stack = stacks[i];
        if (stack) {
          processStack(stack, this.parallel());
        }
      }
    },
    function loaded(err) {
      if (err) {
        return callback(err);
      } else {
        var stacks2 = [], args = arguments;
        var iterStacks = function(cnt, cb) {
          if (args.length > cnt) {
            var stack = args[cnt];
            stacks2 = stacks2.concat(stack);
            iterStacks(++cnt, cb);
          } else {
            return cb();
          }
        };
        iterStacks(1, function(err2) { // start with 1, 0 is Error Object or null
          if (err2) {
            return callback(err2);
          } else {
            return callback(null, stacks2);
          }
        });
      }
    }
  );
};

module.exports = opsWorks;
