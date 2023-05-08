import {
  Completion, EnsureCompletion, X, unused,
} from '../completion.mjs';
import { ExecutionContext, surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { resume } from '../helpers.mjs';
import type { ExpressionBodyNode, FunctionBodyNode, ParseNode } from '../parser/Types.mjs';
import { Assert, Call, PromiseCapabilityRecord } from './all.mjs';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-async-function-objects */

/** https://tc39.es/ecma262/#sec-asyncblockstart */
export function AsyncBlockStart(promiseCapability: PromiseCapabilityRecord, asyncBody: ParseNode, asyncContext: ExecutionContext): unused {
  asyncContext.promiseCapability = promiseCapability;

  const runningContext = surroundingAgent.runningExecutionContext;
  asyncContext.codeEvaluationState = (function* resumer() {
    const result: Completion<Value> = EnsureCompletion(yield* Evaluate(asyncBody));
    // Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done.
    surroundingAgent.executionContextStack.pop(asyncContext);
    if (result.Type === 'normal') {
      X(Call(promiseCapability.Resolve, Value.undefined, [Value.undefined]));
    } else if (result.Type === 'return') {
      X(Call(promiseCapability.Resolve, Value.undefined, [result.Value]));
    } else {
      Assert(result.Type === 'throw');
      X(Call(promiseCapability.Reject, Value.undefined, [result.Value]));
    }
    return Value.undefined;
  }());
  surroundingAgent.executionContextStack.push(asyncContext);
  const result = EnsureCompletion(resume(asyncContext, unused));
  Assert(surroundingAgent.runningExecutionContext === runningContext);
  Assert(result.Type === 'normal' && result.Value === Value.undefined);
}

/** https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start */
export function AsyncFunctionStart(promiseCapability: PromiseCapabilityRecord, asyncFunctionBody: FunctionBodyNode | ExpressionBodyNode): unused {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  AsyncBlockStart(promiseCapability, asyncFunctionBody, asyncContext);
}
