"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protobufjs");
var fs = require("fs");
var path = require("path");
function resolveImportPath(origin, target) {
    var currentDir = path.dirname(origin);
    while (!fs.existsSync(path.resolve(currentDir, target)) && (path.parse(currentDir).root !== currentDir)) {
        currentDir = path.resolve(currentDir, "..");
    }
    return path.resolve(currentDir, target);
}
exports.resolveImportPath = resolveImportPath;
function encodeProto(protoDefPath, attributes, outerClass) {
    var root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    var messageType = root.lookupType(outerClass);
    var message = messageType.create(attributes);
    messageType.verify(message);
    return messageType.encode(message).finish();
}
exports.encodeProto = encodeProto;
function decodeProto(protoDefPath, outerClass, buffer) {
    var root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    var messageType = root.lookupType(outerClass);
    var message = messageType.decode(buffer);
    messageType.verify(message);
    return messageType.toObject(message);
}
exports.decodeProto = decodeProto;