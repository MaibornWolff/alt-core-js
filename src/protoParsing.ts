import protobuf = require('protocol-buffers');
import fs = require('fs');
import {TextDecoder, TextEncoder} from "util";

export const encodeProto = (protoDefPath: string, attributes: {}, outerClass: string): Buffer => {
    let messages = protobuf(fs.readFileSync(protoDefPath));
    let buffer = messages[outerClass].encode(attributes);
    return buffer;
}

export const decodeProto = (protoDefPath: string, outerClass: string, buffer: Buffer) => {
    let protoMessages = protobuf(fs.readFileSync(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
}