# Acceptance & Load Testing (ALT) Framework

![GitHub](https://img.shields.io/github/license/MaibornWolff/alt-core-js.svg)
![GitHub package version](http://img.shields.io/github/package-json/v/MaibornWolff/alt-core-js.svg)
[![Version](http://img.shields.io/npm/v/@maibornwolff/alt-core-js.svg)](https://www.npmjs.com/package/@maibornwolff/alt-core-js)

Simple test framework supporting execution of different `scenarios` based on `action` templates. The framework supports
definition of different action types in an *yaml* format, including e.g. which endpoints have to be called with which parameters
as well as defining validation rules to be applied on the responses. It also supports detailed report creation of the test
results.

## Features

- simple definition of reusable [REST](https://github.com/MaibornWolff/alt-core-js/wiki/REST), [MQTT](https://github.com/MaibornWolff/alt-core-js/wiki/MQTT-Publish), [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Websocket), etc. action templates
- ...
- automatic retries of [REST](https://github.com/MaibornWolff/alt-core-js/wiki/REST) requests
- automatic reconnections of [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Websocket) sessions
- ...
- filtering on incomming [MQTT](todo) & [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Websocket) messages
- publishing & listening of [protobuf](https://developers.google.com/protocol-buffers/) messages on [MQTT](https://github.com/MaibornWolff/alt-core-js/wiki/MQTT-Publish) broker

## Get Started

First of all, you have to define `actions` (see [Actions](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates)) which should be invoked. Let's say we want to test creation of new users in our system. 
For that, we'd need two actions: one for creating new user and one for retrieving the created user and checking if the attributes
were stored correctly:

### *src/actions/create-new-user.yaml*

```http
type: REST
service: https://reqres.in/api
endpoint: /users
method: POST
headers:
  Content-Type: application/json
data:
  name: James
  job: Agent
responseValidation:
  - "res.data.first_name === James"
```

### *src/actions/query-user.yaml*

```http
type: REST
service: https://reqres.in/api
endpoint: /users/2
method: GET
responseValidation:
  - "res.data.first_name === Janet"
```

In order to execute those `actions` we need a 'playbook' that defines which `action` should be executed in which order: 
this is exactly what a `scenario` (see [Scenarios](todo)) is made for:

### *src/scenarios/s1-my-first-scenario.yaml*

```http
description: "testing User-API of the system"
actions:
  - name: create-new-user
  - name: query-user
```

`Scenarios` also allow to reuse existing `actions`:

### *src/scenarios/s2-my-custom-scenario.yaml*

```http
description: "testing if the 'job' property is being saved correctly"
actions:
  - name: create-new-user
    data:
      name: Steve
      job: Teacher
    responseValidation:
      - "res.data.job === Teacher"
```

Now to run our `scenarios`, we have basically two options: either using plain JS or via custom build Docker image:

### Node

First of all we need to download the **ALT**'s dependency:

```bash
npm i -s alt-core-js
```

And then simply call the `runScenario` main entrypoint providing the paths to our `scenarios`' and `actions` directory:

```javascript
const ALT = require('alt-core-js');
ALT.runScenario('src/scenarios/s1-my-first-scenario.yaml', 'src/actions');
```

### Docker

There is special runner image available (see [Docker Hub](https://hub.docker.com/r/maibornwolff/alt-runner-image)) which already
contains the core framwork and also an invokation script for running a particular scanario. You can either use it in raw or as
`runner` image on CI platforms like e.g. GitLab.

#### Example: Docker CLI

```bash
docker run
  -v /src:/src                                # mounting scenarios' & actions' root directory
  -e ALT_SRC=/src                             # declaring the mounted path as resource directory
  -v /output:/alt-runner-app/out              # output directory where .log files and diagrams will be saved after the execution
  maibornwolff/alt-runner-image:latest
  runScenario s1-my-first-scenario.yaml       # run command with scenario-name as input param
```

#### Example: .gitlab-ci.yml

```yaml
run-my-scenario:
  stage: test
  image: maibornwolff/alt-runner-image:latest
  script:
  - export ALT_SRC=$(pwd)/src                 # directory path containing ./scenarios & ./actions directories
  - runScenario s1-my-first-scenario.yaml     # execution script available inside the container: 'runScenario'
  when: manual
  ...
```

## Environment Config

    todo

## Reporting

During the executing there are 2 kind of logging: basic information on which Scenario/Action is being executed is logged
to the `console` while detailed log containing Actions' paramters, results and stack traces are logged to `files` which
are stored under `out/`: each scenario logs into its own `.log` file!

## Build locally

```bash
$ npm install
$ tsc
$ npm test
```