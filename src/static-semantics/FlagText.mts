/** https://tc39.es/ecma262/#sec-static-semantics-flagtext */
import type { RegularExpressionLiteralNode } from '../parser/Types.mjs';

//   RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function FlagText(RegularExpressionLiteral: RegularExpressionLiteralNode): string {
  return RegularExpressionLiteral.RegularExpressionFlags;
}
