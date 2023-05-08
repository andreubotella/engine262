import { Descriptor, Value } from '../value.mjs';
import { DefinePropertyOrThrow, Realm } from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapGeneratorFunctionPrototype(realmRec: Realm) {
  const generatorPrototype = realmRec.Intrinsics['%GeneratorFunction.prototype.prototype%'];

  const generator = bootstrapPrototype(realmRec, [
    ['prototype', generatorPrototype, undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'GeneratorFunction');

  X(DefinePropertyOrThrow(generatorPrototype, Value('constructor'), Descriptor({
    Value: generator,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%GeneratorFunction.prototype%'] = generator;
}
