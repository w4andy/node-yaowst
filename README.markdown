# Yet another OpsWorks ssh Tool (YaOWsT)

**_A faster way to open a ssh connection to an OpsWorks instance_**

[![Build Status](https://travis-ci.org/w4andy/node-yaowst.svg)](https://travis-ci.org/w4andy/node-yaowst)

```js
Stability: 1 - Experimental
```

## Table of Contents

  - [Usage](#usage)
  - [Examples](#examples)
  - [Config](#config)
  - [API](#api)
  - [Tests](#tests)
  - [ChangeLog](./CHANGELOG.markdown)
  - [License](./LICENSE)

## Installation

```
$ npm install yaowst -g
$ yaowst
YaOWsT run the first time
Creating the config file and backup the existing OpenSSH config file
YaOWsT init complete
```

## Usage

```
$ yaowst --help

Yet another OpsWorks ssh Tool

Usage: yaowst [options]

  options
   -c, --config-file      The location of the YaOWsT config file
   -o, --ssh-config-file  The location of the OpenSSH config file
   -s, --save-mode        24/7 or all, 24/7 store no instances that started by auto scaling

```

## Examples
```
$ yaowst
Get running OpsWorks instances and store the hosts to the OpenSSH config file
The OpenSSH config file successful updated
4 Entries updated (instances and base config)

$ ssh opsworks_one_1
$ scp example.txt opsworks_one_1:/tmp/
```

## Config
After the first run, YaOWsT create a config file with basic settings.

The location is `~/.yaowst` and has the permission `0600`.

### Base Config
```json
{
  "sshOptions": {
    "StrictHostKeyChecking": "no",
    "UserKnownHostsFile": "/dev/null",
    "IdentitiesOnly": "yes"
  },
  "stacks": []
}
```

### Config with all possible settings
```json
{
  "opsWorks": {
    "accessKeyId": "<Access Key ID>",
    "secretAccessKey": "<Secret Access Key>"
  },
  "sshConfigFile": {
    "file": null,
    "saveMode": "24/7"
  },
  "sshOptions": {
    "StrictHostKeyChecking": "no",
    "UserKnownHostsFile": "/dev/null",
    "IdentitiesOnly": "yes"
  },
  "stacks": [
    {
      "name": "opsworks_one",
      "id": "<OpsWorks Stack ID>",
      "accessKeyId": "<Access Key ID>",
      "secretAccessKey": "",
      "prefix": "aws-"
    }
  ]
}
```

### Config description

 - `{object} sshOptions` [ssh config manual](http://www.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man5/ssh_config.5?query=ssh_config&sec=5)

## API

### Class: Yaowst

#### new Yaowst(options, callback)

**options**

  - `{string} configFile` The location of the YaOWsT config file
  - `{object} sshConfigFile`
    - `{string} file` The location of the OpenSSH config file
    - `{string} saveMode` `24/7` or `all`, `24/7` store no instances that started by auto scaling

#### yaowst.firstInit(option, callback)
Create the YaOWsT config file and backup the existing OpenSSH config file

**option**

  - `{boolean} force` overwrite the YaOWsT config file

#### yaowst.save(option, callback)
Store the instances in the OpenSSH config file

**option**

  - `{string} saveMode` `24/7` or `all`, `24/7` store no instances that started by auto scaling

## Tests
### Single test
```
npm test
```
### Cross node version testing
Run tests for all relevant versions of io.js/node.js

#### Install nvm and all relevant versions
```
$ git clone https://github.com/creationix/nvm.git ~/.nvm && cd ~/.nvm && git checkout `git describe --abbrev=0 --tags`
$ echo "source ~/.nvm/nvm.sh" >> ~/.bashrc
$ nvm install 0.10
$ nvm install 0.12
$ nvm install iojs
$ nvm install 4.2
$ nvm install 5.0
```

#### Run the test
```
./resources/tools/cross-test.sh
```
### Cross os and cross node version testing
For the cross os tests use [vagrant-yaowst](https://github.com/w4andy/vagrant-yaowst)