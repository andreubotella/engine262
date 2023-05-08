import { JSStringValue, UndefinedValue, Value } from '../value.mjs';
import { X } from '../completion.mjs';
import { CanonicalNumericIndexString } from './all.mjs';

// This file covers predicates defined in
/** https://tc39.es/ecma262/#sec-ecmascript-data-types-and-values */

// 6.1.7 #integer-index
export function isIntegerIndex(V: Value) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric instanceof UndefinedValue) {
    return false;
  }
  if (Object.is(numeric.numberValue(), +0)) {
    return true;
  }
  return numeric.numberValue() > 0 && Number.isSafeInteger(numeric.numberValue());
}

// 6.1.7 #array-index
export function isArrayIndex(V: Value) {
  if (!(V instanceof JSStringValue)) {
    return false;
  }
  const numeric = X(CanonicalNumericIndexString(V));
  if (numeric instanceof UndefinedValue) {
    return false;
  }
  if (!Number.isInteger(numeric.numberValue())) {
    return false;
  }
  if (Object.is(numeric.numberValue(), +0)) {
    return true;
  }
  return numeric.numberValue() > 0 && numeric.numberValue() < (2 ** 32) - 1;
}

export function isNonNegativeInteger(argument: unknown) {
  return Number.isInteger(argument) && (argument as number) >= 0;
}
