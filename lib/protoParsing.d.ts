/// <reference types="node" />
export declare const encodeProto: (protoDefPath: string, attributes: {}, outerClass: string) => Buffer;
export declare const decodeProto: (protoDefPath: string, outerClass: string, buffer: Buffer) => any;
