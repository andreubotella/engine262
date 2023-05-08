import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  CreateDataProperty,
  OrdinaryObjectCreate,
  ProxyCreate,
  Realm,
  isProxyExoticObject,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-proxy-target-handler */
function ProxyConstructor([target = Value.undefined, handler = Value.undefined], { NewTarget }) {
  // 1. f NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Return ? ProxyCreate(target, handler).
  return Q(ProxyCreate(target, handler));
}

/** https://tc39.es/ecma262/#sec-proxy-revocation-functions */
function ProxyRevocationFunctions() {
  // 1. Let F be the active function object.
  const F = surroundingAgent.activeFunctionObject;
  // 2. Let p be F.[[RevocableProxy]].
  const p = F.RevocableProxy;
  // 3. If p is null, return undefined.
  if (p === Value.null) {
    return Value.undefined;
  }
  // 4. Set F.[[RevocableProxy]] to null.
  F.RevocableProxy = Value.null;
  // 5. Assert: p is a Proxy object.
  Assert(isProxyExoticObject(p));
  // 6. Set p.[[ProxyTarget]] to null.
  p.ProxyTarget = Value.null;
  // 7. Set p.[[ProxyHandler]] to null.
  p.ProxyHandler = Value.null;
  // 8. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-proxy.revocable */
function Proxy_revocable([target = Value.undefined, handler = Value.undefined]) {
  // 1. Let p be ? ProxyCreate(target, handler).
  const p = Q(ProxyCreate(target, handler));
  /** https://tc39.es/ecma262/#sec-proxy-revocation-functions. */
  const steps = ProxyRevocationFunctions;
  // 3. Let length be the number of non-optional parameters of the function definition in Proxy Revocation Functions.
  const length = 0;
  // 4. Let revoker be ! CreateBuiltinFunction(steps, length, "", « [[RevocableProxy]] »).
  const revoker = X(CreateBuiltinFunction(steps, length, Value(''), ['RevocableProxy']));
  // 5. Set revoker.[[RevocableProxy]] to p.
  revoker.RevocableProxy = p;
  // 6. Let result be OrdinaryObjectCreate(%Object.prototype%).
  const result = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  // 7. Perform ! CreateDataPropertyOrThrow(result, "proxy", p).
  X(CreateDataProperty(result, Value('proxy'), p));
  // 8. Perform ! CreateDataPropertyOrThrow(result, "revoke", revoker).
  X(CreateDataProperty(result, Value('revoke'), revoker));
  // 9. Return result.
  return result;
}

export function bootstrapProxy(realmRec: Realm) {
  const proxyConstructor = CreateBuiltinFunction(
    ProxyConstructor,
    2,
    Value('Proxy'),
    [],
    realmRec,
    undefined,
    undefined,
    Value.true,
  );

  assignProps(realmRec, proxyConstructor, [
    ['revocable', Proxy_revocable, 2],
  ]);

  realmRec.Intrinsics['%Proxy%'] = proxyConstructor;
}
