"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machine = void 0;
const xstate_1 = require("xstate");
const tts_1 = require("./tts");
const asr_1 = require("./asr");
const tdmClient_1 = require("./tdmClient");
const machine = (0, xstate_1.createMachine)({
    predictableActionArguments: true,
    schema: {
        context: {},
        events: {},
    },
    id: "sds",
    type: "parallel",
    states: {
        dm: Object.assign({}, tdmClient_1.tdmDmMachine),
        asrTtsSpawner: {
            initial: "idle",
            states: {
                idle: { on: { PREPARE: "spawn" } },
                spawn: {
                    entry: [
                        "createAudioContext",
                        (0, xstate_1.assign)({
                            ttsRef: (c) => {
                                return (0, xstate_1.spawn)(tts_1.ttsMachine.withContext({
                                    ttsVoice: c.parameters.ttsVoice,
                                    audioCtx: c.audioCtx,
                                    ttsLexicon: c.parameters.ttsLexicon,
                                }));
                            },
                        }),
                        (0, xstate_1.assign)({
                            asrRef: (c) => {
                                return (0, xstate_1.spawn)(asr_1.asrMachine.withContext({
                                    language: c.parameters.ttsVoice,
                                    audioCtx: c.audioCtx,
                                }));
                            },
                        }),
                    ],
                    // after: {
                    //   30000: {
                    //     target: "spawn",
                    //   },
                    // },
                },
            },
        },
        asrTtsManager: {
            initial: "initialize",
            on: {
                TTS_READY: {
                    target: ".ready",
                },
                ASR_READY: {
                    target: ".ready",
                },
                TTS_ERROR: ".fail",
                ASR_NOINPUT_TIMEOUT: ".ready",
            },
            states: {
                initialize: {
                    initial: "ponyfill",
                    states: {
                        fail: {},
                        ponyfill: {},
                        preReady: {},
                    },
                },
                ready: {
                    initial: "idle",
                    states: {
                        idle: {
                            on: {
                                LISTEN: [{ target: "waitForRecogniser" }],
                                SPEAK: [
                                    {
                                        actions: "logAgenda",
                                        target: "speaking",
                                    },
                                ],
                            },
                        },
                        speaking: {
                            entry: (c, e) => c.ttsRef.send({
                                type: "START",
                                value: e.value,
                            }),
                            on: { ENDSPEECH: "idle" },
                        },
                        waitForRecogniser: {
                            entry: (c, _e) => {
                                var _a;
                                return c.asrRef.send({
                                    type: "START",
                                    value: {
                                        noinputTimeout: (_a = c.tdmPassivity) !== null && _a !== void 0 ? _a : 1000 * 3600 * 24,
                                        completeTimeout: c.tdmSpeechCompleteTimeout ||
                                            c.parameters.completeTimeout,
                                    },
                                });
                            },
                            on: {
                                ASR_STARTED: "recognising",
                            },
                        },
                        recognising: {
                            on: {
                                RECOGNISED: {
                                    target: "idle",
                                    actions: "logRecResult",
                                },
                            },
                        },
                    },
                },
                fail: {},
            },
        },
    },
}, {
    actions: {
        createAudioContext: (context) => {
            context.audioCtx = new (window.AudioContext ||
                window.webkitAudioContext)();
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then(function (stream) {
                context.audioCtx.createMediaStreamSource(stream);
            });
        },
        logRecResult: (_c, e) => {
            console.log("U>", e.value[0]["utterance"], {
                confidence: e.value[0]["confidence"],
            });
        },
        logAgenda: (context, event) => {
            var _a;
            console.log("S>", event.value, {
                passivity: `${(_a = context.tdmPassivity) !== null && _a !== void 0 ? _a : "∞"} ms`,
                speechCompleteTimeout: `${context.tdmSpeechCompleteTimeout ||
                    context.parameters.completeTimeout} ms`,
            });
        },
    },
});
exports.machine = machine;
