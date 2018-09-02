import {
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  ObjectCreate,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

function thisBooleanValue(value) {
  if (Type(value) === 'Boolean') {
    return value;
  }

  if (Type(value) === 'Object' && 'BooleanData' in value) {
    Assert(Type(value.BooleanData) === 'Boolean');
    return value.BooleanData;
  }

  return surroundingAgent.Throw('TypeError');
}

function BooleanProto_toString(argList, { thisValue }) {
  const b = Q(thisBooleanValue(thisValue));
  if (b.isTrue()) {
    return NewValue('true');
  }
  return NewValue('false');
}

function BooleanProto_valueOf(argList, { thisValue }) {
  return Q(thisBooleanValue(thisValue));
}

export function CreateBooleanPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);
  proto.BooleanData = NewValue(false);

  [
    ['toString', BooleanProto_toString],
    ['valueOf', BooleanProto_valueOf],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: false,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%BooleanPrototype%'] = proto;
}
