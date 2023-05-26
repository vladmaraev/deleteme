"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const xstate_1 = require("xstate");
const index_1 = require("./index");
const inspect_1 = require("@xstate/inspect");
(0, inspect_1.inspect)();
const externalContext = {
    parameters: {
        ttsVoice: "sv-SE",
        ttsLexicon: null,
        asrLanguage: "sv-SE",
        completeTimeout: 0,
        endpoint: "https://reading-buddy-serverless-handler.eu2.ddd.tala.cloud/interact/alma/",
        azureKey: null,
        deviceID: null,
        // azureKey: "2e15e033f605414bbbfe26cb631ab755",
    },
    segment: { pageNumber: 0, dddName: "cover" },
};
const talaSpeechService = (0, xstate_1.interpret)(index_1.machine.withContext(Object.assign(Object.assign({}, index_1.machine.context), externalContext)), { devTools: true });
talaSpeechService.start();
talaSpeechService.send("PREPARE");
