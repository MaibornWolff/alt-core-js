import protobuf = require('protocol-buffers');
import resolveProtobuf = require('resolve-protobuf-schema');

export const encodeProto = (protoDefPath: string, attributes: {}, outerClass: string): Buffer => {
    let messages = protobuf(resolveProtobuf.sync(protoDefPath));
    let buffer = messages[outerClass].encode(attributes);
    return buffer;
}

export const decodeProto = (protoDefPath: string, outerClass: string, buffer: Buffer) => {
    let protoMessages = protobuf(resolveProtobuf.sync(protoDefPath));
    return protoMessages[outerClass].decode(buffer);
}
