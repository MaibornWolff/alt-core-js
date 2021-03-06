import * as protoParsing from './protoParsing';

export const nodeGlobals = {
    Buffer,
    __dirname,
    __filename,
    clearImmediate,
    clearInterval,
    clearTimeout,
    console,
    exports,
    global,
    module,
    process,
    require,
    setImmediate,
    setInterval,
    setTimeout,
    ...protoParsing,
};
