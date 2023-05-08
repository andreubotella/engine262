import { surroundingAgent } from '../engine.mjs';
import {
  NormalCompletion, Q, ThrowCompletion, X,
} from '../completion.mjs';
import { AbstractModuleRecord, ResolvedBindingRecord } from '../modules.mjs';
import {
  SymbolValue,
  Value,
  Descriptor,
  wellKnownSymbols,
  BooleanValue,
  ObjectValue,
  JSStringValue,
  type PropertyKeyValue,
  UndefinedValue,
  NullValue,
  type WithPrototype,
} from '../value.mjs';
import { ValueSet, isArray, type Mutable } from '../helpers.mjs';
import {
  Assert,
  SortCompare,
  SameValue,
  MakeBasicObject,
  IsPropertyKey,
  IsAccessorDescriptor,
  SetImmutablePrototype,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryHasProperty,
  OrdinaryGet,
  OrdinaryDelete,
  OrdinaryOwnPropertyKeys,
  GetModuleNamespace,
} from './all.mjs';


function ModuleNamespaceSetPrototypeOf(this: ModuleNamespaceExoticObject, V: Value): BooleanValue {
  const O = this;

  return Q(SetImmutablePrototype(O, V));
}

function ModuleNamespaceIsExtensible(): BooleanValue {
  return Value.false;
}

function ModuleNamespacePreventExtensions(): BooleanValue {
  return Value.true;
}

function ModuleNamespaceGetOwnProperty(this: ModuleNamespaceExoticObject, P: PropertyKeyValue): Descriptor | UndefinedValue {
  const O = this;

  if (P instanceof SymbolValue) {
    return OrdinaryGetOwnProperty(O, P);
  }
  const exports = O.Exports;
  if (!exports.has(P)) {
    return Value.undefined;
  }
  const value = Q(O.Get(P, O));
  return Descriptor({
    Value: value,
    Writable: Value.true,
    Enumerable: Value.true,
    Configurable: Value.false,
  });
}

function ModuleNamespaceDefineOwnProperty(this: ModuleNamespaceExoticObject, P: PropertyKeyValue, Desc: Descriptor): BooleanValue {
  const O = this;

  if (P instanceof SymbolValue) {
    return OrdinaryDefineOwnProperty(O, P, Desc);
  }

  const current = Q(O.GetOwnProperty(P));
  if (current === Value.undefined) {
    return Value.false;
  }
  if (IsAccessorDescriptor(Desc)) {
    return Value.false;
  }
  if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
    return Value.false;
  }
  if (Desc.Enumerable !== undefined && Desc.Enumerable === Value.false) {
    return Value.false;
  }
  if (Desc.Configurable !== undefined && Desc.Configurable === Value.true) {
    return Value.false;
  }
  if (Desc.Value !== undefined) {
    return SameValue(Desc.Value, current.Value);
  }
  return Value.true;
}

function ModuleNamespaceHasProperty(this: ModuleNamespaceExoticObject, P: PropertyKeyValue) {
  const O = this;

  if (P instanceof SymbolValue) {
    return OrdinaryHasProperty(O, P);
  }
  const exports = O.Exports;
  if (exports.has(P)) {
    return Value.true;
  }
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-module-namespace-exotic-objects-get-p-receiver */
function ModuleNamespaceGet(this: ModuleNamespaceExoticObject, P: PropertyKeyValue, Receiver: Value): NormalCompletion | ThrowCompletion {
  const O = this;

  // 1. Assert: IsPropertyKey(P) is true.
  Assert(IsPropertyKey(P));
  // 2. If Type(P) is Symbol, then
  if (P instanceof SymbolValue) {
    // a. Return ? OrdinaryGet(O, P, Receiver).
    return OrdinaryGet(O, P, Receiver);
  }
  // 3. Let exports be O.[[Exports]].
  const exports = O.Exports;
  // 4. If P is not an element of exports, return undefined.
  if (!exports.has(P)) {
    return Value.undefined;
  }
  // 5. Let m be O.[[Module]].
  const m = O.Module;
  // 6. Let binding be ! m.ResolveExport(P).
  const binding = m.ResolveExport(P);
  // 7. Assert: binding is a ResolvedBinding Record.
  Assert(binding instanceof ResolvedBindingRecord);
  // 8. Let targetModule be binding.[[Module]].
  const targetModule = binding.Module;
  // 9. Assert: targetModule is not undefined.
  Assert(targetModule !== Value.undefined);
  // 10. If binding.[[BindingName]] is ~namespace~, then
  if (binding.BindingName === 'namespace') {
    // a. Return ? GetModuleNamespace(targetModule).
    return Q(GetModuleNamespace(targetModule));
  }
  // 11. Let targetEnv be targetModule.[[Environment]].
  const targetEnv = targetModule.Environment;
  // 12. If targetEnv is undefined, throw a ReferenceError exception.
  if (targetEnv instanceof UndefinedValue) {
    return surroundingAgent.Throw('ReferenceError', 'NotDefined', P);
  }
  // 13. Return ? targetEnv.GetBindingValue(binding.[[BindingName]], true).
  return Q(targetEnv.GetBindingValue(binding.BindingName, Value.true));
}

function ModuleNamespaceSet(this: ModuleNamespaceExoticObject): BooleanValue {
  return Value.false;
}

function ModuleNamespaceDelete(this: ModuleNamespaceExoticObject, P: PropertyKeyValue): BooleanValue {
  const O = this;

  Assert(IsPropertyKey(P));
  if (P instanceof SymbolValue) {
    return Q(OrdinaryDelete(O, P));
  }
  const exports = O.Exports;
  if (exports.has(P)) {
    return Value.false;
  }
  return Value.true;
}

function ModuleNamespaceOwnPropertyKeys(this: ModuleNamespaceExoticObject): PropertyKeyValue[] {
  const O = this;

  const exports: PropertyKeyValue[] = [...O.Exports];
  const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
  exports.push(...symbolKeys);
  return exports;
}

export interface ModuleNamespaceExoticObject extends ObjectValue, WithPrototype {
  readonly Module: AbstractModuleRecord;
  readonly Exports: ValueSet<JSStringValue>;
  readonly Prototype: NullValue;
  readonly [Symbol.toStringTag]: 'ModuleNamespaceExoticObject'
}
/** https://tc39.es/ecma262/#sec-modulenamespacecreate */
export function ModuleNamespaceCreate(module: AbstractModuleRecord, exports: readonly JSStringValue[]): ModuleNamespaceExoticObject {
  // 1. Assert: module is a Module Record.
  Assert(module instanceof AbstractModuleRecord);
  // 2. Assert: module.[[Namespace]] is undefined.
  Assert(module.Namespace === Value.undefined);
  // 3. Assert: exports is a List of String values.
  Assert(isArray(exports));
  // 4. Let internalSlotsList be the internal slots listed in Table 31.
  const internalSlotsList = ['Module', 'Exports', 'Prototype'] as const;
  // 5. Let M be ! MakeBasicObject(internalSlotsList).
  const M = X(MakeBasicObject(internalSlotsList)) as Mutable<ModuleNamespaceExoticObject>;
  M[Symbol.toStringTag] = 'ModuleNamespaceExoticObject'
  /** https://tc39.es/ecma262/#sec-module-namespace-exotic-objects */
  M.SetPrototypeOf = ModuleNamespaceSetPrototypeOf;
  M.IsExtensible = ModuleNamespaceIsExtensible;
  M.PreventExtensions = ModuleNamespacePreventExtensions;
  M.GetOwnProperty = ModuleNamespaceGetOwnProperty;
  M.DefineOwnProperty = ModuleNamespaceDefineOwnProperty;
  M.HasProperty = ModuleNamespaceHasProperty;
  M.Get = ModuleNamespaceGet;
  M.Set = ModuleNamespaceSet;
  M.Delete = ModuleNamespaceDelete;
  M.OwnPropertyKeys = ModuleNamespaceOwnPropertyKeys;
  // 7. Set M.[[Prototype]] to null.
  M.Prototype = Value.null;
  // 8. Set M.[[Module]] to module.
  M.Module = module;
  // 9. Let sortedExports be a new List containing the same values as the list exports where the values are ordered as if an Array of the same values had been sorted using Array.prototype.sort using undefined as comparefn.
  const sortedExports = [...exports].sort((x, y) => {
    const result = X(SortCompare(x, y, Value.undefined));
    return result.numberValue();
  });
  // 10. Set M.[[Exports]] to sortedExports.
  M.Exports = new ValueSet(sortedExports);
  // 11. Create own properties of M corresponding to the definitions in 26.3.
  M.properties.set(wellKnownSymbols.toStringTag, Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
    Value: Value('Module'),
  }));
  // 12. Set module.[[Namespace]] to M.
  module.Namespace = M;
  // 13. Return M;
  return M;
}
