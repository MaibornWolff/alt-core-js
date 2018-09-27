"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protobuf = require("protocol-buffers");
var schema = require("protocol-buffers-schema");
var fs = require("fs");
var path = require("path");
function merge(a, b) {
    a.messages = a.messages.concat(b.messages);
    a.enums = a.enums.concat(b.enums);
    return a;
}
function readProtobuf(filename) {
    var sch = schema(fs.readFileSync(filename, 'utf-8'));
    var imports = [].concat(sch.imports || []);
    imports.forEach(function (i) {
        sch = merge(sch, readProtobuf(resolveImportPath(filename, i)));
    });
    return sch;
}
function resolveImportPath(filename, importPath) {
    var currentDir = path.dirname(filename);
    while (!fs.existsSync(path.resolve(currentDir, importPath)) && (path.parse(currentDir).root !== currentDir)) {
        currentDir = path.resolve(currentDir, "..");
    }
    return path.resolve(currentDir, importPath);
}
exports.resolveImportPath = resolveImportPath;
function encodeProto(protoDefPath, attributes, outerClass) {
    var messages = protobuf(readProtobuf(protoDefPath));
    var buffer = messages[outerClass].encode(attributes);
    return buffer;
}
exports.encodeProto = encodeProto;
function decodeProto(protoDefPath, outerClass, buffer) {
    var protoMessages = protobuf(readProtobuf(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
}
exports.decodeProto = decodeProto;
