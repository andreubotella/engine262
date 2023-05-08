import type { Realm } from '../api.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapAsyncFunctionPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
