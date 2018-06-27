'use strict';

const aws = require('aws-sdk');
const step = require('step');

const opsWorks = {};

/**
 * Parse the aws response
 *
 * @param {object} data
 * @param {Array} instances
 * @param {function(?Error, ?Array)} callback
 * @return {function(?Error, ?Array)}
 */
const parseInstanceData = function(data, instances, callback) {
  let instanceData = [], alias = null, prefix = null;

  if (data.alias) {
    alias = data.alias;
  }
  if (data.prefix) {
    prefix = data.prefix;
  }

  if (instances && instances.Instances && instances.Instances.length) {
    const iterInstances = (cnt, cb) => {
      if (instances.Instances.length > cnt) {
        const instance = instances.Instances[cnt];
        let host = instance.Hostname;
        let sshData = {
          Host: null,
          HostName: null,
          X_AutoScalingType: null
        };

        const addInstance = () => {
          if (instance.Status === 'online' && instance.PublicIp) {
            sshData.HostName = instance.PublicIp;
            instanceData.push(sshData);
          }
          setImmediate(() => {
            iterInstances(++cnt, cb);
          });
        };

        if (alias) {
          if (/\d+$/.test(host)) {
            const hostNumber = host.match(/(\d+)$/);
            host = alias + hostNumber[1];
          } else {
            host = alias + instance.Hostname;
          }
        } else if (prefix) {
          host = prefix + instance.Hostname;
        }
        sshData.Host = host;

        let autoScalingType = '24/7';
        if (instance.AutoScalingType) {
          autoScalingType = instance.AutoScalingType;
        }
        sshData.X_AutoScalingType = autoScalingType;

        // add sshOptions
        if (data.sshOptions && typeof data.sshOptions === 'object') {
          const keys = Object.keys(data.sshOptions);
          const iterSshOptions = (cnt2) => {
            if (keys.length > cnt2) {
              const option = data.sshOptions[cnt2];
              if (option) {
                sshData[keys] = option;
              }
              setImmediate(() => {
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
const enrichInstanceData = function(options, instances, callback) {
  if (options.sshOptions) {
    if (instances.length > 1 && (options.alias || options.prefix)) {
      // add ssh settings before instances
      let sshOptions = Object.assign({Host: null}, options.sshOptions);

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
      let enrichInstances = [];

      const iterInstances = (cnt, cb) => {
        if (instances.length > cnt) {
          enrichInstances.push(Object.assign(instances[cnt], options.sshOptions));
          setImmediate(() => {
            iterInstances(++cnt, cb);
          });
        } else {
          return cb();
        }
      };

      iterInstances(0, () => {
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
const processLayer = function(stackData, options, opsworks, callback) {
  if (stackData.sshOptions) {
    let sshOptions = Object.assign({}, stackData.sshOptions);
    if (!options.sshOptions) {
      options.sshOptions = sshOptions;
    } else {
      options.sshOptions = Object.assign(sshOptions, options.sshOptions);
    }
  }

  opsworks.describeInstances({LayerId: options.id}, (err, instances) => {
    if (err) {
      return callback(err);
    }
    parseInstanceData(options, instances, (err2, instanceData) => {
      if (err2) {
        return callback(err2);
      } else {
        enrichInstanceData(options, instanceData, callback);
      }
    });
  });
};

/**
 * process one stack
 *
 * @param {object} data
 * @param {function(?error, ?Array)} callback
 */
const processStack = function(data, callback) {
  let stackData = {
    name: data.name || null,
    id: data.id || null,
    sshOptions: data.sshOptions || {},
    prefix: data.prefix || null
  };

  if (!data.accessKeyId || !data.secretAccessKey) {
    callback(new Error('no aws credentials for ' + data.name));
    return;
  }

  let opsworks = new aws.OpsWorks({
    accessKeyId: data.accessKeyId,
    secretAccessKey: data.secretAccessKey,
    region: data.region
  });


  if (data.layers && Array.isArray(data.layers) && data.layers.length) {
    step(
      function load() {
        for (let i = 0; i < data.layers.length; i++) {
          const layer = data.layers[i];
          if (layer) {
            processLayer(stackData, layer, opsworks, this.parallel());
          }
        }
      },
      function loaded(err) {
        if (err) {
          return callback(err);
        } else {
          let instances = [], args = arguments;
          const iterLayers = function(cnt, cb) {
            if (args.length > cnt) {
              let layer = args[cnt];

              instances = instances.concat(layer);

              setImmediate(() => {
                iterLayers(++cnt, cb);
              });
            } else {
              return cb();
            }
          };

          iterLayers(1, (err2) => { // start with 1, 0 is Error Object or null
            if (err2) {
              return callback(err2);
            }
            return callback(null, instances);
          });
        }
      }
    );
  } else {
    opsworks.describeInstances({StackId: stackData.id}, (err, instances) => {
      if (err) {
        return callback(err);
      }
      parseInstanceData(stackData, instances, (err2, instanceData) => {
        if (err2) {
          return callback(err2);
        }
        enrichInstanceData(data, instanceData, callback);
      });
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
      for (let i = 0; i < stacks.length; i++) {
        const stack = stacks[i];
        if (stack) {
          processStack(stack, this.parallel());
        }
      }
    },
    function loaded(err) {
      if (err) {
        return callback(err);
      } else {
        let stacks2 = [], args = arguments;
        const iterStacks = function(cnt, cb) {
          if (args.length > cnt) {
            const stack = args[cnt];
            stacks2 = stacks2.concat(stack);
            iterStacks(++cnt, cb);
          } else {
            return cb();
          }
        };
        iterStacks(1, function(err2) { // start with 1, 0 is Error Object or null
          if (err2) {
            return callback(err2);
          }
          return callback(null, stacks2);
        });
      }
    }
  );
};

module.exports = opsWorks;
