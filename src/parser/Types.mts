export type ParseNode =
    | FunctionBodyNode
    | ExpressionBodyNode
    | RegularExpressionLiteralNode
    | BindingIdentifierNode
    | LexicalDeclarationNode
    | LexicalBindingNode
    | VariableStatementNode
    | VariableDeclarationNode
    | ForDeclarationNode
    | ForBindingNode
    | FunctionDeclarationNode
    | GeneratorDeclarationNode
    | AsyncFunctionDeclarationNode
    | AsyncGeneratorDeclarationNode
    | ClassDeclarationNode
    | ImportSpecifierNode
    | ExportDeclarationNode
    | SingleNameBindingNode
    | BindingElementNode
    | BindingRestElementNode
    | ArrayBindingPatternNode
    | ObjectBindingPatternNode
    | BindingPropertyNode
    | BindingRestPropertyNode
    | CharacterEscapeNode
    | RegExpUnicodeEscapeSequenceNode
    | ClassAtomNode

export interface ClassEscapeNode extends ParseNodeBase {
    readonly CharacterEscape: CharacterEscapeNode
    readonly value: string
    readonly type: 'ClassEscape'
}

export interface ParseNodeBase {}
export interface RegularExpressionLiteralNode extends ParseNodeBase {
    readonly RegularExpressionFlags: string
    readonly RegularExpressionBody: string
    readonly type: 'RegularExpressionLiteral'
}
export interface FunctionBodyNode extends ParseNodeBase {
    readonly type: 'FunctionBody'
}
export interface ExpressionBodyNode extends ParseNodeBase {
    readonly type: 'ExpressionBody'
}

export interface BindingIdentifierNode extends ParseNodeBase {
    readonly type: 'BindingIdentifier'
}

export interface LexicalDeclarationNode extends ParseNodeBase {
    readonly BindingList: ParseNode[]
    readonly type: 'LexicalDeclaration'
}

export interface LexicalBindingNode extends ParseNodeBase {
    readonly BindingIdentifier: ParseNode
    readonly BindingPattern: ParseNode
    readonly type: 'LexicalBinding'
}

export interface VariableStatementNode extends ParseNodeBase {
    readonly VariableDeclarationList: ParseNode[]
    readonly type: 'VariableStatement'
}

export interface VariableDeclarationNode extends ParseNodeBase {
    readonly BindingIdentifier: ParseNode
    readonly BindingPattern: ParseNode
    readonly type: 'VariableDeclaration'
}

export interface ForDeclarationNode extends ParseNodeBase {
    readonly ForBinding: ParseNode
    readonly type: 'ForDeclaration'
}

export interface ForBindingNode extends ParseNodeBase {
    readonly BindingIdentifier: ParseNode
    readonly BindingPattern: ParseNode
    readonly type: 'ForBinding'
}

export interface FunctionDeclarationNode extends ParseNodeBase {
    readonly type: 'FunctionDeclaration'
    readonly BindingIdentifier: ParseNode
}

export interface GeneratorDeclarationNode extends ParseNodeBase {
    readonly type: 'GeneratorDeclaration'
    readonly BindingIdentifier: ParseNode
}

export interface AsyncFunctionDeclarationNode extends ParseNodeBase {
    readonly type: 'AsyncFunctionDeclaration'
    readonly BindingIdentifier: ParseNode
}

export interface AsyncGeneratorDeclarationNode extends ParseNodeBase {
    readonly type: 'AsyncGeneratorDeclaration'
    readonly BindingIdentifier: ParseNode
}

export interface ClassDeclarationNode extends ParseNodeBase {
    readonly type: 'ClassDeclaration'
    readonly BindingIdentifier: ParseNode
}

export interface ImportSpecifierNode extends ParseNodeBase {
    readonly ImportedBinding: ParseNode
    readonly type: 'ImportSpecifier'
}

export interface ExportDeclarationNode extends ParseNodeBase {
    readonly FromClause: ParseNode
    readonly NamedExports: ParseNode
    readonly VariableStatement: ParseNode
    readonly Declaration: ParseNode
    readonly HoistableDeclaration: ParseNode
    readonly ClassDeclaration: ParseNode
    readonly AssignmentExpression: ParseNode
    readonly type: 'ExportDeclaration'
}

export interface SingleNameBindingNode extends ParseNodeBase {
    readonly BindingIdentifier: ParseNode
    readonly type: 'SingleNameBinding'
}

export interface BindingRestElementNode extends ParseNodeBase {
    readonly BindingIdentifier: ParseNode
    readonly BindingPattern: ParseNode
    readonly type: 'BindingRestElement'
}

export interface BindingRestPropertyNode extends ParseNodeBase {
    readonly type: 'BindingRestProperty'
    readonly BindingIdentifier: ParseNode
}
export interface BindingElementNode extends ParseNodeBase {
    readonly BindingPattern: ParseNode
    readonly type: 'BindingElement'
}

export interface BindingPropertyNode extends ParseNodeBase {
    readonly BindingElement: ParseNode
    readonly type: 'BindingProperty'
}

export interface ObjectBindingPatternNode extends ParseNodeBase {
    readonly BindingPropertyList: ParseNode
    readonly BindingRestProperty: ParseNode
    readonly type: 'ObjectBindingPattern'
}

export interface ArrayBindingPatternNode extends ParseNodeBase {
    readonly BindingElementList: ParseNode
    readonly BindingRestElement: ParseNode
    readonly type: 'ArrayBindingPattern'
}
export interface BindingPropertyList extends ParseNodeBase {
    readonly type: 'BindingPropertyList'
    readonly BindingIdentifier: ParseNode
}

export interface CharacterEscapeNode extends ParseNodeBase {
    readonly HexEscapeSequence: {
        readonly HexDigit_a: string
        readonly HexDigit_b: string
    }
    readonly IdentityEscape?: string
    readonly subtype: string
    readonly RegExpUnicodeEscapeSequence?: RegExpUnicodeEscapeSequenceNode
    readonly ControlLetter?: string
    readonly ControlEscape?: string
    readonly type: 'CharacterEscape'
}

export interface RegExpUnicodeEscapeSequenceNode extends ParseNodeBase {
    readonly HexTrailSurrogate?: number
    readonly HexLeadSurrogate?: number
    readonly CodePoint?: number
    readonly Hex4Digits?: number
    readonly type: 'RegExpUnicodeEscapeSequence'
}

export interface ClassAtomNode extends ParseNodeBase {
    readonly SourceCharacter: string
    readonly value: string
    readonly type: 'ClassAtom'
}

export interface ClassEscapeNode extends ParseNodeBase {
    readonly type: 'ClassEscape'
}
