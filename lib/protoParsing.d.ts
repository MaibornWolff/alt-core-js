export declare function resolveImportPath(origin: string, target: string): string;
export declare function encodeProto(protoDefPath: string, attributes: {}, outerClass: string): Uint8Array;
export declare function decodeProto(protoDefPath: string, outerClass: string, buffer: Uint8Array): {
    [k: string]: any;
};
