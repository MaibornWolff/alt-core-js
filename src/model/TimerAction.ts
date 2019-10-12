import { Action } from './Action';
import { Scenario } from './Scenario';
import { ActionType } from './ActionType';
import { getLogger } from '../logging';
import { ActionCallback } from './ActionCallback';
import { addDelay } from '../diagramDrawing';

class TimerAction implements Action {
    public name: string;

    public description: string;

    public type = ActionType.TIMER;

    private duration: number;

    public invokeEvenOnFail = false;

    public allowFailure = false;

    public constructor(
        name: string,
        desc = name,
        timerDefinition: any,
        duration = timerDefinition.durationInSec,
        invokeEvenOnFail = timerDefinition.invokeEvenOnFail,
        allowFailure = timerDefinition.allowFailure,
    ) {
        this.name = name;
        this.duration = duration;
        this.description = desc;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
    }

    public static fromTemplate(
        timerDefinition: any,
        template: TimerAction,
    ): TimerAction {
        return new TimerAction(
            template.name,
            timerDefinition.description || timerDefinition.name,
            timerDefinition,
            timerDefinition.durationInSec || template.duration,
            timerDefinition.invokeEvenOnFail || template.invokeEvenOnFail,
        );
    }

    public invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };

        const promise = new Promise(resolve => {
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
