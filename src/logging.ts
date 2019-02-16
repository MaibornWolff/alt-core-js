import * as pad from 'pad';
import { createLogger, format, transports } from 'winston';
import { OUTPUT_DIR } from '.';

const { colorize, combine, printf, timestamp } = format;

const myFormat = printf((info: any) => {
    return `${info.timestamp} [${pad(info.scenario || 'unknown', 30)}] [${pad(info.action || 'unknown', 30)}] ${pad(`[${info.level.toUpperCase()}]`, 7)} #${info.message.startsWith('#') ? info.message : ' ' + info.message}`;
});

export const getLogger = (scenario: string) => createLogger({
    level: 'debug',
    format: combine(
        colorize(),
        timestamp(),
        myFormat,
    ),
    transports: [
        new transports.Console({ level: 'info' }),
        new transports.File({ filename: `${OUTPUT_DIR()}/${scenario}.log`, level: 'debug'})
    ]
});