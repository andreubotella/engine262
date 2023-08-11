import { isArray } from '../helpers.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import type { JSStringValue } from '../value.mjs';
import { BoundNames } from './all.mjs';

export function TopLevelLexicallyDeclaredNames(node: ParseNode | readonly ParseNode[]): JSStringValue[] {
  if (isArray(node)) {
    const names = [];
    for (const StatementListItem of node) {
      names.push(...TopLevelLexicallyDeclaredNames(StatementListItem));
    }
    return names;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return BoundNames(node);
    default:
      return [];
  }
}
