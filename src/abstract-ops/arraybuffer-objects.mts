import { surroundingAgent } from '../engine.mjs';
import {
  NumberValue, BigIntValue, BooleanValue, ObjectValue, Value, DataBlock, NullValue,
} from '../value.mjs';
import {
  Q, X, NormalCompletion, ThrowCompletion, unused,
} from '../completion.mjs';
import { CastType, type Mutable } from '../helpers.mjs';
import {
  Assert, OrdinaryCreateFromConstructor,
  isNonNegativeInteger, CreateByteDataBlock,
  SameValue, IsConstructor, CopyDataBlockBytes,
  typedArrayInfoByType,
  F,
  Z,
  type ConstructorObject,
} from './all.mjs';

/** https://tc39.es/ecma262/#sec-arraybuffer-objects */
export interface ArrayBufferObject extends ObjectValue {
  ArrayBufferData: DataBlock | NullValue;
  ArrayBufferByteLength: number;
  readonly ArrayBufferDetachKey?: Value;
  [Symbol.toStringTag]?: 'ArrayBufferObject';
}
/** https://tc39.es/ecma262/#sec-typedarray-objects */
export type TypedArrayElementType = 'Int8' | 'Uint8' | 'Uint8C' | 'Int16' | 'Uint16' | 'Int32' | 'Uint32' | 'BigInt64' | 'BigUint64' | 'Float32' | 'Float64';

/** https://tc39.es/ecma262/#sec-allocatearraybuffer */
export function AllocateArrayBuffer(constructor: ConstructorObject, byteLength: number): NormalCompletion<ArrayBufferObject> | ThrowCompletion {
  // 1. Let obj be ? OrdinaryCreateFromConstructor(constructor, "%ArrayBuffer.prototype%", « [[ArrayBufferData]], [[ArrayBufferByteLength]], [[ArrayBufferDetachKey]] »).
  const obj = Q(OrdinaryCreateFromConstructor(constructor, '%ArrayBuffer.prototype%', [
    'ArrayBufferData', 'ArrayBufferByteLength', 'ArrayBufferDetachKey',
  ])) as Mutable<ArrayBufferObject>;
  obj[Symbol.toStringTag] = 'ArrayBufferObject';
  // 2. Assert: byteLength is a non-negative integer.
  Assert(isNonNegativeInteger(byteLength));
  // 3. Let block be ? CreateByteDataBlock(byteLength).
  const block = Q(CreateByteDataBlock(byteLength));
  // 4. Set obj.[[ArrayBufferData]] to block.
  obj.ArrayBufferData = block;
  // 5. Set obj.[[ArrayBufferByteLength]] to byteLength.
  obj.ArrayBufferByteLength = byteLength;
  // 6. Return obj.
  return obj;
}

/** https://tc39.es/ecma262/#sec-isdetachedbuffer */
export function IsDetachedBuffer(arrayBuffer: ArrayBufferObject): BooleanValue {
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
export function DetachArrayBuffer(arrayBuffer: ArrayBufferObject, key?: Value): unused | ThrowCompletion {
  // 1. Assert: Type(arrayBuffer) is Object and it has [[ArrayBufferData]], [[ArrayBufferByteLength]], and [[ArrayBufferDetachKey]] internal slots.
  Assert(arrayBuffer instanceof ObjectValue
         && 'ArrayBufferData' in arrayBuffer
         && 'ArrayBufferByteLength' in arrayBuffer
         && 'ArrayBufferDetachKey' in arrayBuffer);
  // 2. Assert: IsSharedArrayBuffer(arrayBuffer) is false.
  Assert(IsSharedArrayBuffer(arrayBuffer) === Value.false);
  // 3. If key is not present, set key to undefined.
  if (key === undefined) {
    key = Value.undefined;
  }
  // 4. If SameValue(arrayBuffer.[[ArrayBufferDetachKey]], key) is false, throw a TypeError exception.
  if (SameValue(arrayBuffer.ArrayBufferDetachKey, key) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'BufferDetachKeyMismatch', key, arrayBuffer);
  }
  // 5. Set arrayBuffer.[[ArrayBufferData]] to null.
  arrayBuffer.ArrayBufferData = Value.null;
  // 6. Set arrayBuffer.[[ArrayBufferByteLength]] to 0.
  arrayBuffer.ArrayBufferByteLength = 0;
  // 7. Return unused.
  return unused;
}

/** https://tc39.es/ecma262/#sec-issharedarraybuffer */
export function IsSharedArrayBuffer(_obj: ArrayBufferObject): BooleanValue {
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-clonearraybuffer */
export function CloneArrayBuffer(srcBuffer: ArrayBufferObject, srcByteOffset: number, srcLength: number, cloneConstructor: ConstructorObject): NormalCompletion<ArrayBufferObject> | ThrowCompletion {
  // 1. Assert: Type(srcBuffer) is Object and it has an [[ArrayBufferData]] internal slot.
  Assert(srcBuffer instanceof ObjectValue && 'ArrayBufferData' in srcBuffer);
  // 2. Assert: IsConstructor(cloneConstructor) is true.
  Assert(IsConstructor(cloneConstructor) === Value.true);
  // 3. Let targetBuffer be ? AllocateArrayBuffer(cloneConstructor, srcLength).
  const targetBuffer = Q(AllocateArrayBuffer(cloneConstructor, srcLength));
  CastType<DataBlock>(targetBuffer.ArrayBufferData); // newly created
  // 4. If IsDetachedBuffer(srcBuffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(srcBuffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  CastType<DataBlock>(srcBuffer.ArrayBufferData);
  // 5. Let srcBlock be srcBuffer.[[ArrayBufferData]].
  const srcBlock = srcBuffer.ArrayBufferData;
  // 6. Let targetBlock be targetBuffer.[[ArrayBufferData]].
  const targetBlock = targetBuffer.ArrayBufferData;
  // 7. Perform CopyDataBlockBytes(targetBlock, 0, srcBlock, srcByteOffset, srcLength).
  CopyDataBlockBytes(targetBlock, 0, srcBlock, srcByteOffset, srcLength);
  // 8. Return targetBuffer.
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
export function GetValueFromBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayElementType, isTypedArray: BooleanValue, order: 'SeqCst' | 'Unordered', isLittleEndian?: BooleanValue): NumberValue | BigIntValue {
  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(IsDetachedBuffer(arrayBuffer) === Value.false);
  CastType<DataBlock>(arrayBuffer.ArrayBufferData);
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Assert: byteIndex is a non-negative integer.
  Assert(isNonNegativeInteger(byteIndex));
  // 4. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData;
  // 5. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 6. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
    Assert(false);
  }
  // 7. Else, let rawValue be a List of elementSize containing, in order, the elementSize sequence of bytes starting with block[byteIndex].
  const rawValue = [...block.subarray(byteIndex, byteIndex + elementSize)];
  // 8. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.AgentRecord.LittleEndian;
  }
  // 9. Return RawBytesToNumeric(type, rawValue, isLittleEndian).
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
    // NON-SPEC assert
    Assert(value instanceof NumberValue);
    if (Number.isNaN(value.numberValue())) {
      rawBytes = isLittleEndianB ? [...float32NaNLE] : [...float32NaNBE];
    } else {
      throwawayDataView.setFloat32(0, value.numberValue(), isLittleEndianB);
      rawBytes = [...throwawayArray.subarray(0, 4)];
    }
  } else if (type === 'Float64') {
    // NON-SPEC assert
    Assert(value instanceof NumberValue);
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
    throwawayDataView[`set${dataViewType}`](0, intValue instanceof BigIntValue ? intValue.bigintValue() : intValue.numberValue(), isLittleEndianB);
    rawBytes = [...throwawayArray.subarray(0, n)];
  }
  return rawBytes;
}

/** https://tc39.es/ecma262/#sec-setvalueinbuffer */
export function SetValueInBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayElementType, value: NumberValue | BigIntValue, isTypedArray: BooleanValue, order: 'SeqCst' | 'Unordered' | 'Init', isLittleEndian?: BooleanValue): unused {
  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(IsDetachedBuffer(arrayBuffer) === Value.false);
  CastType<DataBlock>(arrayBuffer.ArrayBufferData);
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Assert: byteIndex is a non-negative integer.
  Assert(isNonNegativeInteger(byteIndex));
  // 4. Assert: Type(value) is BigInt if ! IsBigIntElementType(type) is true; otherwise, Type(value) is Number.
  if (X(IsBigIntElementType(type)) === Value.true) {
    Assert(value instanceof BigIntValue);
  } else {
    Assert(value instanceof NumberValue);
  }
  // 5. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData;
  // 6. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  // const elementSize = typedArrayInfo[type].ElementSize;
  // 7. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.AgentRecord.LittleEndian;
  }
  // 8. Let rawBytes be NumericToRawBytes(type, value, isLittleEndian).
  const rawBytes = NumericToRawBytes(type, value, isLittleEndian);
  // 9. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
    Assert(false);
  }
  // 10. Else, store the individual bytes of rawBytes into block, in order, starting at block[byteIndex].
  rawBytes.forEach((byte, i) => {
    block[byteIndex + i] = byte;
  });
  // 11. Return unused.
  return unused;
}
