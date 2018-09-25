"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protocol-buffers");
var fs = require("fs");
var util_1 = require("util");
exports.encodeProto = function (protoDefPath, attributes, outerClass) {
    var messages = protobuf(fs.readFileSync(protoDefPath));
    var buffer = messages[outerClass].encode(attributes);
    return new util_1.TextDecoder('utf-8').decode(buffer);
};
