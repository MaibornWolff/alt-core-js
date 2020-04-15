import { connect, Connection, ConsumeMessage } from 'amqplib';
import { URL } from 'url';
import { runInNewContext } from 'vm';
import { Action, ActionDefinition } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import {
    addAMQPReceivedMessage,
    addMissingAMQPMessage,
    DiagramConfiguration,
    isValidDiagramConfiguration,
} from '../diagramDrawing';
import { getLogger, LoggingContext } from '../logging';
import { Scenario } from './Scenario';
import { isArrayOfStrings } from '../util';
import { injectEvalAndVarsToString } from '../variableInjection';

export interface AMQPListenActionDefinition extends ActionDefinition {
    readonly type: 'AMQP_LISTEN';

    readonly broker: string;
    readonly exchange: string;
    readonly queue: string;
    readonly routingKey: string;
    readonly username?: string;
    readonly password?: string;
    readonly expectedNumberOfMessages: number;
    readonly messageFilter?: string[];
    readonly diagramConfiguration?: DiagramConfiguration;
}

export function isValidAMQPListenActionDefinition(
    actionDef: ActionDefinition,
): actionDef is AMQPListenActionDefinition {
    if (actionDef.type !== 'AMQP_LISTEN') {
        return false;
    }
    const amqpListenActionDef = actionDef as Partial<
        AMQPListenActionDefinition
    >;
    return (
        typeof amqpListenActionDef.broker === 'string' &&
        typeof amqpListenActionDef.exchange === 'string' &&
        typeof amqpListenActionDef.queue === 'string' &&
        typeof amqpListenActionDef.routingKey === 'string' &&
        ['string', 'undefined'].includes(typeof amqpListenActionDef.username) &&
        ['string', 'undefined'].includes(typeof amqpListenActionDef.password) &&
        typeof amqpListenActionDef.expectedNumberOfMessages === 'number' &&
        (typeof amqpListenActionDef.messageFilter === 'undefined' ||
            isArrayOfStrings(amqpListenActionDef.messageFilter)) &&
        (typeof amqpListenActionDef.diagramConfiguration === 'undefined' ||
            isValidDiagramConfiguration(
                amqpListenActionDef.diagramConfiguration,
            ))
    );
}

export class AMQPListenAction implements Action {
    readonly name: string;

    readonly description: string;

    readonly type = ActionType.AMQP_LISTEN;

    readonly invokeEvenOnFail: boolean;

    readonly allowFailure: boolean;

    private readonly broker: string;

    private readonly url: string;

    private readonly username?: string;

    private readonly password?: string;

    private readonly exchange: string;

    private readonly queue: string;

    private readonly routingKey: string;

    private readonly expectedNumberOfMessages: number;

    private readonly messageFilter?: string[];

    private numberOfReceivedMessages = 0;

    private readonly diagramConfiguration: DiagramConfiguration;

    private amqpConnection?: Connection = undefined;

    public constructor(
        name: string,
        url: string,
        {
            description = name,
            invokeEvenOnFail = false,
            allowFailure = false,
            broker,
            username,
            password,
            exchange,
            queue,
            routingKey,
            expectedNumberOfMessages,
            messageFilter,
            diagramConfiguration = {},
        }: AMQPListenActionDefinition,
    ) {
        this.name = name;
        this.url = url;
        this.description = description;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.broker = broker;
        this.username = username;
        this.password = password;
        this.exchange = exchange;
        this.queue = queue;
        this.routingKey = routingKey;
        this.expectedNumberOfMessages = expectedNumberOfMessages;
        this.messageFilter = messageFilter;
        this.diagramConfiguration = diagramConfiguration;
    }

    public static fromTemplate(
        amqpDefinition: Partial<AMQPListenActionDefinition>,
        template: AMQPListenAction,
    ): AMQPListenAction {
        return new AMQPListenAction(template.name, template.url, {
            description: amqpDefinition.description ?? template.description,
            type: 'AMQP_LISTEN',
            invokeEvenOnFail:
                amqpDefinition.invokeEvenOnFail ?? template.invokeEvenOnFail,
            allowFailure: amqpDefinition.allowFailure ?? template.allowFailure,
            broker: template.broker,
            username: amqpDefinition.username ?? template.username,
            password: amqpDefinition.password ?? template.password,
            exchange: amqpDefinition.exchange ?? template.exchange,
            queue: amqpDefinition.queue ?? template.queue,
            routingKey: amqpDefinition.routingKey ?? template.routingKey,
            expectedNumberOfMessages:
                amqpDefinition.expectedNumberOfMessages ??
                template.expectedNumberOfMessages,
            messageFilter:
                amqpDefinition.messageFilter ?? template.messageFilter,
            diagramConfiguration:
                amqpDefinition.diagramConfiguration ??
                template.diagramConfiguration,
        });
    }

    public invoke(scenario: Scenario): ActionCallback {
        return {
            promise: this.invokeAsync(scenario),
            cancel: () => {
                if (this.amqpConnection) {
                    this.amqpConnection.close().catch(() => {
                        // we can safely ignore errors while closing because this always means that the connection is already closed
                    });
                }
            },
        };
    }

    private async invokeAsync(scenario: Scenario): Promise<void> {
        const ctx = { scenario: scenario.name, action: this.name };
        const logger = getLogger(scenario.name);
        const {
            url,
            username,
            password,
            exchange,
            queue,
            routingKey,
        } = this.expandParameters(scenario.cache, ctx);

        try {
            const connection = await connect({
                protocol: extractProtocol(url),
                hostname: extractHostname(url),
                port: extractPort(url),
                vhost: extractVhost(url),
                username,
                password,
            });
            this.amqpConnection = connection;
            logger.debug(
                `Successfully established AMQP connection to ${url}.`,
                ctx,
            );
            const channel = await connection.createChannel();

            await channel.checkExchange(exchange);
            await channel.assertQueue(queue, {
                autoDelete: true,
            });
            await channel.bindQueue(queue, exchange, routingKey);
            await channel.consume(queue, msg =>
                this.onMessage(msg, scenario, exchange, routingKey),
            );
            logger.debug(
                `Successfully bound queue ${queue} to routing key ${routingKey} on exchange ${exchange}.`,
                ctx,
            );

            await new Promise((resolve, reject) => {
                connection.on('error', err =>
                    this.onError(scenario, reject, err),
                );
                connection.on('close', () =>
                    this.onClose(scenario, resolve, reject),
                );
                channel.on('error', err => this.onError(scenario, reject, err));
                channel.on('close', () =>
                    this.onClose(scenario, resolve, reject),
                );
            });
        } catch (e) {
            logger.error('Error establishing AMQP connection', ctx);
            addMissingAMQPMessage(
                scenario.name,
                exchange,
                routingKey,
                this.expectedNumberOfMessages,
                this.numberOfReceivedMessages,
                e,
            );
            await Promise.reject(e);
        }
    }

    private onMessage(
        msg: ConsumeMessage | null,
        scenario: Scenario,
        exchange: string,
        routingKey: string,
    ): void {
        const logger = getLogger(scenario.name);
        const ctx = { scenario: scenario.name, action: this.name };

        const parsedMessage = msg && JSON.parse(msg.content.toString());
        if (this.isMessageRelevant(parsedMessage, scenario)) {
            this.numberOfReceivedMessages++;
            logger.debug(
                `Received relevant AMQP message (${
                    this.numberOfReceivedMessages
                }/${this.expectedNumberOfMessages}): ${JSON.stringify(
                    parsedMessage,
                )}`,
                ctx,
            );
            addAMQPReceivedMessage(
                scenario.name,
                this.broker,
                exchange,
                routingKey,
                parsedMessage,
                this.diagramConfiguration,
            );
        } else {
            logger.debug(
                `Received irrelevant AMQP message: ${JSON.stringify(
                    parsedMessage,
                )}`,
                ctx,
            );
        }
    }

    private onClose(
        scenario: Scenario,
        resolve: (value?: unknown) => void,
        reject: (reason?: Error) => void,
    ): void {
        const logger = getLogger(scenario.name);
        const ctx = { scenario: scenario.name, action: this.name };
        logger.debug(`Successfully closed AMQP connection.`, ctx);

        if (this.numberOfReceivedMessages !== this.expectedNumberOfMessages) {
            this.onError(
                scenario,
                reject,
                new Error(
                    `Received an unexpected number of messages: ${this.numberOfReceivedMessages} (expected: ${this.expectedNumberOfMessages})`,
                ),
            );
        } else {
            resolve();
        }
    }

    private onError(
        scenario: Scenario,
        reject: (reason?: Error) => void,
        err: Error,
    ): void {
        addMissingAMQPMessage(
            scenario.name,
            this.exchange,
            this.routingKey,
            this.expectedNumberOfMessages,
            this.numberOfReceivedMessages,
            err.message,
        );
        reject(err);
    }

    private isMessageRelevant(msg: unknown, scenario: Scenario): boolean {
        const logger = getLogger(scenario.name);
        const ctx = { scenario: scenario.name, action: this.name };
        const registeredMessageFilters = this.messageFilter;

        if (registeredMessageFilters) {
            return registeredMessageFilters.some(filter => {
                const expandedFilter = injectEvalAndVarsToString(
                    filter,
                    scenario.cache,
                    ctx,
                ).toString();
                const filterResult = !!runInNewContext(expandedFilter, {
                    msg,
                });
                logger.debug(
                    `Filter (${expandedFilter}): ${filterResult}`,
                    ctx,
                );
                return filterResult;
            });
        }
        return true;
    }

    private expandParameters(
        scenarioVariables: Map<string, unknown>,
        ctx: LoggingContext,
    ): {
        url: string;
        username?: string;
        password?: string;
        exchange: string;
        queue: string;
        routingKey: string;
    } {
        const url = injectEvalAndVarsToString(
            this.url,
            scenarioVariables,
            ctx,
        ).toString();
        const username =
            this.username !== undefined
                ? injectEvalAndVarsToString(
                      this.username,
                      scenarioVariables,
                      ctx,
                  ).toString()
                : undefined;
        const password =
            this.password !== undefined
                ? injectEvalAndVarsToString(
                      this.password,
                      scenarioVariables,
                      ctx,
                  ).toString()
                : undefined;
        const exchange = injectEvalAndVarsToString(
            this.exchange,
            scenarioVariables,
            ctx,
        ).toString();
        const queue = injectEvalAndVarsToString(
            this.queue,
            scenarioVariables,
            ctx,
        ).toString();
        const routingKey = injectEvalAndVarsToString(
            this.routingKey,
            scenarioVariables,
            ctx,
        ).toString();

        return { url, username, password, exchange, queue, routingKey };
    }
}

type Protocol = 'amqp' | 'amqps';

function extractProtocol(url: string): Protocol {
    const protocolString = new URL(url).protocol;
    const protocol = protocolString.substring(0, protocolString.length - 1);
    if (protocol === 'amqp' || protocol === 'amqps') {
        return protocol;
    }
    throw new Error(`${protocol} is not a valid AMQP protocol`);
}

function extractHostname(url: string): string {
    return new URL(url).hostname;
}

function extractPort(url: string): number | undefined {
    const { port } = new URL(url);
    return port ? +port : undefined;
}

function extractVhost(url: string): string | undefined {
    const path = new URL(url).pathname;
    return path ? path.substr(1) : undefined;
}
