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
      "id": "<OpsWorks Stack ID>",
      "accessKeyId": "<Access Key ID>",
      "secretAccessKey": "<Secret Access Key>",
      "prefix": "aws-",
      "sshOptions": {},
      "layers": [
        {
          "id": "<OpsWorks Layer ID>",
          "alias": "layer-1-",
          "prefix": "aws-layer-1-",
          "sshOptions": {}
        }
      ]
    }
  ]
}
```

### Config description
  - `{object} opsWorks` the default IAM credentials for all stacks
    - `{string} accessKeyId` the access key id
    - `{string} secretAccessKey` the secret access key
  - `{object} sshConfigFile` OpenSSH config file settings
    - `{string|null} file` if `null` then YaOWsT use `~/.ssh/config` as OpenSSH config file else YaOWsT use this path
    - `{string} saveMode` `24/7` or `all`, `24/7` store only instances that run 24/7 (no time- or load-based instances)
  - `{object} sshOptions` see the [OpenSSH client config manual](http://www.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man5/ssh_config.5?query=ssh_config&sec=5)
  - `{object[]} stacks` this array has all stacks
    - `{string} id` the OpsWorks Stack ID, if you use the **layers** option then you can skip this option
    - `{string} [accessKeyId]` overwrite the default access key id
    - `{string} [secretAccessKey]` overwrite the default secret access key
    - `{string} [prefix]` add this prefix to all instances in this stack, only if the layer as no alias
    - `{object} [sshOptions]` overwrite existing options and merge the another options
    - `{object} [layers]` if this option not exists then YaOWsT check all instances in this stack
      - `{string} id` the OpsWorks layer ID
      - `{string} [alias]` if the instance name has numbers then YaOWsT replace eventing before the number, if the instance name has no number then the alias value will added as prefix to the instance name
      - `{string} [prefix]` add this prefix to all instances in this stack, only if the layer as no alias
      - `{object} [sshOptions]` overwrite existing options and merge the another options

### Example Config
```json
{
  "sshOptions": {
    "StrictHostKeyChecking": "no",
    "UserKnownHostsFile": "~/.ssh/opsworks_known_hosts",
    "IdentitiesOnly": "yes",
    "User": "yaowst"
  },
  "opsWorks": {
    "accessKeyId": "MAIN_KEY",
    "secretAccessKey": "MAIN_SECRET"
  },
  "stacks": [
    {
      "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "sshOptions": {
        "IdentityFile": "~/.ssh/opsworks_yaowst.pem"
      }
    },
    {
      "sshOptions": {
        "IdentityFile": "~/.ssh/opsworks_yaowst_1.pem"
      },
      "layers": [
        {
          "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          "alias": "opsworks_one-"
        },
        {
          "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          "alias": "opsworks_two-"
        }
      ]
    },
    {
      "accessKeyId": "ANOTHER_KEY",
      "secretAccessKey": "ANOTHER_SECRET",
      "sshOptions": {
        "IdentityFile": "~/.ssh/opsworks_yaowst_2.pem"
      },
      "layers": [
        {
          "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          "alias": "opsworks_three-"
        }
      ]
    }
  ]
}
```

## API

### Class: Yaowst

#### new Yaowst(options, callback)

**options**

  - `{string} configFile` The location of the YaOWsT config file
  - `{object} sshConfigFile`
    - `{string} file` The location of the OpenSSH config file
    - `{string} saveMode` `24/7` or `all`, `24/7` store only instances that run 24/7

#### yaowst.firstInit(option, callback)

Create the YaOWsT config file and backup the existing OpenSSH config file

**option**

  - `{boolean} force` overwrite the YaOWsT config file

#### yaowst.save(option, callback)

Store the instances in the OpenSSH config file

**option**

  - `{string} saveMode` `24/7` or `all`, `24/7` store no instances that started by auto scaling

## Tests

The tests are with and without AWS API request, per default the tests are without API requests.


### Test with API Requests

For the Tests with API Requests you must create as new OpsWorks Stack and copy some files.

#### The OpsWorks Stack

The Stack structure

  - The Stack need 2 Layers
  - in the first Layer one instance is online
  - in the second Layer two instances are online

#### The Files

Copy Files and add your IAM credentials and Ids, the files are in `resources/test/`

  - `configOpsWorksLayer.json.default` -> `configOpsWorksLayer.json`
  - `configOpsWorksStack.json.default` -> `configOpsWorksStack.json`
  - `configYaowst.json.default` -> `configYaowst.json`


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

### Cross OS and cross node version testing

For the cross os tests you can use [vagrant-yaowst](https://github.com/w4andy/vagrant-yaowst)