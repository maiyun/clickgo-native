"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const clickgo = require("clickgo");
setTimeout(function () {
    (function () {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield clickgo.init();
            clickgo.core.globalEvents.errorHandler = function (taskId, formId, error, info) {
                console.log(info, error);
            };
            const taskId = yield clickgo.task.run('app/', {
                'notify': false,
                'progress': (loaded, total) => {
                    document.getElementById('progress').style.width = ((loaded + 1) / (total + 1) * 100).toString() + '%';
                },
                'main': true,
                'sync': true
            });
            console.log('taskId', taskId);
            (_a = document.getElementById('main')) === null || _a === void 0 ? void 0 : _a.remove();
        });
    })().catch((e) => {
        console.log(e);
    });
}, 100);
