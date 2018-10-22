import protobuf = require('protobufjs');
import fs = require('fs')
import path = require('path')

export function resolveImportPath(origin: string, target: string): string {
    let currentDir = path.dirname(origin);

    while (!fs.existsSync(path.resolve(currentDir, target)) && (path.parse(currentDir).root !== currentDir)) {
        currentDir = path.resolve(currentDir, "..")
    }

    return path.resolve(currentDir, target);
}

export function encodeProto(protoDefPath: string, attributes: {}, outerClass: string): Uint8Array {
    let root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    let messageType = root.lookupType(outerClass);
    let message = messageType.create(attributes);
    messageType.verify(message);
    return messageType.encode(message).finish();
}

export function decodeProto(protoDefPath: string, outerClass: string, buffer: Uint8Array) {
    let root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    let messageType = root.lookupType(outerClass);
    let message = messageType.decode(buffer);
    messageType.verify(message);
    return messageType.toObject(message);
}
