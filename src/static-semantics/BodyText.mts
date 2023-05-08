/** https://tc39.es/ecma262/#sec-static-semantics-bodytext */
import type { RegularExpressionLiteralNode } from '../parser/Types.mjs';

//  RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function BodyText(RegularExpressionLiteral: RegularExpressionLiteralNode): string {
  return RegularExpressionLiteral.RegularExpressionBody;
}
