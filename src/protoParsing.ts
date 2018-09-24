import protobuf = require('protocol-buffers');
import fs = require('fs');
import {TextDecoder} from "util";

export const encodeProto = (protoDefPath: string, attributes: {}, outerClass: string) => {
    let messages = protobuf(fs.readFileSync(protoDefPath));
    let buffer = messages[outerClass].encode(attributes);
    return new TextDecoder('utf-8').decode(buffer);
}