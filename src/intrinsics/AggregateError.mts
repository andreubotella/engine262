import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor, ObjectValue } from '../value.mjs';
import {
  ToString,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
  InstallErrorCause,
  CreateArrayFromList,
  Realm,
  type ArgumentList,
  type FunctionObject,
  type NativeConstructorContext,
  CreateNonEnumerableDataPropertyOrThrow,
  IteratorToList,
  GetIterator,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { captureStack, type Mutable } from '../helpers.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

export interface AggregateErrorObject extends ObjectValue {
  readonly ErrorData: Value[];
  readonly [Symbol.toStringTag]: 'AggregateError';
}
/** https://tc39.es/ecma262/#sec-aggregate-error-constructor */
function AggregateErrorConstructor([errors = Value.undefined, message = Value.undefined, options = Value.undefined]: ArgumentList, { NewTarget }: NativeConstructorContext) {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget: FunctionObject;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject as FunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%AggregateError.prototype%", « [[ErrorData]] »).
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%AggregateError.prototype%', [
    'ErrorData',
  ])) as Mutable<AggregateErrorObject>;
  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(ToString(message));
    // b. Perform CreateNonEnumerableDataPropertyOrThrow(O, "message", msg).
    CreateNonEnumerableDataPropertyOrThrow(O, Value('message'), msg);
  }
  // 4. Perform ? InstallErrorCause(O, options).
  Q(InstallErrorCause(O, options));
  // 5. Let errorsList be ? IteratorToList(? GetIterator(errors, sync)).
  const errorsList = Q(IteratorToList(Q(GetIterator(errors, 'sync'))));
  // 6. Perform ! DefinePropertyOrThrow(O, "errors", Property Descriptor { [[Configurable]]: true, [[Enumerable]]: false, [[Writable]]: true, [[Value]]: ! CreateArrayFromList(errorsList) }).
  X(DefinePropertyOrThrow(O, Value('errors'), Descriptor({
    Configurable: Value.true,
    Enumerable: Value.false,
    Writable: Value.true,
    Value: CreateArrayFromList(errorsList),
  })));


  // NON-SPEC
  X(captureStack(O));

  // 7. Return O.
  return O;
}

export function bootstrapAggregateError(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, AggregateErrorConstructor, 'AggregateError', 2, realmRec.Intrinsics['%AggregateError.prototype%'] as ObjectValue, []);
  c.Prototype = realmRec.Intrinsics['%Error%'];
  realmRec.Intrinsics['%AggregateError%'] = c;
}
