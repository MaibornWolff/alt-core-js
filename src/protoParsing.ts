import { existsSync } from 'fs';
import { dirname, parse, resolve } from 'path';
import * as protobuf from 'protobufjs';

export function resolveImportPath(origin: string, target: string): string {
    let currentDir = dirname(origin);

    while (!existsSync(resolve(currentDir, target)) && (parse(currentDir).root !== currentDir)) {
        currentDir = resolve(currentDir, '..')
    }

    return resolve(currentDir, target);
}

export function encodeProto(protoDefPath: string, attributes: {}, outerClass: string): Buffer {
    let root = new protobuf.Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    let messageType = root.lookupType(outerClass);

    let errMsg = messageType.verify(attributes);
    if (errMsg) {
        throw Error(errMsg);
    }

    let message = messageType.fromObject(attributes);
    return Buffer.from(messageType.encode(message).finish());
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
