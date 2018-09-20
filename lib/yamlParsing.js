"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("./logging");
var YAML = require('js-yaml');
var FS = require('fs');
var FILE_SUFFIX = '.yaml';
exports.loadYamlConfiguration = function (pathToFile) {
    if (pathToFile && pathToFile.endsWith(FILE_SUFFIX)) {
        var yamlConfig = YAML.safeLoad(FS.readFileSync(pathToFile, 'utf8'));
        logging_1.getLogger("unknown").debug("Successfully loaded YAML config: " + pathToFile);
        return yamlConfig;
    }
    else {
        logging_1.getLogger("unknown").warn("Skipping unsupported file: " + pathToFile);
    }
};
exports.nameFromYamlConfig = function (fileName) {
    return fileName.substr(0, fileName.indexOf(FILE_SUFFIX));
};
