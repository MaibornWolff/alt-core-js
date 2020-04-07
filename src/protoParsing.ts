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

export function encodeProtoWithEncoding(
    protoDefPath: string,
    attributes: {},
    outerClass: string,
    encoding: string,
): string {
    const root = new Root();
    root.resolvePath = resolveImportPath;
    root.loadSync(protoDefPath);
    const messageType = root.lookupType(outerClass);

    const errMsg = messageType.verify(attributes);
    if (errMsg) {
        throw Error(errMsg);
    }

    const message = messageType.fromObject(attributes);
    const messageBuffer = Buffer.from(messageType.encode(message).finish());
    return messageBuffer.toString(encoding);
}

export function decodeProto(
    protoDefPath: string,
    outerClass: string,
    buffer: Uint8Array,
): { [k: string]: unknown } {
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
