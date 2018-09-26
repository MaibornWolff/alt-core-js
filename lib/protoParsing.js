"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protocol-buffers");
var fs = require("fs");
exports.encodeProto = function (protoDefPath, attributes, outerClass) {
    var messages = protobuf(fs.readFileSync(protoDefPath));
    var buffer = messages[outerClass].encode(attributes);
    return buffer;
};
exports.decodeProto = function (protoDefPath, outerClass, buffer) {
    var protoMessages = protobuf(fs.readFileSync(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
};
