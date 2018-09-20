const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const pad = require('pad');

const myFormat = printf((info: any) => {
    return `${info.timestamp} [${pad(info.scenario || 'unknown', 30)}] [${pad(info.action || 'unknown', 30)}] ${pad(`[${info.level.toUpperCase()}]`, 7)} #${info.message.startsWith('#') ? info.message : " " + info.message}`;
});

export const getLogger = (scenario: string) => createLogger({
    level: 'debug',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({ colorize: true, level: 'info' }),
        new transports.File({ filename: `out/${scenario}.log`, level: 'debug'})
    ]
});