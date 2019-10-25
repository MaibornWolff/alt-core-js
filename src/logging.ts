import * as pad from 'pad';
import { Logger, createLogger, format, transports } from 'winston';
import { OUTPUT_DIR } from '.';

const { combine, timestamp, printf } = format;

const trim = (text: string, length: number): string =>
    text.length > length ? `${text.substring(0, length - 1)}…` : text;

const trimAndPadLeft = (text: string, length: number): string =>
    pad(trim(text, length), length);

const trimAndPadRight = (text: string, length: number): string =>
    pad(length, trim(text, length));

const myFormat = printf(
    (info): string =>
        `${info.timestamp} | ${trimAndPadLeft(
            info.scenario || 'no scenario',
            15,
        )} | ${trimAndPadLeft(
            info.action || 'no action',
            15,
        )} | ${trimAndPadRight(`${info.level.toUpperCase()}`, 5)} | ${
            info.message
        }`,
);

export const getLogger = (scenario = 'unknown'): Logger =>
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

export interface LoggingContext {
    scenario?: string;
    action?: string;
}
