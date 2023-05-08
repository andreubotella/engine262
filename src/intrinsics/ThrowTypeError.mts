import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  Realm,
  SetIntegrityLevel,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { X } from '../completion.mjs';

/** https://tc39.es/ecma262/#sec-%throwtypeerror% */
function ThrowTypeError() {
  // 1. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'StrictPoisonPill');
}

export function bootstrapThrowTypeError(realmRec: Realm) {
  const f = X(CreateBuiltinFunction(ThrowTypeError, 0, Value(''), [], realmRec));
  Assert(X(SetIntegrityLevel(f, 'frozen')) === Value.true);
  realmRec.Intrinsics['%ThrowTypeError%'] = f;
}
