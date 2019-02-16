import { addDelay } from '../diagramDrawing';
import { getLogger } from '../logging';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

class TimerAction implements Action {
    name: string;
    type = ActionType.TIMER;
    duration: number;

    constructor(name: string, timerDefinition: any, duration = timerDefinition.durationInSec) {
        this.name = name;
        this.duration = duration;
    }

    static fromTemplate(timerDefinition: any, template: TimerAction): TimerAction {
        return new TimerAction(template.name, timerDefinition, timerDefinition.durationInSec || template.duration);
    }

    invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };

        let promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                getLogger(ctx.scenario).debug(`Waited for ${this.duration} seconds!`, ctx);
                addDelay(scenario.name, this.duration);
                resolve('Success');
            }, this.duration * 1000);
        });

        return { promise, cancel: () => console.log('TODO') };
    }
}

export { TimerAction };
