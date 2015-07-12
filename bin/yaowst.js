#!/usr/bin/env node
"use strict";

var Yaowst = require('../'), util = require('util'), argv = require('yargs').argv,
  Spinner = require('cli-spinner').Spinner,
  configFile = null, sshConfigFile = null, saveMode = null;


//var all

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
  console.log('   -c, --config-file      the location of the yaowst config file');
  console.log('   -o, --ssh-config-file  the location of the openSSH config file');
  console.log('   -s, --save-mode        24/7 or all, 24/7 store no instances started by auto scaling');
  console.log();
  process.exit(0);
}


var yaowst = new Yaowst({
  configFile: configFile,
  sshConfigFile: {file: sshConfigFile}
}, function (err) {
  var spinner = new Spinner('processing.. %s');
  spinner.setSpinnerString('|/-\\');

  if (err && err.message === 'config file dose not exists!') {
    console.log('YaOWsT run the first time');
    console.log('create config file and backup the existing openSSH config file');
    spinner.start();
    yaowst.firstInit({}, function(err) {
      spinner.stop(true);
      if (err) {
        console.log(err);
        process.exit(1);
      } else {
        console.log('YaOWsT init complete');
        process.exit(0);
      }
    });
  } else if (err) {
    console.log(err);
    process.exit(1);
  } else {
    console.log('Get running OpsWorks instances and store the hosts to the openSSH config file');
    spinner.start();
    yaowst.save({saveMode: saveMode}, function(err, cnt) {
      spinner.stop(true);
      if (err) {
        console.log(err);
        process.exit(1);
      } else {
        console.log('The openSSH config file successful updated');
        console.log(cnt + ' Entries updated (instances and base config)');
        process.exit(0);
      }
    });
  }
});



