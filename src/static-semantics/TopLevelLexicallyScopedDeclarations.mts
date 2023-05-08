import { isArray } from '../helpers.mjs';

export function TopLevelLexicallyScopedDeclarations(node) {
  if (isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...TopLevelLexicallyScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return [node];
    default:
      return [];
  }
}
