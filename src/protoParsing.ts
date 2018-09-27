import protobuf = require('protocol-buffers');
import schema = require('protocol-buffers-schema')
import fs = require('fs')
import path = require('path')

function merge(a, b) {
  a.messages = a.messages.concat(b.messages)
  a.enums = a.enums.concat(b.enums)
  return a
}

function readProtobuf(filename: string) {

  var sch = schema(fs.readFileSync(filename, 'utf-8'))
  var imports = [].concat(sch.imports || [])

  imports.forEach(function(i) {
    sch = merge(sch, readProtobuf(resolveImportPath(filename, i)))
  })

  return sch
}

export function resolveImportPath(filename: string, importPath: string): string {
    let currentDir = path.dirname(filename)

    while (!fs.existsSync(path.resolve(currentDir, importPath)) && (path.parse(currentDir).root !== currentDir)) {
        currentDir = path.resolve(currentDir, "..")
    }

    return path.resolve(currentDir, importPath); 
}

export function encodeProto(protoDefPath: string, attributes: {}, outerClass: string): Buffer {
    let messages = protobuf(readProtobuf(protoDefPath));
    let buffer = messages[outerClass].encode(attributes);
    return buffer;
}

export function decodeProto(protoDefPath: string, outerClass: string, buffer: Buffer) {
    let protoMessages = protobuf(readProtobuf(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
}
