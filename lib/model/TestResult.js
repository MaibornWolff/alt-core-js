"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TestResult = /** @class */ (function () {
    function TestResult(action, duration, successful) {
        this.action = action;
        this.duration = duration;
        this.successful = successful;
    }
    return TestResult;
}());
exports.TestResult = TestResult;
