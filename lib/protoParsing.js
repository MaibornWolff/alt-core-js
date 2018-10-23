"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protobufjs");
var fs = require("fs");
var path = require("path");
var hexdump = require("hexdump-nodejs");
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
    var errMsg = messageType.verify(attributes);
    if (errMsg) {
        throw Error(errMsg);
    }
    var message = messageType.fromObject(attributes);
    var encoded = messageType.encode(message).finish();
    console.debug("\n-- Encoded proto data --");
    console.debug("Base64: " + Buffer.from(encoded).toString('base64'));
    console.debug("Hex:");
    console.debug(hexdump(encoded));
    return encoded;
}
exports.encodeProto = encodeProto;
function decodeProto(protoDefPath, outerClass, buffer) {
    var root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    var messageType = root.lookupType(outerClass);
    var message = messageType.decode(buffer);
    var messageObject = messageType.toObject(message);
    var errMsg = messageType.verify(messageObject);
    if (errMsg) {
        throw Error(errMsg);
    }
    return messageObject;
}
exports.decodeProto = decodeProto;
