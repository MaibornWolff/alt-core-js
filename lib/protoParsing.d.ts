/// <reference types="node" />
export declare function resolveImportPath(filename: string, importPath: string): string;
export declare function encodeProto(protoDefPath: string, attributes: {}, outerClass: string): Buffer;
export declare function decodeProto(protoDefPath: string, outerClass: string, buffer: Buffer): any;
