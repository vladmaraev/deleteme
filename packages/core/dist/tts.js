"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ttsMachine = void 0;
const xstate_1 = require("xstate");
const getAuthorizationToken_1 = require("./getAuthorizationToken");
const TextToSpeech_1 = require("web-speech-cognitive-services/lib/SpeechServices/TextToSpeech");
const REGION = "northeurope";
exports.ttsMachine = (0, xstate_1.createMachine)({
    id: "tts",
    predictableActionArguments: true,
    schema: {
        context: {},
        events: {},
    },
    initial: "getToken",
    on: {
        READY: {
            target: "ready",
            actions: (0, xstate_1.sendParent)("TTS_READY"),
        },
        ERROR: "fail",
    },
    states: {
        ready: {
            on: { START: { target: "speaking", actions: "assignAgenda" } },
        },
        fail: {},
        getToken: {
            invoke: {
                id: "getAuthorizationToken",
                src: (context) => (0, getAuthorizationToken_1.getAuthorizationToken)(),
                onDone: {
                    target: "ponyfill",
                    actions: [
                        (0, xstate_1.assign)((_context, event) => {
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
                id: "ponyTTS",
                src: (context, _event) => (callback, _onReceive) => {
                    const ponyfill = (0, TextToSpeech_1.default)({
                        audioContext: context.audioCtx,
                        credentials: {
                            region: REGION,
                            authorizationToken: context.azureAuthorizationToken,
                        },
                    });
                    const { speechSynthesis, SpeechSynthesisUtterance } = ponyfill;
                    context.tts = speechSynthesis;
                    context.ttsUtterance = SpeechSynthesisUtterance;
                    context.tts.addEventListener("voiceschanged", () => {
                        context.tts.cancel();
                        const voices = context.tts.getVoices();
                        const voiceRe = RegExp(context.ttsVoice, "u");
                        const voice = voices.find((v) => voiceRe.test(v.name));
                        if (voice) {
                            context.voice = voice;
                            callback("READY");
                        }
                        else {
                            console.error(`TTS_ERROR: Could not get voice for regexp ${voiceRe}`);
                            callback("ERROR");
                        }
                    });
                },
            },
        },
        speaking: {
            initial: "go",
            on: {
                END: {
                    target: "ready",
                },
            },
            exit: (0, xstate_1.sendParent)("ENDSPEECH"),
            states: {
                go: {
                    invoke: {
                        id: "ttsStart",
                        src: (context, _event) => (callback, _onReceive) => {
                            let content = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US"><voice name="${context.voice.name}">`;
                            if (context.ttsLexicon) {
                                content = content + `<lexicon uri="${context.ttsLexicon}"/>`;
                            }
                            content = content + `${context.ttsAgenda}</voice></speak>`;
                            if (context.ttsAgenda === ("" || " ")) {
                                content = "";
                            }
                            const utterance = new context.ttsUtterance(content);
                            utterance.voice = context.voice;
                            utterance.onend = () => {
                                callback("END");
                            };
                            context.tts.speak(utterance);
                        },
                    },
                    on: {
                        // SELECT: "#asrttsIdle",
                        PAUSE: "paused",
                    },
                    exit: "ttsStop",
                },
                paused: {
                    on: {
                        CONTINUE: "go",
                        //            SELECT: "#asrttsIdle",
                    },
                },
            },
        },
    },
}, {
    actions: {
        assignAgenda: (0, xstate_1.assign)({
            ttsAgenda: (_c, e) => e.value,
        }),
        ttsStop: (context) => {
            context.tts.cancel();
        },
    },
});
