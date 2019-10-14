import { connect, ConsumeMessage, Connection } from 'amqplib';
import { runInNewContext } from 'vm';
// TODO: import { addAMQPMessage } from '../diagramDrawing';
import { getLogger } from '../logging';
import { injectEvalAndVarsToString } from '../variableInjection';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

export class AMQPListenAction implements Action {
    public name: string;

    public description: string;

    public type = ActionType.AMQP_LISTEN;

    public invokeEvenOnFail = false;

    public allowFailure = false;

    private serviceName: string;

    private url: string;

    private exchange: string;

    private queue: string;

    private routingKey: string;

    private expectedNumberOfMessages: number;

    private messageFilter: string[];

    private numberOfReceivedMessages = 0;

    private amqpConnection: Connection | void = undefined;

    public constructor(
        name: string,
        desc = name,
        amqpDefinition: any,
        allowFailure = amqpDefinition.allowFailure,
        invokeEvenOnFail = amqpDefinition.invokeEvenOnFail,
        serviceName: string,
        url = amqpDefinition.url,
        exchange = amqpDefinition.exchange,
        queue = amqpDefinition.queue,
        routingKey = amqpDefinition.routingKey,
        expectedNumberOfMessages = amqpDefinition.expectedNumberOfMessages,
        messageFilter = amqpDefinition.messageFilter,
    ) {
        this.name = name;
        this.description = desc;
        this.allowFailure = allowFailure;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.serviceName = serviceName;
        this.url = url;
        this.exchange = exchange;
        this.queue = queue;
        this.routingKey = routingKey;
        this.expectedNumberOfMessages = expectedNumberOfMessages;
        this.messageFilter = messageFilter;
    }

    public static fromTemplate(
        amqpDefinition: any,
        template: AMQPListenAction,
    ): AMQPListenAction {
        return new AMQPListenAction(
            template.name,
            amqpDefinition.description || amqpDefinition.name,
            amqpDefinition,
            amqpDefinition.allowFailure || template.allowFailure,
            amqpDefinition.invokeEvenOnFail || template.invokeEvenOnFail,
            template.serviceName,
            template.url,
            amqpDefinition.exchange || template.exchange,
            amqpDefinition.queue || template.queue,
            amqpDefinition.routingKey || template.routingKey,
            amqpDefinition.expectedNumberOfMessages ||
                template.expectedNumberOfMessages,
        );
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
        const resolvedUrl = injectEvalAndVarsToString(
            this.url,
            scenario.cache,
            ctx,
        ).toString();
        try {
            const connection = await connect(resolvedUrl);
            this.amqpConnection = connection;
            logger.debug(
                `Successfully established AMQP connection to ${resolvedUrl}.`,
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
            return registeredMessageFilters.some((filter): boolean => {
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
