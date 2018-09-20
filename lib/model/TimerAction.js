"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType_1 = require("./ActionType");
var logging_1 = require("../logging");
var diagramDrawing_1 = require("../diagramDrawing");
var TimerAction = /** @class */ (function () {
    function TimerAction(name, timerDefinition, duration) {
        if (duration === void 0) { duration = timerDefinition.durationInSec; }
        this.type = ActionType_1.ActionType.TIMER;
        this.name = name;
        this.duration = duration;
    }
    TimerAction.fromTemplate = function (timerDefinition, template) {
        return new TimerAction(template.name, timerDefinition, timerDefinition.durationInSec || template.duration);
    };
    TimerAction.prototype.invoke = function (scenario) {
        var _this = this;
        var ctx = { scenario: scenario.name, action: this.name };
        var promise = new Promise(function (resolve, reject) {
            setTimeout(function () {
                logging_1.getLogger(ctx.scenario).debug("Waited for " + _this.duration + " seconds!", ctx);
                diagramDrawing_1.addDelay(scenario.name, _this.duration);
                resolve('Success');
            }, _this.duration * 1000);
        });
        return { promise: promise, cancel: function () { return console.log("TODO"); } };
    };
    return TimerAction;
}());
exports.TimerAction = TimerAction;
