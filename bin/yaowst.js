#!/usr/bin/env node
/* eslint no-console: 0, no-process-exit: 0 */
'use strict';

var Yaowst = require('../');
var argv = require('yargs').argv;
var Spinner = require('cli-spinner').Spinner;

var configFile = null, sshConfigFile = null, saveMode = null;

// config file
if (argv.c) {
  configFile = argv.c;
}
if (argv['config-file']) {
  configFile = argv['config-file'];
}

// ssh config file
if (argv.o) {
  sshConfigFile = argv.o;
}
if (argv['ssh-config-file']) {
  sshConfigFile = argv['ssh-config-file'];
}

// save mode
if (argv.s) {
  saveMode = argv.s;
}
if (argv['save-mode']) {
  saveMode = argv['save-mode'];
}


if (argv.help || argv.h) {
  console.log();
  console.log('Yet another OpsWorks ssh Tool');
  console.log();
  console.log('Usage: yaowst [options]');
  console.log();
  console.log('  options');
  console.log('   -c, --config-file      The location of the YaOWsT config file');
  console.log('   -o, --ssh-config-file  The location of the OpenSSH config file');
  console.log('   -s, --save-mode        24/7 or all, 24/7 store no instances that started by auto scaling');
  console.log();
  console.log('  ~/.yaowst options');
  console.log('   The Documentation for all options are on github (https://github.com/w4andy/node-yaowst#config)');
  console.log();
  process.exit(0);
}


var yaowst = new Yaowst({
  configFile: configFile,
  sshConfigFile: {file: sshConfigFile}
}, function(err) {
  var spinner = new Spinner('processing.. %s');
  spinner.setSpinnerString('|/-\\');

  if (err && err.message === 'config file dose not exists!') {
    console.log('YaOWsT run the first time');
    console.log('Creating the config file and backup the existing OpenSSH config file');
    spinner.start();
    yaowst.firstInit({}, function(err2) {
      spinner.stop(true);
      if (err2) {
        console.log(err2);
        process.exit(1);
      } else {
        console.log('YaOWsT init complete, now you can edit the config file "~/.yaowst"');
        process.exit(0);
      }
    });
  } else if (err) {
    console.log(err);
    process.exit(1);
  } else {
    console.log('Get running OpsWorks instances and store the hosts to the OpenSSH config file');
    spinner.start();
    yaowst.save({saveMode: saveMode}, function(err3, cnt) {
      spinner.stop(true);
      if (err3) {
        console.log(err3);
        process.exit(1);
      } else {
        console.log('The OpenSSH config file successful updated');
        console.log(cnt + ' Entries updated (instances and base config)');
        process.exit(0);
      }
    });
  }
});

