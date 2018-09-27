"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protocol-buffers");
var resolveProtobuf = require("resolve-protobuf-schema");
exports.encodeProto = function (protoDefPath, attributes, outerClass) {
    var messages = protobuf(resolveProtobuf.sync(protoDefPath));
    var buffer = messages[outerClass].encode(attributes);
    return buffer;
};
exports.decodeProto = function (protoDefPath, outerClass, buffer) {
    var protoMessages = protobuf(resolveProtobuf.sync(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
};
