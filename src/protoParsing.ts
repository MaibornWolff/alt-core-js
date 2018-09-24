import protobuf = require('protocol-buffers');
import fs = require('fs');
import {TextDecoder} from "util";

export const encodeProto = (protoDefPath: string, attributes: {}) => {
    let messages = protobuf(fs.readFileSync(protoDefPath));
    let buffer = messages.Test.encode(attributes['Test']);
    return new TextDecoder('utf-8').decode(buffer);
}