import { Action } from './Action';
import { Scenario } from './Scenario';
import { ActionType } from './ActionType';
import { getLogger } from '../logging';
import { ActionCallback } from './ActionCallback';
import { addDelay } from '../diagramDrawing';

class TimerAction implements Action {
    name: string;

    description: string;

    type = ActionType.TIMER;

    duration: number;

    constructor(
        name: string,
        desc = name,
        timerDefinition: any,
        duration = timerDefinition.durationInSec,
    ) {
        this.name = name;
        this.duration = duration;
        this.description = desc;
    }

    static fromTemplate(
        timerDefinition: any,
        template: TimerAction,
    ): TimerAction {
        return new TimerAction(
            template.name,
            timerDefinition.description || timerDefinition.name,
            timerDefinition,
            timerDefinition.durationInSec || template.duration,
        );
    }

    invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };

        const promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                getLogger(ctx.scenario).debug(
                    `Waited for ${this.duration} seconds!`,
                    ctx,
                );
                addDelay(scenario.name, this.duration);
                resolve('Success');
            }, this.duration * 1000);
        });

        return { promise, cancel: () => console.log('TODO') };
    }
}

export { TimerAction };
