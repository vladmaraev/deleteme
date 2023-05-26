"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asrMachine = void 0;
const xstate_1 = require("xstate");
const getAuthorizationToken_1 = require("./getAuthorizationToken");
const { assign } = xstate_1.actions;
const SpeechToText_1 = require("web-speech-cognitive-services/lib/SpeechServices/SpeechToText");
const REGION = "northeurope";
exports.asrMachine = (0, xstate_1.createMachine)({
    id: "asr",
    predictableActionArguments: true,
    schema: {
        context: {},
        events: {},
    },
    initial: "getToken",
    on: {
        READY: {
            target: "ready",
            actions: [(0, xstate_1.sendParent)("ASR_READY")],
        },
    },
    states: {
        ready: {
            on: {
                START: {
                    target: "recognising",
                    actions: [
                        "assignParameters",
                        (c) => console.debug("ASR: recognition started", c),
                    ],
                },
            },
        },
        fail: {},
        getToken: {
            invoke: {
                id: "getAuthorizationToken",
                src: (context) => (0, getAuthorizationToken_1.getAuthorizationToken)(),
                onDone: {
                    target: "ponyfill",
                    actions: [
                        assign((_context, event) => {
                            return { azureAuthorizationToken: event.data };
                        }),
                    ],
                },
                onError: {
                    target: "fail",
                },
            },
        },
        ponyfill: {
            invoke: {
                id: "ponyASR",
                src: (context) => (callback) => {
                    const { SpeechGrammarList, SpeechRecognition } = (0, SpeechToText_1.default)({
                        audioContext: context.audioCtx,
                        credentials: {
                            region: REGION,
                            authorizationToken: context.azureAuthorizationToken,
                        },
                    });
                    context.asr = new SpeechRecognition();
                    context.asr.grammars = new SpeechGrammarList();
                    callback("READY");
                },
            },
        },
        recognising: {
            initial: "wait",
            exit: "recStop",
            invoke: {
                id: "asrStart",
                src: (context, _event) => (callback, _onReceive) => {
                    context.asr.lang = context.language;
                    context.asr.continuous = true;
                    context.asr.interimResults = true;
                    context.asr.onstart = function (_event) {
                        callback("STARTED");
                    };
                    context.asr.onresult = function (event) {
                        if (event.results[event.results.length - 1].isFinal) {
                            const transcript = event.results
                                .map((x) => x[0].transcript.replace(/\.$/, ""))
                                .join(" ");
                            const confidence = event.results
                                .map((x) => x[0].confidence)
                                .reduce((a, b) => a + b) /
                                event.results.length;
                            callback({
                                type: "RESULT",
                                value: [
                                    {
                                        utterance: transcript,
                                        confidence: confidence,
                                    },
                                ],
                            });
                        }
                        else {
                            callback({ type: "STARTSPEECH" });
                        }
                    };
                    context.asr.start();
                },
            },
            states: {
                wait: {
                    on: {
                        STARTED: {
                            target: "noinput",
                            actions: (0, xstate_1.sendParent)("ASR_STARTED"),
                        },
                    },
                },
                noinput: {
                    after: {
                        NOINPUT: {
                            target: "#asr.ready",
                            actions: [
                                (0, xstate_1.sendParent)("ASR_NOINPUT_TIMEOUT"),
                                () => console.debug("ASR: noinput timeout"),
                            ],
                        },
                    },
                    on: {
                        STARTSPEECH: {
                            target: "inprogress",
                            actions: () => console.debug("ASR: started talking"),
                        },
                    },
                },
                inprogress: {
                    initial: "firstSegment",
                    on: {
                        RESULT: {
                            target: ".nextSegment",
                            actions: [
                                "assignResult",
                                (c) => console.debug(`ASR: result`, c.result),
                            ],
                        },
                    },
                    states: {
                        firstSegment: {},
                        nextSegment: {
                            after: {
                                COMPLETE: {
                                    target: "#asr.ready",
                                    actions: [
                                        (0, xstate_1.sendParent)((c) => ({
                                            type: "RECOGNISED",
                                            value: c.result,
                                        })),
                                        () => console.debug("ASR: speech complete"),
                                    ],
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}, {
    actions: {
        assignParameters: assign({
            noinputTimeout: (_c, e) => e.value.noinputTimeout,
            completeTimeout: (_c, e) => e.value.completeTimeout,
        }),
        assignResult: assign({
            result: (_c, e) => e.value,
        }),
        recStop: (context) => {
            var _a, _b;
            (_b = (_a = context.asr).abort) === null || _b === void 0 ? void 0 : _b.call(_a);
        },
    },
    delays: {
        NOINPUT: (context) => {
            return context.noinputTimeout || 5000;
        },
        COMPLETE: (context) => {
            return context.completeTimeout || 0;
        },
    },
});
