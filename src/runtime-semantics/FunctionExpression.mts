// @ts-nocheck
import type { ParseNode } from '../parser/ParseNode.mjs';
import { InstantiateOrdinaryFunctionExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation */
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
export function Evaluate_FunctionExpression(FunctionExpression: ParseNode.FunctionExpression) {
  // 1. Return InstantiateOrdinaryFunctionExpression of FunctionExpression.
  return InstantiateOrdinaryFunctionExpression(FunctionExpression);
}
