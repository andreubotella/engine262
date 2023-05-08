import type { Realm } from '../api.mjs';
import { X } from '../completion.mjs';
import { Descriptor, Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapAsyncGeneratorFunctionPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['prototype', realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'], undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'AsyncGeneratorFunction');

  X(realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'].DefineOwnProperty(Value('constructor'), Descriptor({
    Value: proto,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'] = proto;
}
