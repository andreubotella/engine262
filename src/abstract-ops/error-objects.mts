import { ObjectValue, Value, Descriptor } from '../value.mjs';
import {
  Q, X, unused, ThrowCompletion,
} from '../completion.mjs';
import { HasProperty, Get, DefinePropertyOrThrow } from './all.mjs';

/** https://tc39.es/ecma262/#sec-errorobjects-install-error-cause */
export function InstallErrorCause(O: ObjectValue, options: Value): unused | ThrowCompletion {
  // 1. If Type(options) is Object and ? HasProperty(options, "cause") is true, then
  if (options instanceof ObjectValue) {
    // nested if statement due to macro expansion
    if (Q(HasProperty(options, Value('cause'))) === Value.true) {
      // a. Let cause be ? Get(options, "cause").
      const cause = Q(Get(options, Value('cause')));
      // b. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "cause", cause).
      X(DefinePropertyOrThrow(O, Value('cause'), Descriptor({
        Value: cause,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
      })));
    }
  }
  // 2. Return unused.
  return unused;
}
