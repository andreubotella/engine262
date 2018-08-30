import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToInt32, ToUint32 } from '../abstract-ops/all.mjs';
import { New as NewValue } from '../value.mjs';

/* eslint-disable no-bitwise */

// ShiftExpression :
//   ShiftExpression << AdditiveExpression
//   ShiftExpression >> AdditiveExpression
//   ShiftExpression >>> AdditiveExpression
export function Evaluate_ShiftExpression({
  left: ShiftExpression,
  operator,
  right: AdditiveExpression,
}) {
  switch (operator) {
    case '<<': {
      const lref = Evaluate(ShiftExpression);
      const lval = Q(GetValue(lref));
      const rref = Evaluate(AdditiveExpression);
      const rval = Q(GetValue(rref));
      const lnum = Q(ToInt32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() << shiftCount);
    }

    case '>>': {
      const lref = Evaluate(ShiftExpression);
      const lval = Q(GetValue(lref));
      const rref = Evaluate(AdditiveExpression);
      const rval = Q(GetValue(rref));
      const lnum = Q(ToInt32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() >> shiftCount);
    }

    case '>>>': {
      const lref = Evaluate(ShiftExpression);
      const lval = Q(GetValue(lref));
      const rref = Evaluate(AdditiveExpression);
      const rval = Q(GetValue(rref));
      const lnum = Q(ToUint32(lval));
      const rnum = Q(ToUint32(rval));
      const shiftCount = rnum.numberValue() & 0x1F;
      return NewValue(lnum.numberValue() >>> shiftCount);
    }

    default:
      throw new RangeError(operator);
  }
}