import { surroundingAgent } from '../engine.mjs';
import {
  NumberValue, BigIntValue, BooleanValue, ObjectValue, Value, DataBlock, NullValue, SharedDataBlock,
} from '../value.mjs';
import {
  Q, X, NormalCompletion, ThrowCompletion, unused,
} from '../completion.mjs';
import { CastType, type Mutable } from '../helpers.mjs';
import {
  Assert, OrdinaryCreateFromConstructor,
  isNonNegativeInteger, CreateByteDataBlock,
  SameValue, CopyDataBlockBytes,
  typedArrayInfoByType,
  F,
  Z,
  type ConstructorObject,
} from './all.mjs';

export interface SharedArrayBufferObject extends ObjectValue {
  ArrayBufferData: SharedDataBlock | NullValue;
  ArrayBufferByteLength: number;
  readonly [Symbol.toStringTag]: 'SharedArrayBufferObject';
}
/** https://tc39.es/ecma262/#sec-arraybuffer-objects */
export interface ArrayBufferObject extends ObjectValue {
  ArrayBufferData: DataBlock | NullValue;
  ArrayBufferByteLength: number;
  readonly ArrayBufferDetachKey: Value;
  readonly [Symbol.toStringTag]: 'ArrayBufferObject';
}
/** https://tc39.es/ecma262/#sec-typedarray-objects */
export type TypedArrayElementType = 'Int8' | 'Uint8' | 'Uint8C' | 'Int16' | 'Uint16' | 'Int32' | 'Uint32' | 'BigInt64' | 'BigUint64' | 'Float32' | 'Float64';

/** https://tc39.es/ecma262/#sec-allocatearraybuffer */
export function AllocateArrayBuffer(constructor: ConstructorObject, byteLength: number): NormalCompletion<ArrayBufferObject> | ThrowCompletion {
  Assert(isNonNegativeInteger(byteLength));

  // 1. Let obj be ? OrdinaryCreateFromConstructor(constructor, "%ArrayBuffer.prototype%", « [[ArrayBufferData]], [[ArrayBufferByteLength]], [[ArrayBufferDetachKey]] »).
  const obj = Q(OrdinaryCreateFromConstructor(constructor, '%ArrayBuffer.prototype%', [
    'ArrayBufferData', 'ArrayBufferByteLength', 'ArrayBufferDetachKey',
  ])) as Mutable<ArrayBufferObject>;
  obj[Symbol.toStringTag] = 'ArrayBufferObject';
  // 2. Let block be ? CreateByteDataBlock(byteLength).
  const block = Q(CreateByteDataBlock(byteLength));
  // 3. Set obj.[[ArrayBufferData]] to block.
  obj.ArrayBufferData = block;
  // 4. Set obj.[[ArrayBufferByteLength]] to byteLength.
  obj.ArrayBufferByteLength = byteLength;
  // 5. Return obj.
  return obj;
}

/** https://tc39.es/ecma262/#sec-isdetachedbuffer */
export function IsDetachedBuffer(arrayBuffer: ArrayBufferObject | SharedArrayBufferObject): BooleanValue {
  // 1. Assert: Type(arrayBuffer) is Object and it has an [[ArrayBufferData]] internal slot.
  Assert(arrayBuffer instanceof ObjectValue && 'ArrayBufferData' in arrayBuffer);
  // 2. If arrayBuffer.[[ArrayBufferData]] is null, return true.
  if (arrayBuffer.ArrayBufferData === Value.null) {
    return Value.true;
  }
  // 3. Return false.
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-detacharraybuffer */
export function DetachArrayBuffer(arrayBuffer: ArrayBufferObject, key?: Value): NormalCompletion<void> | ThrowCompletion {
  // 1. Assert: IsSharedArrayBuffer(arrayBuffer) is false.
  Assert(IsSharedArrayBuffer(arrayBuffer) === Value.false);
  // 2. If key is not present, set key to undefined.
  if (key === undefined) {
    key = Value.undefined;
  }
  // 3. If arrayBuffer.[[ArrayBufferDetachKey]] is not key, throw a TypeError exception.
  if (SameValue(arrayBuffer.ArrayBufferDetachKey, key) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'BufferDetachKeyMismatch', key, arrayBuffer);
  }
  // 4. Set arrayBuffer.[[ArrayBufferData]] to null.
  arrayBuffer.ArrayBufferData = Value.null;
  // 5. Set arrayBuffer.[[ArrayBufferByteLength]] to 0.
  arrayBuffer.ArrayBufferByteLength = 0;
  // 6. Return unused.
}

/** https://tc39.es/ecma262/#sec-issharedarraybuffer */
export function IsSharedArrayBuffer(obj: ArrayBufferObject | SharedArrayBufferObject): BooleanValue {
  const bufferData = obj.ArrayBufferData;
  if (bufferData === Value.null) {
    return Value.false;
  }
  if (bufferData instanceof DataBlock) {
    return Value.false;
  }
  Assert(bufferData instanceof SharedDataBlock);
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-clonearraybuffer */
export function CloneArrayBuffer(srcBuffer: ArrayBufferObject | SharedArrayBufferObject, srcByteOffset: number, srcLength: number): NormalCompletion<ArrayBufferObject> | ThrowCompletion {
  Assert(IsDetachedBuffer(srcBuffer) === Value.false);
  const targetBuffer = Q(AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%') as ConstructorObject, srcLength));
  const srcBlock = srcBuffer.ArrayBufferData as DataBlock;
  const targetBlock = targetBuffer.ArrayBufferData as DataBlock;
  CopyDataBlockBytes(targetBlock, 0, srcBlock, srcByteOffset, srcLength);
  return targetBuffer;
}

/** https://tc39.es/ecma262/#sec-isbigintelementtype */
export function IsBigIntElementType(type: TypedArrayElementType): BooleanValue {
  // 1. If type is BigUint64 or BigInt64, return true.
  if (type === 'BigUint64' || type === 'BigInt64') {
    return Value.true;
  }
  // 2. Return false
  return Value.false;
}

const throwawayBuffer = new ArrayBuffer(8);
const throwawayDataView = new DataView(throwawayBuffer);
const throwawayArray = new Uint8Array(throwawayBuffer);

/** https://tc39.es/ecma262/#sec-rawbytestonumeric */
export function RawBytesToNumeric(type: TypedArrayElementType, rawBytes: number[], isLittleEndian: BooleanValue): NumberValue | BigIntValue {
  // 1. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  Assert(elementSize === rawBytes.length);
  const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
  Object.assign(throwawayArray, rawBytes);
  const result = throwawayDataView[`get${dataViewType}`](0, isLittleEndian === Value.true);
  return IsBigIntElementType(type) === Value.true ? Z(result as bigint) : F(result as number);
}

/** https://tc39.es/ecma262/#sec-getvaluefrombuffer */
export function GetValueFromBuffer(arrayBuffer: ArrayBufferObject | SharedArrayBufferObject, byteIndex: number, type: TypedArrayElementType, _isTypedArray: BooleanValue, _order: 'SeqCst' | 'Unordered', isLittleEndian?: BooleanValue): NumberValue | BigIntValue {
  Assert(isNonNegativeInteger(byteIndex));

  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(IsDetachedBuffer(arrayBuffer) === Value.false);
  CastType<DataBlock>(arrayBuffer.ArrayBufferData);
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData;
  // 4. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  let rawValue;
  // 5. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
    // TODO(SharedArrayBuffer): Implement this
    Assert(false, 'SharedArrayBuffer not implemented');
  } else {
    // 6. Else, let rawValue be a List of elementSize containing, in order, the elementSize sequence of bytes starting with block[byteIndex].
    rawValue = [...block.subarray(byteIndex, byteIndex + elementSize)];
  }
  // 7. Assert: The number of elements in rawValue is elementSize.
  Assert(rawValue.length === elementSize);
  // 7. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.AgentRecord.LittleEndian;
  }
  // 8. Return RawBytesToNumeric(type, rawValue, isLittleEndian).
  return RawBytesToNumeric(type, rawValue, isLittleEndian);
}

const float32NaNLE = Object.freeze([0, 0, 192, 127]);
const float32NaNBE = Object.freeze([127, 192, 0, 0]);
const float64NaNLE = Object.freeze([0, 0, 0, 0, 0, 0, 248, 127]);
const float64NaNBE = Object.freeze([127, 248, 0, 0, 0, 0, 0, 0]);

/** https://tc39.es/ecma262/#sec-numerictorawbytes */
export function NumericToRawBytes(type: TypedArrayElementType, value: NumberValue | BigIntValue, isLittleEndian: BooleanValue): number[] {
  Assert(isLittleEndian instanceof BooleanValue);
  const isLittleEndianB = isLittleEndian === Value.true;
  let rawBytes;
  // One day, we will write our own IEEE 754 and two's complement encoder…
  if (type === 'Float32') {
    CastType<NumberValue>(value);
    if (Number.isNaN(value.numberValue())) {
      rawBytes = isLittleEndianB ? [...float32NaNLE] : [...float32NaNBE];
    } else {
      throwawayDataView.setFloat32(0, value.numberValue(), isLittleEndianB);
      rawBytes = [...throwawayArray.subarray(0, 4)];
    }
  } else if (type === 'Float64') {
    CastType<NumberValue>(value);
    if (Number.isNaN(value.numberValue())) {
      rawBytes = isLittleEndianB ? [...float64NaNLE] : [...float64NaNBE];
    } else {
      throwawayDataView.setFloat64(0, value.numberValue(), isLittleEndianB);
      rawBytes = [...throwawayArray.subarray(0, 8)];
    }
  } else {
    // a. Let n be the Element Size value specified in Table 61 for Element Type type.
    const n = typedArrayInfoByType[type].ElementSize;
    // b. Let convOp be the abstract operation named in the Conversion Operation column in Table 61 for Element Type type.
    const convOp = typedArrayInfoByType[type].ConversionOperation;
    // c. Let intValue be convOp(value) treated as a mathematical value, whether the result is a BigInt or Number.
    const intValue = X(convOp(value));
    const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
    throwawayDataView[`set${dataViewType}`](0, (intValue instanceof BigIntValue ? intValue.bigintValue() : intValue.numberValue()) as never, isLittleEndianB);
    rawBytes = [...throwawayArray.subarray(0, n)];
  }
  return rawBytes;
}

/** https://tc39.es/ecma262/#sec-setvalueinbuffer */
export function SetValueInBuffer(arrayBuffer: ArrayBufferObject | SharedArrayBufferObject, byteIndex: number, type: TypedArrayElementType, value: NumberValue | BigIntValue, _isTypedArray: BooleanValue, _order: 'SeqCst' | 'Unordered' | 'Init', isLittleEndian?: BooleanValue): unused {
  Assert(isNonNegativeInteger(byteIndex));

  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(IsDetachedBuffer(arrayBuffer) === Value.false);
  CastType<DataBlock>(arrayBuffer.ArrayBufferData);
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Assert: value is a BigInt if IsBigIntElementType(type) is true; otherwise, value is a Number.
  if (IsBigIntElementType(type) === Value.true) {
    Assert(value instanceof BigIntValue);
  } else {
    Assert(value instanceof NumberValue);
  }
  // 4. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData;
  // 5. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  // const elementSize = typedArrayInfo[type].ElementSize;
  // 6. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.AgentRecord.LittleEndian;
  }
  // 7. Let rawBytes be NumericToRawBytes(type, value, isLittleEndian).
  const rawBytes = NumericToRawBytes(type, value, isLittleEndian);
  // 8. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
    // TODO(SharedArrayBuffer): Implement this
    Assert(false, 'SharedArrayBuffer not implemented');
  } else {
    // 9. Else, store the individual bytes of rawBytes into block, in order, starting at block[byteIndex].
    rawBytes.forEach((byte, i) => {
      block[byteIndex + i] = byte;
    });
  }
  // 11. Return unused.
  return unused;
}
