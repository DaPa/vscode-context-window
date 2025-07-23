export const languageConfig_js = {
    // Set the default marker
    defaultToken: 'invalid',
        
    // Type keyword
    typeKeywords: [
        'function', 'class', 'struct', 'interface', 'enum', 'type', 'namespace'
    ],
    
    // Flow control keywords
    flowKeywords: [
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 
        'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally', 'await', 'yield',
        'delete', 'new'
    ],
    
    // Other keywords
    keywords: [
        'var', 'let', 'const', 'this', 'super', 'extends', 'implements',
        'import', 'export', 'from', 'as', 'async', 'void', 'typeof', 'instanceof', 'in', 'of', 'with',
        'get', 'set', 'constructor', 'static', 'private', 'protected', 'public', 'declare'
    ],
    
    // Operator
    operators: [
        '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
        '*', '/', '%', '++', '--', '<<', '</', '>>', '>>>', '&',
        '|', '^', '!', '~', '&&', '||', '?', ':', '=', '+=', '-=',
        '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '|=',
        '^=', '@',
    ],
    
    // Symbols
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    // escape character
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    
    // Regular expression for the integer part
    digits: /\d+(_+\d+)*/,
    
    // Tokenization rules
    tokenizer: {
        root: [
            // Comments - prioritize comments and ensure keywords in comments are not recognized
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],

            // Regular expression - priority processing
            [/\/(?:[^\/\\]|\\.)*\/[gimuy]*/, 'regexp'],
            
            // string
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/`/, 'string', '@string_backtick'],
            
            // number
            [/(@digits)[eE]([\-+]?(@digits))?/, 'number'],
            [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number'],
            [/0[xX][0-9a-fA-F]+/, 'number'],
            [/0[oO]?[0-7]+/, 'number'],
            [/0[bB][0-1]+/, 'number'],
            [/(@digits)/, 'number'],

            // Template parameters
            [/<(?!<)/, { token: 'delimiter.angle', next: '@template' }],

            // Boolean value
            [/\b(true|false)\b/, 'boolean'],
            
            // null
            [/\bnull\b/, 'null'],

            //test
            //[/(?<!int)\s*(dddata)/, { token: 'keyword.flow', log: console.log('[definition] 1')}],
            //[/int2/, { token: 'keyword.flow', log: console.log('[definition] 2')}],

            [/(\bget|set\b)(?=\s*\()/, 'method.name'],
            
            // Keywords
            [/\b(this|readonly|undefined|unknown|any|global|string|super|abstract|extends|implements|Promise|declare|import|export|from|async|void|boolean|Boolean|Number|String|number|typeof|instanceof|in|of|with|get|set|constructor|static|private|protected|public)\b/, 'keyword'],

            [/\bfunction\b/, { token: 'keyword.type', next: '@afterFunction' }],
            // Type keywords - function, class, struct, etc.
            [/\b(function|class|struct|interface|enum|namespace)\b/, { token: 'keyword.type', next: '@afterClass' }],
            [/\b(type)\b(?!\s*:)/, { token: 'keyword.type', next: '@afterClass' }],

            [/\bas\b/, { token: 'keyword', next: '@afterAs' }],

            // Flow control keywords - if, else, etc.
            [/\b(if|else|for|while|do|switch|case|default|break|continue|return|throw|try|catch|finally|new|delete|await|yield)\b/, 'keyword.flow'],

            // Function definition - improved function name recognition
            [/([a-zA-Z_$][\w$]*)(?=\s*:\s*function\b)/, 'function.name'],
            [/\b(function)\b\s*([a-zA-Z_$][\w$]*)/, ['keyword.type', 'function.name']],
            
            [/(\b[a-zA-Z_$][\w$]*)(?=\s*\()/, 'method.name'],
            [/([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*\()/, 'method.name'],
            [/([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>)/, 'type'],

            [/\b(var|let|const)\b/, { token: 'keyword', next: '@afterVariableDeclaration' }],
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=\=\s*function)/, 'method.name'],
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=:|\?\s*:)/, 'variable.name'],

            [/\=>(?=\s*\b[a-zA-Z_$][\w$]*\b)/, { token: 'operator', next: '@afterArrow' }],
            [/\=>/, 'operator'],

            // ?<= may not be supported
            // get() : type
            //[/(?<=\)\s*:)\s*\b([a-zA-Z_$][\w$]*)\b/, 'type'],
            [/\)\s*:(?=\s*\b([a-zA-Z_$][\w$]*)\b)/, { token: 'delimiter', next: '@afterDelimiterType' }],
            // : type = value;
            //[/(?<=:)\s*\b([a-zA-Z_$][\w$]*)\b(?=\s*\=)/, 'type'],
            [/:(?=\s*\b([a-zA-Z_$][\w$]*)\b\s*\=)/, { token: 'delimiter', next: '@afterDelimiterType' }],
            
            // Function parameters - improved parameter recognition
            // Match function parameters (exclude keywords)
            [/\(\s*(?!true|false|null|undefined|unknown\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],
            [/,\s*(?!true|false|null|undefined|unknown\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],
            
            // identifier - catches all other identifiers
            [/\b[a-zA-Z_$][\w$]*\b(?=\s*extends)/, { token: 'type', next: '@afterClass' }],
            [/[a-zA-Z_$][\w$]*/, 'identifier'],
            
            // delimiters and brackets
            [/[{}()\[\]]/, 'delimiter.bracket'],
            [/[<>](?!@symbols)/, 'delimiter.bracket'],
            [/@symbols/, {
                cases: {
                    '@operators': 'operator',
                    '@default': 'delimiter'
                }
            }],
            [/.(?=type)/, { token: 'delimiter', next: '@typeFix' }],
            
            // Separators: . , ; ...
            [/[;,.]/, 'delimiter'],
            
            // Space
            [/\s+/, 'white'],
        ],

        typeFix: [
            [/type/, { token: 'identifier', next: '@pop' }],
        ],

        template: [
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            { include: 'root' }
        ],

        afterAs: [
            [/\s+/, 'white'],  // skip whitespace
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=\.)/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b/, { token: 'type', next: '@pop' }],
            [/\./, 'delimiter'],
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterArrow: [
            [/\s+/, 'white'],  // skip whitespace
            [/\b([a-zA-Z_$][\w$]*)\b/, { token: 'type', next: '@pop' }],
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterDelimiterType: [
            [/\s+/, 'white'],  // skip whitespace
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=\.)/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b/, { token: 'type', next: '@pop' }],
            [/\./, 'delimiter'],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],
        
        // Multi-line comment - ensure keywords in comment are not recognized
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        
        // Double quoted string
        string_double: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
        ],
        
        // Single quoted string
        string_single: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
        ],
        
        // Backquote string (template string)
        string_backtick: [
            [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
            [/[^\\`$]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/`/, 'string', '@pop']
        ],
        
        // Expressions in template strings
        bracketCounting: [
            [/\{/, 'delimiter.bracket', '@bracketCounting'],
            [/\}/, 'delimiter.bracket', '@pop'],
            { include: 'root' }
        ],
        
        // Class name recognition status
        afterClass: [
            [/\s+/, 'white'],  // skip whitespace
            [/extends\b/, { token: 'keyword', next: '@afterExtends' }], // extends
            [/\bimplements\b/, { token: 'keyword', next: '@afterImplements' }], // implements
            [/[a-zA-Z_$][\w$]*/, 'class.name'],  // Identify class name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterClassName: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bextends\b/, { token: 'keyword', next: '@afterExtends' }], // extends
            [/\bimplements\b/, { token: 'keyword', next: '@afterImplements' }], // implements
            [/[{;=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        // If the rule in the state does not explicitly specify next, it will return to the state's actual position and re-execute after matching, so you must first identify "implements"
        // export class AppMain extends LoggerImpl(BehaviourDelegate) implements IPlatform {
        // fromNative: <T extends NativeTemplateType>(nativeArray: NativeArray<T>) => NativeNumberFilter<T>[];
        afterExtends: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bimplements\b/, { token: 'keyword', next: '@afterImplements' }], // implements
            [/(\b[a-zA-Z_$][\w$]*)(?=\s*\()/, 'method.name'],
            [/([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*\()/, 'method.name'],
            [/[()<>]/, 'delimiter'],
            //[/[a-zA-Z_$][\w$]*(?=\s*>)/, { token: 'type', next: '@pop' }],  // Identify the base class
            [/[a-zA-Z_$][\w$]*/, 'type'],  // Identify the base class
            [/[\.|]/, 'delimiter'],
            [/\s*,/, 'delimiter.bracket'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterImplements: [
            [/\s+/, 'white'],  // skip whitespace
            [/(\b[a-zA-Z_$][\w$]*)(?=\s*\()/, 'method.name'],
            [/([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*\()/, 'method.name'],
            [/[()<>]/, 'delimiter'],
            [/[a-zA-Z_$][\w$]*/, 'type'],  // Identification interface
            [/[\.|]/, 'delimiter'],
            [/\s*,/, 'delimiter.bracket'], // No need for explicit next: '@afterImplements'
            [/[{;=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterVariableDeclaration: [
            [/\s+/, 'white'],  // skip whitespace
            [/[a-zA-Z_$][\w$]*/, 'variable.name'],  // Identify variable name
            [/\s+/, 'white'],  // skip whitespace
            [/[({;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/:\s*([a-zA-Z_$][\w$]*)/, { token: 'type', next: '@pop' }],
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterFunction: [
            [/\s+/, 'white'],  // skip whitespace
            [/[a-zA-Z_$][\w$]*/, { token: 'function.name', next: '@pop' }],//, log: '[definition] Entering function return value processing' }],  // Identify function name
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],
    }
}

// https://microsoft.github.io/monaco-editor/monarch.html
export const languageConfig_cpp = {
    // Set the default marker
    defaultToken: 'invalid',
        
    // Type keyword
    typeKeywords: [
        'class', 'struct', 'union', 'enum', 'typedef', 'template', 'namespace', 'using'
    ],
    
    // Flow control keywords
    flowKeywords: [
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 
        'break', 'continue', 'return', 'goto', 'try', 'catch', 'throw', 'new', 'delete', 'await', 'yield', 'typedef'
    ],
    
    // Other keywords
    keywords: [
        'auto', 'const', 'constexpr', 'static', 'extern', 'register', 'volatile', 'mutable',
        'inline', 'virtual', 'explicit', 'friend', 'public', 'protected', 'private',
        'operator', 'sizeof', 'alignof', 'typeid', 'decltype',
        'this', 'nullptr', 'true', 'false', 'and', 'or', 'not', 'bitand', 'bitor', 'xor',
        'compl', 'and_eq', 'or_eq', 'xor_eq', 'not_eq', 'typename', 'virtual'
    ],
    
    // Operator
    operators: [
        '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
        '*', '/', '%', '++', '--', '<<', '>>', '&', '|', '^', '!', '~',
        '&&', '||', '?', ':', '=', '+=', '-=', '*=', '/=', '%=', '<<=',
        '>>=', '&=', '|=', '^=', '->', '.*', '->*'
    ],

    // innerTypes: [
    //     'auto', 'signed', 'short', 'char', 'unsigned', 'long', 'int', 'bool', 'float', 'double', 'void'
    // ],
    innerTypes: /\bauto|signed|short|char|unsigned|long|int|bool|float|double|void\b/,
    
    // Symbols
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    // escape character
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    
    // Regular expression for the integer part
    digits: /\d+(_+\d+)*/,
    
    // Tokenization rules
    tokenizer: {
        root: [
            // Comments - prioritize comments and ensure keywords in comments are not recognized
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
            [/#\s*include\b/, 'keyword.directive'],
            [/#\s*pragma\s+(region|endregion)$/, 'keyword.directive'],
            [/#\s*pragma\s+(region|endregion)\b/, { token: 'keyword.directive', next: '@region' }],
            [/#\s*error\b/, { token: 'keyword.directive', next: '@region' }],
            [/#\s*pragma\b/, 'keyword.directive'],
            [/#\s*define\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*undef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*ifdef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*ifndef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*elif\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*if\b/, 'keyword.directive.control'],
            [/#\s*else\b/, 'keyword.directive.control'],
            [/#\s*endif\b/, 'keyword.directive.control'],
            
            // string
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/`/, 'string', '@string_backtick'],
            
            // number
            [/(@digits)[eE]([\-+]?(@digits))?[fF]?/, 'number'],
            [/(@digits)\.(@digits)([eE][\-+]?(@digits))?[fF]?/, 'number'],
            [/0[xX][0-9a-fA-F]+/, 'number'],
            [/0[oO]?[0-7]+/, 'number'],
            [/0[bB][0-1]+/, 'number'],
            [/(@digits)/, 'number'],
            
            // Template parameters
            [/<(?!<)/, { token: 'delimiter.angle', next: '@template' }],

            // [/(int)\s+([a-zA-Z_][\w]*)?/gm, { 
            //     cases: { 
            //         '$1': 'keyword.type',  // 'int' is always used as the type keyword
            //         '$2': 'keyword.flow' // Variable names use separate styles
            //     }
            // }],

            //[/([A-Z](?:[\n\r\s]|[a-zA-Z0-9_]|\-[a-zA-Z])*)(\.?)/, { cases: { '$2': ['keyword.flow','identifier'], 
            //                                                        '@default': 'keyword' }}],

            //[/void\b/, { token: '@rematch', next: '@afterVoidCheck' }],

            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*static|const\b)/, 'keyword'],
            [/\b(template)\b/, 'keyword.type'],

            // Keywords
            [/\b(extern|const|volatile|static|operator|thread_local|final|mutable|constexpr|noexcept|final|abstract|this|decltype|inline|friend|typename|explicit|nullptr|null|override|super|extends|implements|virtual|import|export|sizeof|from|as|async|typeof|instanceof|in|of|with|get|set|constructor|private|protected|public)\b/, 'keyword'],

            [/\b(typedef)\b/, 'keyword.flow'],

            [/\b(enum)\b\s*(?=class|struct\b)/, 'keyword.type'],
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=class|struct\b)/, 'keyword'],

            //[/\b([a-zA-Z_$][\w$]*)\b/, { token: '@rematch', next: '@preClassCheck' }],

            // [dllexport] class [dllexport] AEFCharacterBase : public ACharacter
            //[/\b([a-zA-Z_$][\w$]*)\b\s+(?=class|struct)/, 'macro.name'],

            // Type keywords - class, struct, etc.
            [/\b(class|struct|interface|enum|union)\b/, { token: 'keyword.type', next: '@afterClass' }],
            [/\bnamespace\b/, { token: 'keyword.type', next: '@afterNameSpace' }],

            [/(?<=\[)\s*\b(using)\b/, 'keyword.type'],
            [/\b(using)\b/, { token: 'keyword.type', next: '@afterUsing' }],

            // Flow control keywords - if, else, etc.
            [/\b(if|else|for|while|do|switch|case|default|break|continue|return|throw|try|catch|finally|goto|new|delete|await|yield)\b/, 'keyword.flow'],

            // Method definition
            // uint Game::GetNumVertex()
            [/\b([a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*::\s*[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@functionAfter' }],
            // uint GetNumVertex()
            [/\b([a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@functionAfterClass' }],
            // int Game::GetNumVertex(), int has be tokenized by keyword, Game::~Game()
            // todo: Game::Game() : var1(0), var2(NULL)
            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=::\s*~*\s*[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@functionAfterClass' }],
            [/(\b[a-zA-Z_$][\w$]*)(?=\s*\()/, 'method.name'],
            // func<type>()
            // Func<Dictionary<K,V>>()
            //[/([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*\()/, 'method.name'],
            // Func<Dictionary<vector<int>,string<char>>>()
            [/([a-zA-Z_$][\w$]*)\s*(?=<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*\()/, 'method.name'],

            [/\b([a-zA-Z_$][\w$]*)\b\s*(?=::)/, { token: 'type', next: '@afterScope' }],
            [/(?<=::)\s*\b([a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*::\s*[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@functionAfter' }],
            [/(?<=::)\s*\b([a-zA-Z_$][\w$]*)\b/, { token: 'type', next: '@typeDeclare' }],

            // parse variable
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*virtual)/, 'type'],
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b(?=\s*[\*&]*\s*[a-zA-Z_$][\w$]*<)/, 'type'],
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b(?=\s*[\*&]*\s*[a-zA-Z_$][\w$]*)/, { token: 'type', next: '@afterType' }],
            [/\b@innerTypes\b/, 'type'],

            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*<(?!<))/, { token: 'type', next: '@preTemplateType' }],

            // Pattern recognition of a generic class name followed by a variable name
            //[/\b([a-zA-Z_$][\w$]*)\b\s+([a-zA-Z_$][\w$]*)/, ['class.name', 'variable.name']],
            //[/\b([a-zA-Z_$][\w$]*)\b\s+([a-zA-Z_$][\w$]*)/, ['class.name', 'variable.name']],
            // Add type name recognition rules
            //[/\b([a-zA-Z_$][\w$]*)\b\s+([a-zA-Z_$][\w$]*)/, ['class.name', 'variable.name']],

            //[/\b([a-zA-Z_$][\w$]*)\b\s+(?=\b[a-zA-Z_$][\w$]*\b)/, 'type'],
            //[/\b([a-zA-Z_$][\w$]*)\b\s*(?=[\={])/, 'variable.name'],
            
            // Object properties
            //[/([a-zA-Z_$][\w$]*)\s*(?=:)/, 'property'],
            
            // Function parameters - improved parameter recognition
            [/\(\s*(?!true|false|null|nullptr|void\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],
            [/,\s*(?!true|false|null|nullptr|void\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],

            [/\}\s*(?=\b[a-zA-Z_$][\w$]*\s*;$)/, { token: 'delimiter', next: '@typedefStructName'}],
            
            // Boolean value
            [/\b(true|false)\b/, 'boolean'],

            // identifier - catches all other identifiers
            [/[a-zA-Z_$][\w$]*/, 'identifier'],
            
            // delimiters and brackets
            [/[{}\(\)\[\]]/, 'delimiter.bracket'],
            [/[<>](?!@symbols)/, 'delimiter.bracket'],
            [/@symbols/, {
                cases: {
                    '@operators': 'operator',
                    '@default': 'delimiter'
                }
            }],
            
            // Separators: . , ; ...
            [/[;,.]/, 'delimiter'],
            
            // Space
            [/\s+/, 'white'],
        ],
        template: [
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            { include: 'root' }
        ],

        region: [
            [/.*$/, { token: 'comment', next: '@pop' }],
            [/./, { token: '@rematch', next: '@pop' }]
        ],
        
        // Multi-line comment - ensure keywords in comment are not recognized
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        
        // Double quoted string
        string_double: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
        ],
        
        // Single quoted string
        string_single: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
        ],
        
        // Backquote string (template string)
        string_backtick: [
            [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
            [/[^\\`$]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/`/, 'string', '@pop']
        ],
        
        // Expressions in template strings
        bracketCounting: [
            [/\{/, 'delimiter.bracket', '@bracketCounting'],
            [/\}/, 'delimiter.bracket', '@pop'],
            { include: 'root' }
        ],

        afterType: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bconst|volatile|static|thread_local|constexpr|operator|mutable\b/, 'keyword'],
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b(?=\s*::)/, 'type'],
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b(?=\s*[\*&]*\s*[a-zA-Z_$][\w$]*)/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b(?!\s*\()/, 'variable.name'],//{ token: 'variable.name', next: '@pop' }],
            [/[\*&,]/, 'delimiter'],
            [/,/, 'delimiter.bracket'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        // Class name recognition status
        afterClass: [
            [/\s+/, 'white'],  // skip whitespace
            [/final\b/, 'keyword'],
            [/([a-zA-Z_$][\w$]*)\b(?=\s+final\b)/, 'class.name'],
            // (class classname *cls,)
            [/([a-zA-Z_$][\w$]*)\b(?=\s*[\*&]*\s*[a-zA-Z_$][\w$]*\s*[,\)])/, { token: 'keyword', next: '@afterType' }],
            [/([a-zA-Z_$][\w$]*)\b(?=\s*[a-zA-Z_$][\w$]*)/, 'keyword'],  // Identify other 'dllexport'
            [/[a-zA-Z_$][\w$]*\b(?!\s*[\*&])/, 'class.name'],  // Identify class name
            [/[a-zA-Z_$][\w$]*\b/, 'type'], // void test(class A &a)
            [/</, { token: 'delimiter.angle', next: '@afterTypeTemplate' }],
            [/::/, { token: 'delimiter', next: '@pop' }],
            [/:/, { token: 'delimiter', next: '@classExtends' }],
            [/[{;,:=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        classExtends: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bvirtual|public|protected|private\b/, 'keyword'],
            [/</, { token: 'delimiter.angle', next: '@afterTypeTemplate' }],
            [/::/, 'delimiter'],
            [/[a-zA-Z_$][\w$]*\b/, 'type'],
            [/,/, 'delimiter'],
            [/[{;]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        // Macro name recognition status
        afterMacro: [
            [/\s+/, 'white'],  // skip whitespace
            //[/\b*defined\b/, { token: 'keyword.directive.control', next: '@pop' }],
            [/[a-zA-Z_$][\w$]*/, { token: 'macro', next: '@pop' }],  // Identify class name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        functionAfter: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*\b)/, { token: 'type', next: '@functionAfterClass' }],  // Identify class name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        functionAfterClass: [
            [/\s+/, 'white'],  // skip whitespace
            [/::/, 'delimiter'],
            [/~\s*/, 'delimiter'],
            [/([a-zA-Z_$][\w$]*\b)/, { token: 'method.name', next: '@pop' }],  // Identify method name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterUsing: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bnamespace\b/, { token: 'keyword.type', next: '@afterUsingNamespace' }],
            [/([a-zA-Z_$][\w$]*)(?=\s*\=)/, 'class.name'],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterUsingNamespace: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*)/, { token: 'type', next: '@root' }],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        typeDeclare: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*)/, 'variable.name'],
            [/,/, 'delimiter.bracket'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        typedefStructName: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*)/, 'class.name'],
            [/,/, 'delimiter.bracket'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterScope: [
            [/\s+/, 'white'],  // skip whitespace
            [/::/, 'delimiter'],
            [/<</, { token: 'operator', next: '@pop' }],
            [/</, { token: 'delimiter.angle', next: '@templateType' }],
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@pop' }],
            [/\b([a-zA-Z_$][\w$]*)\b(?=::)/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*<(?!<))/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*[a-zA-Z_$][\w$]*)/, { token: 'type', next: '@afterType' }],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterNameSpace: [
            [/\s+/, 'white'],  // skip whitespace
            [/::/, 'delimiter'],
            [/\b([a-zA-Z_$][\w$]*)\b/, 'class.name'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterTypeTemplate: [
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            { include: 'root' }
        ],

        preTemplateType: [
            [/</, { token: 'delimiter.angle', next: '@templateType' }],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        templateType: [
            [/>(?=\s*[a-zA-Z_$][\w$]*(?!\s*\())/, { token: 'delimiter.angle', next: '@afterType' }],
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            { include: 'root' }
        ]
    }
}

export const languageConfig_cs = {
    // Set the default marker
    defaultToken: 'invalid',
        
    // Type keyword
    typeKeywords: [
        'class', 'struct', 'union', 'enum', 'typedef', 'template', 'namespace', 'using'
    ],
    
    // Flow control keywords
    flowKeywords: [
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 
        'break', 'continue', 'return', 'goto', 'try', 'catch', 'throw', 'new', 'delete', 'await', 'yield', 'typedef'
    ],
    
    // Other keywords
    keywords: [
        'auto', 'const', 'constexpr', 'static', 'extern', 'register', 'volatile', 'mutable',
        'inline', 'virtual', 'explicit', 'friend', 'public', 'protected', 'private',
        'operator', 'sizeof', 'alignof', 'typeid', 'decltype',
        'this', 'nullptr', 'true', 'false', 'and', 'or', 'not', 'bitand', 'bitor', 'xor',
        'compl', 'and_eq', 'or_eq', 'xor_eq', 'not_eq', 'typename', 'virtual'
    ],
    
    // Operator
    operators: [
        '<=', '>=', '==', '!=', '===', '!==', '=>', '+', '-', '**',
        '*', '/', '%', '++', '--', '<<', '>>', '&', '|', '^', '!', '~',
        '&&', '||', '?', ':', '=', '+=', '-=', '*=', '/=', '%=', '<<=',
        '>>=', '&=', '|=', '^=', '->', '.*', '->*'
    ],
    
    innerTypes: /\bvar|string|String|signed|short|char|unsigned|long|int|bool|float|double|void|delegate\b/,
    
    // Symbols
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    // escape character
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    
    // Regular expression for the integer part
    digits: /\d+(_+\d+)*/,
    
    //Tokenization rules
    tokenizer: {
        root: [
            // Comments - prioritize comments and ensure keywords in comments are not recognized
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
            [/#\s*include\b/, 'keyword.directive'],
            [/#\s*pragma\b/, 'keyword.directive'],
            [/#\s*define\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*undef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*ifdef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*ifndef\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*elif\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*if\b/, { token: 'keyword.directive.control', next: '@afterMacro' }],
            [/#\s*else\b/, 'keyword.directive.control'],
            [/#\s*endif\b/, 'keyword.directive.control'],
            
            // string
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/`/, 'string', '@string_backtick'],
            
            // number
            [/(@digits)[eE]([\-+]?(@digits))?[fF]?/, 'number'],
            [/(@digits)\.(@digits)([eE][\-+]?(@digits))?[fF]?/, 'number'],
            [/0[xX][0-9a-fA-F]+/, 'number'],
            [/0[oO]?[0-7]+/, 'number'],
            [/0[bB][0-1]+/, 'number'],
            [/(@digits)/, 'number'],
            
            // Template parameters
            [/<(?!<)/, { token: 'delimiter.angle', next: '@template' }],

            [/#\s*(region|endregion)$/, 'keyword.directive'],
            [/#\s*(region|endregion)\b/, { token: 'keyword.directive', next: '@region' }],

            // [/(int)\s+([a-zA-Z_][\w]*)?/gm, { 
            //     cases: { 
            //         '$1': 'keyword.type',  // 'int' is always used as the type keyword
            //         '$2': 'keyword.flow' // Variable names use separate styles
            //     }
            // }],

            //[/([A-Z](?:[\n\r\s]|[a-zA-Z0-9_]|\-[a-zA-Z])*)(\.?)/, { cases: { '$2': ['keyword.flow','identifier'], 
            //                                                        '@default': 'keyword' }}],

            //[/void\b/, { token: '@rematch', next: '@afterVoidCheck' }],

            // Keywords
            [/\b(extern|const|readonly|volatile|sealed|constexpr|this|null|inline|global|abstract|partial|override|super|extends|auto|implements|virtual|import|export|sizeof|from|as|ref|async|typeof|instanceof|in|out|of|with|get|set|constructor|static|private|protected|public|internal)\b/, 'keyword'],

            [/\b(typedef)\b/, 'keyword.flow'],

            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*class|struct\b)/, 'keyword'],

            // Type keywords - class, struct, etc.
            [/\b(class|struct|interface|enum|union|type)\b/, { token: 'keyword.type', next: '@afterClass' }],
            [/\bnamespace\b/, { token: 'keyword.type', next: '@afterNameSpace' }],

            // using ()
            [/\b(using)\b(?=\s*\()/, 'keyword.type'],
            [/\b(using)\b/, { token: 'keyword.type', next: '@afterUsing' }],

            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*static|const\b)/, 'keyword'],

            [/\bwhere\b/, { token: 'keyword', next: '@afterWhere' }],

            // Flow control keywords - if, else, etc.
            [/\b(if|else|for|while|do|switch|case|default|break|continue|return|throw|try|catch|finally|goto|new|delete|await|yield)\b/, 'keyword.flow'],

            // Method definition
            // uint GetNumVertex()
            [/\b([a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*\()/, { token: 'type', next: '@functionAfterClass' }],

            //[/\b([a-zA-Z_$][\w$]*)\s*(?=<[^<>]*(?:<[^<>]*>[^<>]*)*>\s*\()/, 'method.name'],
            [/(\b[a-zA-Z_$][\w$]*)(?=\s*\()/, 'method.name'],
            [/([a-zA-Z_$][\w$]*)\s*(?=<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*\()/, 'method.name'],
            
            // Object properties
            [/([a-zA-Z_$][\w$]*)\s*(?=:)/, 'property'],
            
            // Function parameters - improved parameter recognition
            [/\(\s*(?!true|false|null\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],
            [/,\s*(?!true|false|null\b)([a-zA-Z_$][\w$]*)\s*(?=[,)])/, 'variable.parameter'],
            
            // Variable declaration - improved variable identification
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*<)/, 'type'],
            [/\b(@innerTypes|[a-zA-Z_$][\w$]*)\b\s+(?=[a-zA-Z_$][\w$]*\s*)/, { token: 'type', next: '@afterType' }],
            [/\b@innerTypes\b/, 'type'],
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*<(?!<))/, { token: 'type', next: '@preTemplateType' }],
            
            // Boolean value
            [/\b(true|false)\b/, 'boolean'],
            
            // identifier - catches all other identifiers
            [/[a-zA-Z_$][\w$]*/, 'identifier'],
            
            // delimiters and brackets
            [/[{}()\[\]]/, 'delimiter.bracket'],
            [/[<>](?!@symbols)/, 'delimiter.bracket'],
            [/@symbols/, {
                cases: {
                    '@operators': 'operator',
                    '@default': 'delimiter'
                }
            }],
            
            // Separators: . , ; ...
            [/[;,.]/, 'delimiter'],
            
            // Space
            [/\s+/, 'white'],
        ],
        template: [
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            { include: 'root' }
        ],

        region: [
            [/.*$/, { token: 'comment', next: '@pop' }],
            [/./, { token: '@rematch', next: '@pop' }]
        ],
        
        // Multi-line comment - ensure keywords in comment are not recognized
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        
        // Double quoted string
        string_double: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
        ],
        
        // Single quoted string
        string_single: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
        ],
        
        // Backquote string (template string)
        string_backtick: [
            [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
            [/[^\\`$]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/`/, 'string', '@pop']
        ],
        
        // Expressions in template strings
        bracketCounting: [
            [/\{/, 'delimiter.bracket', '@bracketCounting'],
            [/\}/, 'delimiter.bracket', '@pop'],
            { include: 'root' }
        ],

        // Class name recognition status
        afterClass: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*)\b(?=\s*[a-zA-Z_$][\w$]*)/, 'keyword'],  // Identify other
            [/[a-zA-Z_$][\w$]*/, 'class.name'],  // Identify class name
            [/</, { token: 'delimiter.angle', next: '@afterTypeTemplate' }],
            [/:/, { token: 'delimiter', next: '@classExtends' }],
            [/[{;,:=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        classExtends: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bwhere\b/, { token: 'keyword', next: '@afterWhere' }],
            [/</, { token: 'delimiter.angle', next: '@afterTypeTemplate' }],
            [/[a-zA-Z_$][\w$]*\b/, 'type'],
            [/[,\.]/, 'delimiter'],
            [/[{;]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterWhere: [
            [/\s+/, 'white'],  // skip whitespace
            [/:/, 'delimiter'],
            [/[a-zA-Z_$][\w$]*/, 'type'],  // Identify class name
            [/</, { token: 'delimiter.angle', next: '@afterTypeTemplate' }],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterTypeTemplate: [
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            { include: 'root' }
        ],

        // Macro name recognition status
        afterMacro: [
            [/\s+/, 'white'],  // skip whitespace
            [/[\(\)]/, 'delimiter.parenthesis'],  // brackets
            [/\|\||&&/, 'operator'],  // logical operator
            [/[!~]/, 'operator'],  // unary operator
            [/[a-zA-Z_$][\w$]*(?=.*\b[a-zA-Z_$][\w$]*\b)/, 'macro'],  // Macro name
            [/[a-zA-Z_$][\w$]*/, { token: 'macro', next: '@pop' }],  // Macro name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        functionAfter: [
            [/\s+/, 'white'],  // skip whitespace
            [/([a-zA-Z_$][\w$]*\b)/, { token: 'type', next: '@functionAfterClass' }],  // Identify class name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        functionAfterClass: [
            [/\s+/, 'white'],  // skip whitespace
            [/::/, 'delimiter'],
            [/~\s*/, 'delimiter'],
            [/([a-zA-Z_$][\w$]*\b)/, { token: 'method.name', next: '@pop' }],  // Identify method name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterUsingEqual: [
            [/\s+/, 'white'],  // skip whitespace
            [/[a-zA-Z_$][\w$]*/, 'type'],
            [/[\.=]/, 'delimiter'],
            [/[{;,]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterUsing: [
            [/\s+/, 'white'],  // skip whitespace
            [/\bstatic\b/, { token: 'keyword', next: '@afterUsingStatic' }],
            [/([a-zA-Z_$][\w$]*)(?=\s+[a-zA-Z_$][\w$]*)/, { token: 'type', next: '@afterType' }],  // var or type
            [/[a-zA-Z_$][\w$]*(?=\s*\=)/, { token: 'class.name', next: '@afterUsingEqual' }],  // Identify class name
            [/[a-zA-Z_$][\w$]*/, 'class.name'],  // Identify class name
            [/\./, 'delimiter'],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        afterType: [
            [/\s+/, 'white'],  // skip whitespace
            [/[a-zA-Z_$][\w$]*/, { token: 'variable.name', next: '@root' }],  // Identify class name
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterUsingStatic: [
            [/\s+/, 'white'],  // skip whitespace
            [/[a-zA-Z_$][\w$]*/, 'type'],
            [/\./, 'delimiter'],
            [/[{;,=]/, { token: 'delimiter.bracket', next: '@root' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@root' }]  // Otherwise return and rematch
        ],

        afterNameSpace: [
            [/\s+/, 'white'],  // skip whitespace
            [/\./, 'delimiter'],
            [/\b([a-zA-Z_$][\w$]*)\b/, 'class.name'],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        preTemplateType: [
            [/</, { token: 'delimiter.angle', next: '@templateType' }],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            [/./, { token: '@rematch', next: '@pop' }]  // Otherwise return and rematch
        ],

        templateType: [
            [/>(?=\s*[a-zA-Z_$][\w$]*(?!\s*\())/, { token: 'delimiter.angle', next: '@afterType' }],
            [/>/, { token: 'delimiter.angle', next: '@pop' }],
            [/[{;=]/, { token: 'delimiter.bracket', next: '@pop' }],  // Return if { is encountered directly
            { include: 'root' }
        ]
    }
}