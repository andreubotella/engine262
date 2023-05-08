import { BooleanValue, JSStringValue, NullValue, UndefinedValue, Value } from './value.mjs';
import {
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X, unused,
} from './completion.mjs';
import {
  IsCallable,
  Call, Construct, Assert,
  GetActiveScriptOrModule,
  CleanupFinalizationRegistry,
  CreateArrayFromList,
  FinishLoadingImportedModule,
  Realm,
  type AsyncGeneratorObject,
  type FunctionObject,
  type IntrinsicsName,
  PromiseCapabilityRecord,
  GraphLoadingState,
} from './abstract-ops/all.mjs';
import { GlobalDeclarationInstantiation } from './runtime-semantics/all.mjs';
import { Evaluate } from './evaluator.mjs';
import { CallSite, unwind } from './helpers.mjs';
import {
  AbstractModuleRecord, CyclicModuleRecord, EnvironmentRecord, PrivateEnvironmentRecord, runJobQueue, type ScriptRecord,
} from './api.mjs';
import * as messages from './messages.mjs';

export const FEATURES = [
  {
    name: 'FinalizationRegistry.prototype.cleanupSome',
    flag: 'cleanup-some',
    url: 'https://github.com/tc39/proposal-cleanup-some',
  },
  {
    name: 'Well-Formed Unicode Strings',
    flag: 'is-usv-string',
    url: 'https://github.com/tc39/proposal-is-usv-string',
  },
] as const
Object.freeze(FEATURES);
FEATURES.map(Object.freeze);
export type ValidFeatures = typeof FEATURES[number]['flag'];

class ExecutionContextStack extends Array<ExecutionContext> {
  // This ensures that only the length taking overload is supported.
  // This is necessary to support `ArraySpeciesCreate`, which invokes
  // the constructor with argument `length`:
  constructor(length = 0) {
    super(+length);
  }

  // @ts-expect-error incompatible override
  override pop(ctx: ExecutionContext) {
    if (!ctx.poppedForTailCall) {
      const popped = super.pop();
      Assert(popped === ctx);
    }
  }
}

let agentSignifier = 0;
export interface AgentInit {
  readonly features?: readonly ValidFeatures[];
}
export interface AgentHostDefinedOptions extends Omit<AgentInit, 'features'> {
  readonly features: Record<ValidFeatures, boolean>
}
export interface AgentRecord {
  readonly LittleEndian: BooleanValue,
  readonly CanBlock: BooleanValue,
  readonly Signifier: unknown,
  readonly IsLockFree1: BooleanValue,
  readonly IsLockFree2: BooleanValue,
  readonly IsLockFree8: BooleanValue,
  readonly CandidateExecution: CandidateExecutionRecord | undefined,
  readonly KeptAlive: Set<Value>
}
/** https://tc39.es/ecma262/#sec-candidate-executions */
export interface CandidateExecutionRecord {
  // readonly EventsRecords;
  // readonly ChosenValues;
  // readonly AgentOrder;
  // readonly ReadsBytesFrom;
  // readonly ReadsFrom;
  // readonly HostSynchronizesWith;
  // readonly SynchronizesWith;
  // readonly HappensBefore;
}
export interface JobFunction {}
/** https://tc39.es/ecma262/#job */
export interface JobRecord {
  readonly queueName: string;
  readonly job: JobFunction;
  readonly callerRealm: Realm;
  readonly callerScriptOrModule: ScriptRecord | AbstractModuleRecord | NullValue;
}
/** https://tc39.es/ecma262/#sec-agents */
export class Agent {
  readonly AgentRecord: AgentRecord;
  // #execution-context-stack
  readonly executionContextStack = new ExecutionContextStack();
  // NON-SPEC
  readonly jobQueue: JobRecord[] = [];
  readonly scheduledForCleanup = new Set();
  readonly hostDefinedOptions: AgentHostDefinedOptions;
  constructor(options: AgentInit = {}) {
    // #table-agent-record
    const Signifier = agentSignifier;
    agentSignifier += 1;
    this.AgentRecord = {
      LittleEndian: Value.true,
      CanBlock: Value.true,
      Signifier,
      IsLockFree1: Value.true,
      IsLockFree2: Value.true,
      IsLockFree8: Value.true,
      CandidateExecution: undefined,
      KeptAlive: new Set(),
    };

    this.hostDefinedOptions = {
      ...options,
      features: FEATURES.reduce((acc, { flag }) => {
        if (options.features) {
          acc[flag] = options.features.includes(flag);
        } else {
          acc[flag] = false;
        }
        return acc;
      }, {} as Record<ValidFeatures, boolean>),
    };
  }

  // #running-execution-context
  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  // #current-realm
  get currentRealmRecord() {
    return this.runningExecutionContext.Realm;
  }

  // #active-function-object
  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  // Get an intrinsic by name for the current realm
  intrinsic(name: IntrinsicsName) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  // Generate a throw completion using message templates
  Throw<T extends keyof typeof messages>(type: Value | string, template: T, ...templateArgs: Parameters<typeof messages[T]>) {
    if (type instanceof Value) {
      return ThrowCompletion(type);
    }
    const messageF = messages[template];
    // @ts-expect-error ts cannot understand this
    const message = messageF(...templateArgs)
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    let error;
    if (type === 'AggregateError') {
      error = X(Construct(cons, [
        X(CreateArrayFromList([])),
        Value(message),
      ]));
    } else {
      error = X(Construct(cons, [Value(message)]));
    }
    return ThrowCompletion(error);
  }

  queueJob(queueName: string, job: JobFunction) {
    const callerContext = this.runningExecutionContext;
    const callerRealm = callerContext.Realm;
    const callerScriptOrModule = GetActiveScriptOrModule();
    const pending: JobRecord = {
      queueName,
      job,
      callerRealm,
      callerScriptOrModule,
    };
    this.jobQueue.push(pending);
  }

  // NON-SPEC: Check if a feature is enabled in this agent.
  feature(name: ValidFeatures) {
    return this.hostDefinedOptions.features[name];
  }

  // NON-SPEC
  mark(m: GCMarker) {
    this.AgentRecord.KeptAlive.forEach((v) => {
      m(v);
    });
    this.executionContextStack.forEach((e) => {
      m(e);
    });
    this.jobQueue.forEach((j) => {
      m(j.callerRealm);
      m(j.callerScriptOrModule);
    });
  }
}

export let surroundingAgent: Agent;
export function setSurroundingAgent(a: Agent) {
  surroundingAgent = a;
}

export interface CodeEvaluationState {}
/** https://tc39.es/ecma262/#sec-execution-contexts */
export class ExecutionContext {
  codeEvaluationState: CodeEvaluationState;
  Function: FunctionObject | NullValue;
  Realm: Realm;
  ScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue;
  VariableEnvironment: EnvironmentRecord;
  LexicalEnvironment: EnvironmentRecord;
  PrivateEnvironment: PrivateEnvironmentRecord | NullValue;

  // Only for generators
  Generator: AsyncGeneratorObject | UndefinedValue = Value.undefined;
  // NON-SPEC
  readonly callSite = new CallSite(this);
  promiseCapability: PromiseCapabilityRecord;
  readonly poppedForTailCall = false;

  copy() {
    const e = new ExecutionContext();
    e.codeEvaluationState = this.codeEvaluationState;
    e.Function = this.Function;
    e.Realm = this.Realm;
    e.ScriptOrModule = this.ScriptOrModule;
    e.VariableEnvironment = this.VariableEnvironment;
    e.LexicalEnvironment = this.LexicalEnvironment;
    e.PrivateEnvironment = this.PrivateEnvironment;

    e.callSite = this.callSite.clone(e);
    e.promiseCapability = this.promiseCapability;
    return e;
  }

  // NON-SPEC
  mark(m) {
    m(this.Function);
    m(this.Realm);
    m(this.ScriptOrModule);
    m(this.VariableEnvironment);
    m(this.LexicalEnvironment);
    m(this.PrivateEnvironment);
    m(this.promiseCapability);
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation */
export function ScriptEvaluation(scriptRecord: ScriptRecord) {
  if (surroundingAgent.hostDefinedOptions.boost?.evaluateScript) {
    return surroundingAgent.hostDefinedOptions.boost.evaluateScript(scriptRecord);
  }

  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptContext = new ExecutionContext();
  scriptContext.Function = Value.null;
  scriptContext.Realm = scriptRecord.Realm;
  scriptContext.ScriptOrModule = scriptRecord;
  scriptContext.VariableEnvironment = globalEnv;
  scriptContext.LexicalEnvironment = globalEnv;
  scriptContext.PrivateEnvironment = Value.null;
  scriptContext.HostDefined = scriptRecord.HostDefined;
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptContext);
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result = EnsureCompletion(GlobalDeclarationInstantiation(scriptBody, globalEnv));

  if (result.Type === 'normal') {
    result = EnsureCompletion(unwind(Evaluate(scriptBody)));
  }

  if (result.Type === 'normal' && !result.Value) {
    result = NormalCompletion(Value.undefined);
  }

  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop(scriptContext);
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(job: JobFunction, _realm: Realm) {
  surroundingAgent.queueJob('PromiseJobs', job);
}

/** https://tc39.es/ecma262/#sec-agentsignifier */
export function AgentSignifier(): AgentRecord['Signifier'] {
  // 1. Let AR be the Agent Record of the surrounding agent.
  const AR = surroundingAgent.AgentRecord;
  // 2. Return AR.[[Signifier]].
  return AR.Signifier;
}

export function HostEnsureCanCompileStrings(callerRealm: Realm, calleeRealm: Realm): NormalCompletion<void> | ThrowCompletion {
  if (surroundingAgent.hostDefinedOptions.ensureCanCompileStrings !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.ensureCanCompileStrings(callerRealm, calleeRealm));
  }
  return NormalCompletion(undefined);
}

export function HostPromiseRejectionTracker(promise, operation: 'reject' | 'handle'): unused {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm && realm.HostDefined.promiseRejectionTracker) {
    X(realm.HostDefined.promiseRejectionTracker(promise, operation));
  }
}

export function HostHasSourceTextAvailable(func: FunctionObject): BooleanValue {
  if (surroundingAgent.hostDefinedOptions.hasSourceTextAvailable) {
    return X(surroundingAgent.hostDefinedOptions.hasSourceTextAvailable(func));
  }
  return Value.true;
}

// #sec-HostLoadImportedModule
export function HostLoadImportedModule(referrer: ScriptRecord | CyclicModuleRecord | Realm, specifier: JSStringValue, hostDefined: unknown, payload: GraphLoadingState): unused {
  if (surroundingAgent.hostDefinedOptions.loadImportedModule) {
    const executionContext = surroundingAgent.runningExecutionContext;
    let result;
    let sync = true;
    surroundingAgent.hostDefinedOptions.loadImportedModule(referrer, specifier.stringValue(), hostDefined, (res) => {
      result = EnsureCompletion(res);
      if (!sync) {
        // If this callback has been called asynchronously, restore the correct execution context and enqueue a job.
        surroundingAgent.executionContextStack.push(executionContext);
        surroundingAgent.queueJob('FinishLoadingImportedModule', () => {
          FinishLoadingImportedModule(referrer, specifier, result, payload);
        });
        surroundingAgent.executionContextStack.pop(executionContext);
        runJobQueue();
      }
    });
    sync = false;
    if (result !== undefined) {
      FinishLoadingImportedModule(referrer, specifier, result, payload);
    }
  } else {
    FinishLoadingImportedModule(referrer, specifier, surroundingAgent.Throw('Error', 'CouldNotResolveModule', specifier), payload);
  }
}

/** https://tc39.es/ecma262/#sec-hostgetimportmetaproperties */
export function HostGetImportMetaProperties(moduleRecord: AbstractModuleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.getImportMetaProperties) {
    return X(realm.HostDefined.getImportMetaProperties(moduleRecord.HostDefined.public));
  }
  return [];
}

/** https://tc39.es/ecma262/#sec-hostfinalizeimportmeta */
export function HostFinalizeImportMeta(importMeta: Object, moduleRecord: AbstractModuleRecord): unused {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.finalizeImportMeta) {
    return X(realm.HostDefined.finalizeImportMeta(importMeta, moduleRecord.HostDefined.public));
  }
  return unused;
}

/** https://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
export function HostEnqueueFinalizationRegistryCleanupJob(fg) {
  if (surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry(fg));
  } else {
    if (!surroundingAgent.scheduledForCleanup.has(fg)) {
      surroundingAgent.scheduledForCleanup.add(fg);
      surroundingAgent.queueJob('FinalizationCleanup', () => {
        surroundingAgent.scheduledForCleanup.delete(fg);
        CleanupFinalizationRegistry(fg);
      });
    }
  }
  return NormalCompletion(undefined);
}

/** https://tc39.es/ecma262/#sec-jobcallback-records */
export interface JobCallback {
  readonly Callback: FunctionObject
  readonly HostDefined: unknown
}

/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback: FunctionObject): JobCallback {
  // 1. Assert: IsCallable(callback) is true.
  Assert(IsCallable(callback) === Value.true);
  // 2. Return the JobCallback Record { [[Callback]]: callback, [[HostDefined]]: empty }.
  return { Callback: callback, HostDefined: undefined };
}

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export function HostCallJobCallback(jobCallback: JobCallback, V: Value, argumentsList: readonly Value[]): NormalCompletion | ThrowCompletion {
  // 1. Assert: IsCallable(jobCallback.[[Callback]]) is true.
  Assert(IsCallable(jobCallback.Callback) === Value.true);
  // 1. Return ? Call(jobCallback.[[Callback]], V, argumentsList).
  return Q(Call(jobCallback.Callback, V, argumentsList));
}
export type GCMarker = (value: unknown) => void;
