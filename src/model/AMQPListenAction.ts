import { connect, ConsumeMessage, Connection } from 'amqplib';
import { runInNewContext } from 'vm';
import { URL } from 'url';
// TODO: import { addAMQPMessage } from '../diagramDrawing';
import { getLogger } from '../logging';
import { injectEvalAndVarsToString } from '../variableInjection';
import { Action, ActionDefinition } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

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
}

export function isAMQPListenActionDefinition(
    actionDef: ActionDefinition,
): actionDef is AMQPListenActionDefinition {
    if (actionDef.type !== 'AMQP_LISTEN') {
        return false;
    }
    const amqpListenActionDef = actionDef as AMQPListenActionDefinition;
    return (
        typeof amqpListenActionDef.broker === 'string' &&
        typeof amqpListenActionDef.exchange === 'string' &&
        typeof amqpListenActionDef.queue === 'string' &&
        typeof amqpListenActionDef.routingKey === 'string' &&
        ['string', 'undefined'].includes(typeof amqpListenActionDef.username) &&
        ['string', 'undefined'].includes(typeof amqpListenActionDef.password) &&
        typeof amqpListenActionDef.expectedNumberOfMessages === 'number' &&
        ['string', 'undefined'].includes(
            typeof amqpListenActionDef.messageFilter,
        )
    );
}

type Protocol = 'amqp' | 'amqps';

function extractProtocol(url: string): Protocol {
    const { protocol } = new URL(url);
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
    }

    public static fromTemplate(
        amqpDefinition: Partial<AMQPListenActionDefinition>,
        template: AMQPListenAction,
    ): AMQPListenAction {
        return new AMQPListenAction(template.name, template.url, {
            description: amqpDefinition.description || template.description,
            type: 'AMQP_LISTEN',
            invokeEvenOnFail:
                amqpDefinition.invokeEvenOnFail != null
                    ? amqpDefinition.invokeEvenOnFail
                    : template.invokeEvenOnFail,
            allowFailure:
                amqpDefinition.allowFailure != null
                    ? amqpDefinition.allowFailure
                    : template.allowFailure,
            broker: template.broker,
            username: amqpDefinition.username || template.username,
            password: amqpDefinition.password || template.password,
            exchange: amqpDefinition.exchange || template.exchange,
            queue: amqpDefinition.queue || template.queue,
            routingKey: amqpDefinition.routingKey || template.routingKey,
            expectedNumberOfMessages:
                amqpDefinition.expectedNumberOfMessages ||
                template.expectedNumberOfMessages,
            messageFilter:
                amqpDefinition.messageFilter || template.messageFilter,
        });
    }

    public invoke(scenario: Scenario): ActionCallback {
        return {
            promise: this.invokeAsync(scenario),
            cancel: () => {
                if (this.amqpConnection) {
                    this.amqpConnection.close();
                }
            },
        };
    }

    private async invokeAsync(scenario: Scenario): Promise<void> {
        const ctx = { scenario: scenario.name, action: this.name };
        const logger = getLogger(scenario.name);
        const resolvedURL = injectEvalAndVarsToString(
            this.url,
            scenario.cache,
            ctx,
        ).toString();
        try {
            const connection = await connect({
                protocol: extractProtocol(resolvedURL),
                hostname: extractHostname(resolvedURL),
                port: extractPort(resolvedURL),
                vhost: extractVhost(resolvedURL),
                username: this.username,
                password: this.password,
            });
            this.amqpConnection = connection;
            logger.debug(
                `Successfully established AMQP connection to ${resolvedURL}.`,
                ctx,
            );
            const channel = await connection.createChannel();

            await channel.checkExchange(this.exchange);
            await channel.assertQueue(this.queue, {
                autoDelete: true,
            });
            await channel.bindQueue(this.queue, this.exchange, this.routingKey);
            await channel.consume(this.queue, msg =>
                this.onMessage(msg, scenario),
            );
            logger.debug(
                `Successfully bound queue ${this.queue} to routing key ${this.routingKey} on exchange ${this.exchange}.`,
                ctx,
            );

            await new Promise((resolve, reject) => {
                connection.on('error', err => reject(err));
                connection.on('close', () =>
                    this.onClose(scenario, resolve, reject),
                );
                channel.on('error', err => reject(err));
                channel.on('close', () =>
                    this.onClose(scenario, resolve, reject),
                );
            });
        } catch (err) {
            logger.error(`${err}`);
        }
    }

    private onMessage(msg: ConsumeMessage | null, scenario: Scenario): void {
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
            // TODO: addAMQPMessage(scenario.name, this.serviceName, parsedMessage);
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
            reject(
                new Error(
                    `Received an unexpected number of messages: ${this.numberOfReceivedMessages} (expected: ${this.expectedNumberOfMessages})`,
                ),
            );
        } else {
            resolve();
        }
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
}
