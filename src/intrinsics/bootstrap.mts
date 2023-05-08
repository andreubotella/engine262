import {
  Assert,
  CreateBuiltinFunction,
  OrdinaryObjectCreate,
  Realm,
  type NativeFunction,
  type FunctionObject,
  type BuiltinFunctionObject,
  type NativeConstructor,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  ObjectValue,
  Value,
  wellKnownSymbols,
  type DescriptorInit,
  type PropertyKeyValue,
  UndefinedValue,
  NullValue,
  type OrdinaryObject,
} from '../value.mjs';
import { X } from '../completion.mjs';
import { isArray } from '../helpers.mjs';

export type AssignedProp = readonly [
  name: string | PropertyKeyValue,
  impl: NativeFunction | NativeConstructor | Value | readonly [
    getter: NativeFunction | NativeConstructor | FunctionObject | UndefinedValue,
    setter: NativeFunction | NativeConstructor | FunctionObject | UndefinedValue
  ],
  length?: number,
  descriptor?: Partial<DescriptorInit>
];

/** https://tc39.es/ecma262/#sec-ecmascript-standard-built-in-objects */
export function assignProps(realmRec: Realm, obj: ObjectValue, props: readonly AssignedProp[]): void {
  for (const item of props) {
    if (item === undefined) {
      continue;
    }
    const [n, v, len, descriptor] = item;
    const name = n instanceof Value ? n : Value(n);
    if (isArray(v)) {
      // Every accessor property described in clauses 18 through 26 and in
      // Annex B.2 has the attributes { [[Enumerable]]: false,
      // [[Configurable]]: true } unless otherwise specified. If only a get
      // accessor function is described, the set accessor function is the
      // default value, undefined. If only a set accessor is described the get
      // accessor is the default value, undefined.
      let [
        getter = Value.undefined,
        setter = Value.undefined,
      ] = v;
      if (typeof getter === 'function') {
        getter = CreateBuiltinFunction(
          getter as NativeFunction,
          0,
          name,
          [],
          realmRec,
          undefined,
          Value('get'),
        );
      }
      if (typeof setter === 'function') {
        setter = CreateBuiltinFunction(
          setter as NativeFunction,
          1,
          name,
          [],
          realmRec,
          undefined,
          Value('set'),
        );
      }
      X(obj.DefineOwnProperty(name, Descriptor({
        Get: getter,
        Set: setter,
        Enumerable: Value.false,
        Configurable: Value.true,
        ...descriptor,
      })));
    } else {
      // Every other data property described in clauses 18 through 26 and in
      // Annex B.2 has the attributes { [[Writable]]: true, [[Enumerable]]:
      // false, [[Configurable]]: true } unless otherwise specified.
      let value: Value;
      if (typeof v === 'function') {
        Assert(typeof len === 'number');
        value = CreateBuiltinFunction(v as NativeConstructor | NativeFunction, len, name, [], realmRec);
      } else {
        value = v;
      }
      obj.properties.set(name, Descriptor({
        Value: value,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
        ...descriptor,
      }));
    }
  }
}

export function bootstrapPrototype(realmRec: Realm, props: readonly AssignedProp[], Prototype: ObjectValue | NullValue, stringTag: string): OrdinaryObject {
  Assert(Prototype !== undefined);
  const proto = OrdinaryObjectCreate(Prototype);

  assignProps(realmRec, proto, props);

  if (stringTag !== undefined) {
    X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
      Value: Value(stringTag),
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  return proto;
}

export function bootstrapConstructor(realmRec: Realm, Constructor: NativeConstructor, name: string, length: number, Prototype: ObjectValue, props: readonly AssignedProp[] = []): BuiltinFunctionObject {
  const cons = CreateBuiltinFunction(
    Constructor,
    length,
    Value(name),
    [],
    realmRec,
    undefined,
    undefined,
    Value.true,
  );

  X(cons.DefineOwnProperty(Value('prototype'), Descriptor({
    Value: Prototype,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X(Prototype.DefineOwnProperty(Value('constructor'), Descriptor({
    Value: cons,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  assignProps(realmRec, cons, props);

  return cons;
}
