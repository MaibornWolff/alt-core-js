import * as pad from 'pad';
import { createLogger, format, transports, Logger } from 'winston';
import { OUTPUT_DIR } from '.';

const { combine, timestamp, printf } = format;

const myFormat = printf(
    info =>
        `${info.timestamp} [${pad(info.scenario || 'unknown', 30)}] [${pad(
            info.action || 'unknown',
            30,
        )}] ${pad(`[${info.level.toUpperCase()}]`, 7)} #${
            info.message.startsWith('#') ? info.message : ` ${info.message}`
        }`,
);

export const getLogger = (scenario: string): Logger =>
    createLogger({
        level: 'debug',
        format: combine(timestamp(), myFormat),
        transports: [
            new transports.Console({ level: 'info' }),
            new transports.File({
                filename: `${OUTPUT_DIR()}/${scenario}.log`,
                level: 'debug',
            }),
        ],
    });
