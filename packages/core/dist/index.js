"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asrMachine = exports.ttsMachine = exports.machine = void 0;
var talaSpeech_1 = require("./talaSpeech");
Object.defineProperty(exports, "machine", { enumerable: true, get: function () { return talaSpeech_1.machine; } });
var tts_1 = require("./tts");
Object.defineProperty(exports, "ttsMachine", { enumerable: true, get: function () { return tts_1.ttsMachine; } });
var asr_1 = require("./asr");
Object.defineProperty(exports, "asrMachine", { enumerable: true, get: function () { return asr_1.asrMachine; } });
