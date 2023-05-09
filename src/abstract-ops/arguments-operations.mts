import { surroundingAgent } from '../engine.mjs';
import {
  Descriptor,
  Value,
  wellKnownSymbols,
  type PropertyKeyValue,
  ObjectValue,
  JSStringValue,
  type WithPrototype,
  type WithExtensible,
  type OrdinaryObject,
  type UndefinedValue,
  type BooleanValue,
} from '../value.mjs';
import { BoundNames } from '../static-semantics/all.mjs';
import {
  NormalCompletion, Q, ThrowCompletion, X,
} from '../completion.mjs';
import { ValueSet, type Mutable } from '../helpers.mjs';
import type { EnvironmentRecord } from '../environment.mjs';
import type { ParseNode } from '../parser/Types.mjs';
import {
  CreateBuiltinFunction,
  CreateDataProperty,
  DefinePropertyOrThrow,
  ToString,
  SameValue,
  MakeBasicObject,
  OrdinaryObjectCreate,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryGet,
  OrdinarySet,
  OrdinaryDelete,
  Get,
  Set,
  HasOwnProperty,
  IsAccessorDescriptor,
  IsDataDescriptor,
  F,
  type FunctionObject,
  type NativeFunction,
} from './all.mjs';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-arguments-exotic-objects */
export interface ArgumentsExoticObject extends ObjectValue, WithPrototype, WithExtensible {
  readonly ParameterMap: ObjectValue;
  readonly [Symbol.toStringTag]: 'ArgumentsExoticObject';
}
export interface UnmappedArgumentsObject extends OrdinaryObject {
  readonly ParameterMap: UndefinedValue;
  readonly [Symbol.toStringTag]: 'UnmappedArgumentsObject';
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects-getownproperty-p */
function ArgumentsGetOwnProperty(this: ArgumentsExoticObject, P: PropertyKeyValue): NormalCompletion<Descriptor | UndefinedValue> {
  const args = this;
  const desc = OrdinaryGetOwnProperty(args, P);
  if (desc === Value.undefined) {
    return desc;
  }
  const map = args.ParameterMap;
  const isMapped = X(HasOwnProperty(map, P));
  if (isMapped === Value.true) {
    desc.Value = X(Get(map, P));
  }
  return desc;
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects-defineownproperty-p-desc */
function ArgumentsDefineOwnProperty(this: ArgumentsExoticObject, P: PropertyKeyValue, Desc: Descriptor): NormalCompletion<BooleanValue> {
  const args = this;
  const map = args.ParameterMap;
  const isMapped = X(HasOwnProperty(map, P));
  let newArgDesc = Desc;
  if (isMapped === Value.true && IsDataDescriptor(Desc) === true) {
    if (Desc.Value === undefined && Desc.Writable !== undefined && Desc.Writable === Value.false) {
      newArgDesc = Descriptor({ ...Desc });
      newArgDesc.Value = X(Get(map, P));
    }
  }
  const allowed = X(OrdinaryDefineOwnProperty(args, P, newArgDesc));
  if (allowed === Value.false) {
    return Value.false;
  }
  if (isMapped === Value.true) {
    if (IsAccessorDescriptor(Desc) === true) {
      X(map.Delete(P));
    } else {
      if (Desc.Value !== undefined) {
        X(Set(map, P, Desc.Value, Value.false));
      }
      if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
        // Assert: The following Set will succeed, since formal parameters mapped by arguments objects are always writable.
        X(map.Delete(P));
      }
    }
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects-get-p-receiver */
function ArgumentsGet(this: ArgumentsExoticObject, P: PropertyKeyValue, Receiver: Value): NormalCompletion | ThrowCompletion {
  const args = this;
  const map = args.ParameterMap;
  const isMapped = X(HasOwnProperty(map, P));
  if (isMapped === Value.false) {
    return Q(OrdinaryGet(args, P, Receiver));
  } else {
    // Assert: map contains a formal parameter mapping for P.
    return Get(map, P);
  }
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects-set-p-v-receiver */
function ArgumentsSet(this: ArgumentsExoticObject, P: PropertyKeyValue, V: Value, Receiver: Value): NormalCompletion<BooleanValue> | ThrowCompletion {
  const args = this;
  let isMapped: BooleanValue;
  let map: ObjectValue;
  if (SameValue(args, Receiver) === Value.false) {
    isMapped = Value.false;
  } else {
    map = args.ParameterMap;
    isMapped = X(HasOwnProperty(map, P));
  }
  if (isMapped === Value.true) {
    // Assert: The following Set will succeed, since formal parameters mapped by arguments objects are always writable.
    X(Set(map!, P, V, Value.false));
  }
  return Q(OrdinarySet(args, P, V, Receiver));
}

/** https://tc39.es/ecma262/#sec-arguments-exotic-objects-delete-p */
function ArgumentsDelete(this: ArgumentsExoticObject, P: PropertyKeyValue): NormalCompletion<BooleanValue> | ThrowCompletion {
  const args = this;
  const map = args.ParameterMap;
  const isMapped = X(HasOwnProperty(map, P));
  const result = Q(OrdinaryDelete(args, P));
  if (result === Value.true && isMapped === Value.true) {
    X(map.Delete(P));
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-createunmappedargumentsobject */
export function CreateUnmappedArgumentsObject(argumentsList: readonly Value[]): OrdinaryObject {
  const len = argumentsList.length;
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%') as ObjectValue, ['ParameterMap']) as Mutable<UnmappedArgumentsObject>;
  obj[Symbol.toStringTag] = 'UnmappedArgumentsObject';
  obj.ParameterMap = Value.undefined;
  X(DefinePropertyOrThrow(obj, Value('length'), Descriptor({
    Value: F(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    X(CreateDataProperty(obj, X(ToString(F(index))), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, Descriptor({
    Value: surroundingAgent.intrinsic('%Array.prototype.values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, Value('callee'), Descriptor({
    Get: surroundingAgent.intrinsic('%ThrowTypeError%') as FunctionObject,
    Set: surroundingAgent.intrinsic('%ThrowTypeError%') as FunctionObject,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

/** https://tc39.es/ecma262/#sec-makearggetter */
function MakeArgGetter(name: JSStringValue, env: EnvironmentRecord): FunctionObject {
  // 1. Let getterClosure be a new Abstract Closure with no parameters that captures name and env and performs the following steps when called:
  //   a. Return env.GetBindingValue(name, false).
  const getterClosure: NativeFunction = () => env.GetBindingValue(name, Value.false);
  // 2. Let getter be ! CreateBuiltinFunction(getterClosure, 0, "", « »).
  const getter = X(CreateBuiltinFunction(getterClosure, 0, Value(''), ['Name', 'Env']));
  // 3. NOTE: getter is never directly accessible to ECMAScript code.
  // 4. Return getter.
  return getter;
}

/** https://tc39.es/ecma262/#sec-makeargsetter */
function MakeArgSetter(name: JSStringValue, env: EnvironmentRecord): FunctionObject {
  // 1. Let setterClosure be a new Abstract Closure with parameters (value) that captures name and env and performs the following steps when called:
  //   a. Return ! env.SetMutableBinding(name, value, false).
  const setterClosure: NativeFunction = ([value = Value.undefined]) => {
    X(env.SetMutableBinding(name, value, Value.false));
    return Value.undefined;
  };
  // 2. Let setter be ! CreateBuiltinFunction(setterClosure, 1, "", « »).
  const setter = X(CreateBuiltinFunction(setterClosure, 1, Value(''), []));
  // 3. NOTE: setter is never directly accessible to ECMAScript code.
  // 4. Return setter.
  return setter;
}

/** https://tc39.es/ecma262/#sec-createmappedargumentsobject */
export function CreateMappedArgumentsObject(func: ObjectValue, formals: ParseNode, argumentsList: readonly Value[], env: EnvironmentRecord): ArgumentsExoticObject {
  // Assert: formals does not contain a rest parameter, any binding
  // patterns, or any initializers. It may contain duplicate identifiers.
  const len = argumentsList.length;
  const obj = X(MakeBasicObject(['Prototype', 'Extensible', 'ParameterMap'])) as Mutable<ArgumentsExoticObject>;
  obj[Symbol.toStringTag] = 'ArgumentsExoticObject';
  obj.GetOwnProperty = ArgumentsGetOwnProperty;
  obj.DefineOwnProperty = ArgumentsDefineOwnProperty;
  obj.Get = ArgumentsGet;
  obj.Set = ArgumentsSet;
  obj.Delete = ArgumentsDelete;
  obj.Prototype = surroundingAgent.intrinsic('%Object.prototype%') as ObjectValue;
  const map = OrdinaryObjectCreate(Value.null);
  obj.ParameterMap = map;
  const parameterNames = BoundNames(formals);
  const numberOfParameters = parameterNames.length;
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    X(CreateDataProperty(obj, X(ToString(F(index))), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, Value('length'), Descriptor({
    Value: F(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  const mappedNames = new ValueSet<JSStringValue>();
  index = numberOfParameters - 1;
  while (index >= 0) {
    const name = parameterNames[index];
    if (!mappedNames.has(name)) {
      mappedNames.add(name);
      if (index < len) {
        const g = MakeArgGetter(name, env);
        const p = MakeArgSetter(name, env);
        X(map.DefineOwnProperty(X(ToString(F(index))), Descriptor({
          Set: p,
          Get: g,
          Enumerable: Value.false,
          Configurable: Value.true,
        })));
      }
    }
    index -= 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, Descriptor({
    Value: surroundingAgent.intrinsic('%Array.prototype.values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, Value('callee'), Descriptor({
    Value: func,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  return obj;
}
