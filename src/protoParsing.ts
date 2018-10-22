import protobuf = require('protobufjs');
import fs = require('fs');
import path = require('path');
import hexdump = require("hexdump-nodejs");

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

    let errMsg = messageType.verify(attributes);
    if (errMsg) {
        throw Error(errMsg);
    }

    let message = messageType.fromObject(attributes);
    let encoded = messageType.encode(message).finish();

    console.debug("\n-- Encoded proto data --");
    console.debug("Base64: " + Buffer.from(encoded).toString('base64'));
    console.debug("Hex:")
    console.debug(hexdump(encoded));

    return encoded;
}

export function decodeProto(protoDefPath: string, outerClass: string, buffer: Uint8Array) {
    let root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    let messageType = root.lookupType(outerClass);
    let message = messageType.decode(buffer);
    let messageObject = messageType.toObject(message);

    let errMsg = messageType.verify(messageObject);
    if (errMsg) {
        throw Error(errMsg);
    }

    return messageObject;
}
