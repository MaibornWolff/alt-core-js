<h1 align="center">Acceptance & Load Testing (ALT) Framework
</h1>

<div align="center">

![GitHub](https://img.shields.io/github/license/MaibornWolff/alt-core-js.svg)
[![Npm Version](http://img.shields.io/npm/v/@maibornwolff/alt-core-js.svg)](https://www.npmjs.com/package/@maibornwolff/alt-core-js)
[![Docker Runner](https://img.shields.io/badge/Docker%20Runner-1.43-brightgreen.svg)](https://hub.docker.com/r/maibornwolff/alt-runner-image/tags/)
[![CircleCI](https://circleci.com/gh/MaibornWolff/alt-core-js.svg?style=svg)](https://circleci.com/gh/MaibornWolff/alt-core-js)

</div>

The ALT framework is designed to test logic that spans multiple services/endpoints
which might use different technologies and protocols. 

It does so by executing `scenarios` (1 scenario = 1 complete use case) which are composed of `actions`
(e.g. 1 action could be a call to and response from a service).

The framework supports the definition of different action types in a *yaml* format,
including e.g. which endpoints have to be called with which parameters
as well as defining validation rules to be applied on the responses.
It also supports detailed report creation of the test results.
For more detailed documentation, check out the [wiki](https://github.com/MaibornWolff/alt-core-js/wiki)!

## Features

- simple definition of reusable [REST](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#rest), [MQTT](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#mqtt-subscribe), [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#websocket), etc. action templates
- ...
- using [Variables](https://github.com/MaibornWolff/alt-core-js/wiki/Features#variables) across multiple actions
- [validation](https://github.com/MaibornWolff/alt-core-js/wiki/Features#response-validation) of response payload from a [REST](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#rest) action
- ...
- automatic retries of [REST](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#rest) requests
- automatic reconnections of [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#websocket) sessions
- ...
- filtering on incomming [MQTT](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#mqtt-subscribe) & [WS](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#websocket) messages
- publishing & listening of [protobuf](https://developers.google.com/protocol-buffers/) messages on [MQTT](https://github.com/MaibornWolff/alt-core-js/wiki/Action-Templates#mqtt-publish) broker

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
this is exactly what a `scenario` (see [Scenarios](https://github.com/MaibornWolff/alt-core-js/wiki/Scenarios)) is made for:

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
npm i -s @maibornwolff/alt-core-js
```

And then simply call the `runScenario` main entrypoint providing the paths to our `scenarios`' and `actions` directory:

```javascript
const ALT = require('@maibornwolff/alt-core-js');
ALT.runScenario('src/scenarios/s1-my-first-scenario.yaml', 'src/actions');
```

### Docker

There is special runner image available (see [Docker Hub](https://hub.docker.com/r/maibornwolff/alt-runner-image)) which already
contains the core framwork and also an invokation script for running a particular scanario. You can either use it in raw or as
`runner` image on CI platforms like e.g. GitLab.

#### Example: Docker CLI

```bash
docker run
  -v `pwd`/src:/src                           # mounting scenarios' & actions' root directory
  -e ALT_SRC=/src                             # declaring the mounted path as resource directory
  -v `pwd`/output:/alt-runner-app/out         # output directory where .log files and diagrams will be saved after the execution
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

### Logging
During the executing there are 2 kind of logging: basic information on which Scenario/Action is being executed is logged
to the `console` while detailed log containing Actions' paramters, results and stack traces are logged to `files` which
are stored under `out/`: each scenario logs into its own `.log` file!

### Diagrams
The framework can automatically create sequence diagrams from the given scenario definition which are also saved in `out/`;

## Build locally

```bash
$ npm install
$ tsc
$ npm test
```
...
