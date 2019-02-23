import { existsSync } from 'fs';
import { dirname, parse, resolve } from 'path';
import { Root } from 'protobufjs';

export function resolveImportPath(origin: string, target: string): string {
    let currentDir = dirname(origin);

    while (
        !existsSync(resolve(currentDir, target)) &&
        parse(currentDir).root !== currentDir
    ) {
        currentDir = resolve(currentDir, '..');
    }

    return resolve(currentDir, target);
}

export function encodeProto(
    protoDefPath: string,
    attributes: {},
    outerClass: string,
): Buffer {
    const root = new Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    const messageType = root.lookupType(outerClass);

    const errMsg = messageType.verify(attributes);
    if (errMsg) {
        throw Error(errMsg);
    }

    const message = messageType.fromObject(attributes);
    return Buffer.from(messageType.encode(message).finish());
}

export function decodeProto(
    protoDefPath: string,
    outerClass: string,
    buffer: Uint8Array,
) {
    const root = new Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    const messageType = root.lookupType(outerClass);
    const message = messageType.decode(buffer);
    const messageObject = messageType.toObject(message);

    const errMsg = messageType.verify(messageObject);
    if (errMsg) {
        throw Error(errMsg);
    }

    return messageObject;
}
