import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-static-semantics-isstatic */
// ClassElement :
//   MethodDefinition
//   `static` MethodDefinition
//   `;`
export function IsStatic(ClassElement: ParseNode.ClassElement) {
  return ClassElement.static;
}
