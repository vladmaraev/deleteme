declare const machine: import("xstate").StateMachine<DomainContext, any, SDSEvent, {
    value: any;
    context: DomainContext;
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, SDSEvent, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
export { machine };
