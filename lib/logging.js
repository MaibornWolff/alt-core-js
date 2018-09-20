"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a = require('winston'), createLogger = _a.createLogger, format = _a.format, transports = _a.transports;
var combine = format.combine, timestamp = format.timestamp, label = format.label, printf = format.printf;
var pad = require('pad');
var myFormat = printf(function (info) {
    return info.timestamp + " [" + pad(info.scenario || 'unknown', 30) + "] [" + pad(info.action || 'unknown', 30) + "] " + pad("[" + info.level.toUpperCase() + "]", 7) + " #" + (info.message.startsWith('#') ? info.message : " " + info.message);
});
exports.getLogger = function (scenario) { return createLogger({
    level: 'debug',
    format: combine(timestamp(), myFormat),
    transports: [
        new transports.Console({ colorize: true, level: 'info' }),
        new transports.File({ filename: "out/" + scenario + ".log", level: 'debug' })
    ]
}); };
