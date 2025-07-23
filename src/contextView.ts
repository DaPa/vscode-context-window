import * as vscode from 'vscode';
import { Renderer, FileContentInfo } from './renderer';
import * as path from 'path';

enum UpdateMode {
    Live = 'live',
    Sticky = 'sticky',
}
const maxHistorySize = 50;

interface HistoryInfo {
    content: FileContentInfo | undefined;
    curLine: number;
}

export class ContextWindowProvider implements vscode.WebviewViewProvider {
    // Add a new property to cache the last content
    private _history: HistoryInfo[] = [];
    private _historyIndex: number = 0;

    private _mousePressed: boolean = false;
    private _mouseTimer?: NodeJS.Timeout;  // Add timer reference

    //private static readonly outputChannel = vscode.window.createOutputChannel('Context View');

    private currentUri: vscode.Uri | undefined = undefined;
    private currentLine: number = 0; // Add line number storage
    public static readonly viewType = 'contextView.context';

    private static readonly pinnedContext = 'contextView.contextWindow.isPinned';

    private readonly _disposables: vscode.Disposable[] = [];

    private readonly _renderer = new Renderer();

    private _view?: vscode.WebviewView;
    private _currentCacheKey: CacheKey = cacheKeyNone;
    private _loading?: { cts: vscode.CancellationTokenSource }

    private _updateMode = UpdateMode.Sticky;
    private _pinned = false;
    private _currentPanel?: vscode.WebviewPanel; // Add member variables to store the current panel
    private _pickItems: any[] | undefined; // Add member variables to store selected items
    private _currentSelectedText: string = ''; // Add a member variable to store the currently selected text

    private _themeListener: vscode.Disposable | undefined;

    private _isFirstStart: boolean = true;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        // Listen for theme changes
        this._themeListener = vscode.window.onDidChangeActiveColorTheme(theme => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'updateTheme',
                    theme: this._getVSCodeTheme(theme)
                });
            }
        });

        // Listen for editor configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor')) {
                if (this._view) {
                    const updatedConfig = this._getVSCodeEditorConfiguration();
                    this._view.webview.postMessage({
                        type: 'updateEditorConfiguration',
                        configuration: updatedConfig
                    });
                }
            }
            if (e.affectsConfiguration('contextView.contextWindow')) {
                // Re-obtain the configuration and send it to the webview
                const newConfig = this._getVSCodeEditorConfiguration();
                this._view?.webview.postMessage({
                    type: 'updateContextEditorCfg',
                    contextEditorCfg: newConfig.contextEditorCfg
                });
            }
        }, null, this._disposables);

        // Listens for changes to workspace folders (when user adds/removes folders)
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            if (this._currentPanel) {
                //ContextWindowProvider.outputChannel.appendLine('[definition] onDidChangeWorkspaceFolders dispose');
                this._currentPanel.dispose();
                this._currentPanel = undefined;
            }
        }, null, this._disposables);

        // When losing focus
        vscode.window.onDidChangeWindowState((e) => {
            if (!e.focused && this._currentPanel) {
                //ContextWindowProvider.outputChannel.appendLine('[definition] onDidChangeWindowState dispose');
                this._currentPanel.dispose();
                this._currentPanel = undefined;
            }
        }, null, this._disposables);

        // when the extension is deactivated: clean up resources
        this._disposables.push(
            vscode.Disposable.from({
                dispose: () => {
                    if (this._currentPanel) {
                        //ContextWindowProvider.outputChannel.appendLine('[definition] dispose');
                        this._currentPanel.dispose();
                        this._currentPanel = undefined;
                    }
                }
            })
        );
        let lastPosition: vscode.Position | undefined;
        let lastDocumentVersion: number | undefined;
        // Modify selection change event handling
        vscode.window.onDidChangeTextEditorSelection((e) => {
            // Skip updating non-empty selections
            if (!e.selections[0].isEmpty) {
                return;
            }

            const currentPosition = e.selections[0].active;
            const currentDocumentVersion = e.textEditor.document.version;

            // Check if it is an input event (document version change)
            if (lastDocumentVersion && currentDocumentVersion !== lastDocumentVersion) {
                //console.log('[definition] onDidChangeTextEditorSelection ret: ', currentDocumentVersion, lastDocumentVersion);
                lastDocumentVersion = currentDocumentVersion;
                lastPosition = currentPosition;
                return;
            }

            lastPosition = currentPosition;
            lastDocumentVersion = currentDocumentVersion;

            //console.log('[definition] onDidChangeTextEditorSelection: ', e);

            // Only handle events triggered by the mouse and keyboard
            if (e.kind === vscode.TextEditorSelectionChangeKind.Mouse || 
                e.kind === vscode.TextEditorSelectionChangeKind.Keyboard) {
                
                if (e.kind === vscode.TextEditorSelectionChangeKind.Mouse) {
                    // Mouse event: Marker needs to be updated, but waiting for the mouse to be released
                    this._mousePressed = true;

                    // Clear the previous timer
                    if (this._mouseTimer) {
                        clearTimeout(this._mouseTimer);
                    }
                    
                    // Set a delay to detect the mouse release state
                    this._mouseTimer = setTimeout(() => {
                        if (this._mousePressed) {
                            this._mousePressed = false;
                            const editor = vscode.window.activeTextEditor;
                            if (editor?.selection.isEmpty) {
                                this.update();
                            }
                        }
                    }, 300); // Check the mouse status after 300ms
                } else {
                    // Keyboard events: direct update
                    this.update();
                }
            }
        }, null, this._disposables);

        this._renderer.needsRender(() => {
            //console.log('[definition] needsRender update');
            this.update(/* force */ true);
        }, undefined, this._disposables);

        // Listens for VS Code settings changes
        vscode.workspace.onDidChangeConfiguration(() => {
            this.updateConfiguration();
        }, null, this._disposables);

        this.updateConfiguration();
        //this.update(); // The view has not been created yet and cannot be updated

        // Add delayed initial update, guaranteed update
        setTimeout(() => {
            //console.log('[definition] timeout update');
            this.update(/* force */ true);
        }, 2000); // Wait for 2 seconds after initialization

        // listen for language status changes
        vscode.languages.onDidChangeDiagnostics(e => {
            if (!this._isFirstStart)
                return;
            this._isFirstStart = false;
            const editor = vscode.window.activeTextEditor;
            
            if (editor && e.uris.some(uri => uri.toString() === editor.document.uri.toString())) {
                //console.log('[definition] Document diagnostics updated, updating definitions');
                this.update(/* force */ true);
            }
        }, null, this._disposables);
    }

    private getCurrentContent() : HistoryInfo {
        return (this._history && this._history.length > this._historyIndex) ? this._history[this._historyIndex] : { content: undefined, curLine: -1 };
    }

    private addToHistory(contentInfo: FileContentInfo, fromLine: number =-1) {
        // Clear the content after _historyIndex
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push({ content: contentInfo, curLine: -1 });
        this._historyIndex++;

        this._history[this._historyIndex-1].curLine = fromLine;

        //console.log('[definition] add history', this._history);

        if (this._history.length > maxHistorySize) {
            this._history.shift();
            this._historyIndex--;
        }
    }

    // Get the Monaco theme corresponding to the VS Code theme
    private _getVSCodeTheme(theme?: vscode.ColorTheme): string {
        if (!theme) {
            theme = vscode.window.activeColorTheme;
        }
        
        switch (theme.kind) {
            case vscode.ColorThemeKind.Dark:
                return 'vs-dark';
            case vscode.ColorThemeKind.HighContrast:
                return 'hc-black';
            default:
                return 'vs';
        }
    }

    // Get the complete configuration of the VS Code editor
    private _getVSCodeEditorConfiguration(): any {
        // Get all editor related configurations
        const editorConfig = vscode.workspace.getConfiguration('editor');
        const contextWindowConfig = vscode.workspace.getConfiguration('contextView.contextWindow');
        const currentTheme = this._getVSCodeTheme();
        
        // Build the configuration object
        const config: {
            theme: string;
            editorOptions: any;
            contextEditorCfg: any;
            customThemeRules?: any[];
        } = {
            theme: this._getVSCodeTheme(),
            // Convert the editor configuration to an object
            editorOptions: {
                ...Object.assign({}, editorConfig),
                links: true
            },
            contextEditorCfg: {
                selectionBackground: contextWindowConfig.get('selectionBackground', '#07c2db71'),
                inactiveSelectionBackground: contextWindowConfig.get('inactiveSelectionBackground', '#07c2db71'),
                selectionHighlightBackground: contextWindowConfig.get('selectionHighlightBackground', '#5bdb0771'),
                selectionHighlightBorder: contextWindowConfig.get('selectionHighlightBorder', '#5bdb0791')
            }
        };

        // Add custom theme rules only under light theme
        if (currentTheme === 'vs') {
            config.customThemeRules = [
                // Keywords and control flow
                { token: 'keyword', foreground: '#0000ff' },           // Keyword: blue
                { token: 'keyword.type', foreground: '#ff0000', fontStyle: 'bold' },      // Process control keyword: red
                { token: 'keyword.flow', foreground: '#ff0000', fontStyle: 'bold' },      // Flow control keyword: red
                { token: 'keyword.control', foreground: '#ff0000' },   // Control keyword: red
                { token: 'keyword.operator', foreground: '#800080' },  // Operator keyword: red
                { token: 'keyword.declaration', foreground: '#0000ff' }, // Declaration keyword: blue
                { token: 'keyword.modifier', foreground: '#0000ff' },  // Modifier keyword: blue
                { token: 'keyword.conditional', foreground: '#ff0000' }, // Conditional keyword: red
                { token: 'keyword.repeat', foreground: '#ff0000' },    // Loop keyword: red
                { token: 'keyword.exception', foreground: '#ff0000' }, // Exception keyword: red
                { token: 'keyword.other', foreground: '#0000ff' },     // Other keywords: blue
                { token: 'keyword.predefined', foreground: '#0000ff' }, // Predefined keyword: blue
                { token: 'keyword.function', foreground: '#ff0000', fontStyle: 'bold' }, // Predefined keywords: blue
                { token: 'keyword.directive', foreground: '#0000ff' }, // include
                { token: 'keyword.directive.control', foreground: '#ff0000', fontStyle: 'bold' }, // #if #else
                
                // Variables and identifiers
                { token: 'variable', foreground: '#000080' },          // variable: red
                { token: 'variable.name', foreground: '#000080', fontStyle: 'bold' },     // variable name: red
                { token: 'variable.parameter', foreground: '#000080' },//, fontStyle: 'bold' }, // Parameter variable: red
                { token: 'variable.predefined', foreground: '#ff0000', fontStyle: 'bold' }, // Predefined variable: red
                { token: 'identifier', foreground: '#000080' },        // Identifier: cyan
                
                // Types and classes
                { token: 'type', foreground: '#0000ff' },              // Type: blue
                { token: 'type.declaration', foreground: '#0000ff' },  // Type declaration: blue
                { token: 'class', foreground: '#ff0000' },             // Class: red
                { token: 'class.name', foreground: '#0000ff', fontStyle: 'bold' },        // Class name: blue
                { token: 'entity.name.type.class', foreground: '#ff0000', fontStyle: 'bold' },  // Class name: red bold
                { token: 'entity.name.type', foreground: '#ff0000', fontStyle: 'bold' },        // Type name: red bold
                { token: 'interface', foreground: '#ff0000' },         // Interface: cyan
                { token: 'enum', foreground: '#ff0000' },              // Enumeration: cyan
                { token: 'struct', foreground: '#ff0000' },            // Structure: cyan
                
                // Functions and methods
                { token: 'function', foreground: '#a00000' },          // Function: brown
                { token: 'function.name', foreground: '#a00000', fontStyle: 'bold' },     // Function name: brown
                { token: 'function.call', foreground: '#a00000' },     // Function call: brown
                { token: 'method', foreground: '#a00000' },            // Method: brown
                { token: 'method.name', foreground: '#a00000', fontStyle: 'bold' },       // Method name: brown
                
                // Literal
                { token: 'string', foreground: '#005700' },            // string: red
                { token: 'string.escape', foreground: '#005700' },     // escape character: red
                { token: 'number', foreground: '#ff0000' },            // Number: green
                { token: 'boolean', foreground: '#800080' },           // Boolean value: blue
                { token: 'regexp', foreground: '#811f3f' },            // Regular expression: dark red
                { token: 'null', foreground: '#0000ff' },              // null: blue
                
                // Comments
                { token: 'comment', foreground: '#005700' },           // Comment: green
                { token: 'comment.doc', foreground: '#005700' },       // Documentation comment: green
                
                // Attributes and members
                { token: 'property', foreground: '#000080' },          // Property: dark blue
                { token: 'property.declaration', foreground: '#000080' }, // Property declaration: dark blue
                { token: 'member', foreground: '#000080' },            // Member: dark blue
                { token: 'field', foreground: '#000080' },             // Field: dark blue
                
                // Operators and delimiters
                { token: 'operator', foreground: '#800080' },          // Operator: purple
                { token: 'delimiter', foreground: '#000000' },         // delimiter: black
                { token: 'delimiter.bracket', foreground: '#000000' }, // Bracket: black
                { token: 'delimiter.parenthesis', foreground: '#000000' }, // Parentheses: black
                
                // Tags and special elements
                { token: 'tag', foreground: '#800000' },               // Tag: dark red
                { token: 'tag.attribute.name', foreground: '#000080' }, // Tag attribute name: red
                { token: 'attribute.name', foreground: '#000080' },    // Attribute name: red
                { token: 'attribute.value', foreground: '#0000ff' },   // attribute value: blue
                
                // Other types
                { token: 'namespace', foreground: '#ff0000' },         // Namespace: cyan
                { token: 'constant', foreground: '#800080' },          // Constant: dark red
                { token: 'constant.language', foreground: '#0000ff' }, // Language constant: blue
                { token: 'modifier', foreground: '#0000ff' },          // Modifier: blue
                { token: 'constructor', foreground: '#a00000' },       // Constructor: brown
                { token: 'decorator', foreground: '#800080' },         // Decorator: cyan
                { token: 'macro', foreground: '#A00000', fontStyle: 'italic' }              // Macro: purple
            ];
        }

        //console.log('[definition] editor', editorConfig);
        
        // Add syntax highlighting configuration
        // if (tokenColorCustomizations) {
        //     console.log('[definition] tokenColorCustomizations', tokenColorCustomizations);
        //     config.tokenColorCustomizations = tokenColorCustomizations;
        // }
        
        // Add semantic highlight configuration
        // if (semanticTokenColorCustomizations) {
        //     console.log('[definition] semanticTokenColorCustomizations', semanticTokenColorCustomizations);
        //     config.semanticTokenColorCustomizations = semanticTokenColorCustomizations;
        // }
        
        return config;
    }

    dispose() {
        //ContextWindowProvider.outputChannel.appendLine('[definition] Provider disposing...');
        // Make sure to close the definition selection panel
        if (this._currentPanel) {
            this._currentPanel.dispose();
            this._currentPanel = undefined;
        }

        // Clean up other resources
        let item: vscode.Disposable | undefined;
        while ((item = this._disposables.pop())) {
            item.dispose();
        }

        //ContextWindowProvider.outputChannel.dispose();
        if (this._themeListener) {
            this._themeListener.dispose();
            this._themeListener = undefined;
        }
    }

    private navigate(direction: 'back' | 'forward') {
        let lastIdx = this._historyIndex;
        // Implement navigation logic
        if (direction === 'back' && this._historyIndex > 0) {
            this._historyIndex--;
        } else if (direction === 'forward' && this._historyIndex < this._history.length - 1) {
            this._historyIndex++;
        }
        if (lastIdx !== this._historyIndex) {
            // Actively hide the definition list
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'clearDefinitionList'
                });
            }
            
            const contentInfo = this._history[this._historyIndex];
            this.updateContent(contentInfo?.content, contentInfo.curLine);
        }
    }

    private isSameDefinition(uri: string, line: number, token: string): boolean {
        let curFileContentInfo = (this._historyIndex < this._history.length) ? this._history[this._historyIndex] : undefined;
        return (curFileContentInfo && curFileContentInfo.content) ? (curFileContentInfo.content.jmpUri === uri && curFileContentInfo.content.line === line && curFileContentInfo.content.symbolName === token) : false;
    }

    private isSameUri(uri: string): boolean {
        let curFileContentInfo = (this._historyIndex < this._history.length) ? this._history[this._historyIndex] : undefined;
        return (curFileContentInfo && curFileContentInfo.content) ? (curFileContentInfo.content.jmpUri === uri) : false;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        const editor = vscode.window.activeTextEditor;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor') // Add Monaco Editor resource path
            ]
        };
    
        // Generate HTML content using the _getHtmlForWebview method
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Add webview message processing
        webviewView.webview.onDidReceiveMessage(async message => {
            //console.log('[definition] webview message', message);
            switch (message.type) {
                case 'navigate':
                    this.navigate(message.direction);
                    break;
                case 'jumpDefinition':
                    if (editor && message.uri?.length > 0) {
                        if (this.isSameDefinition(message.uri, message.position.line, message.token)) {
                            // No processing required
                        } else {
                            // Cache click token text
                            this._currentSelectedText = message.token || '';

                            let definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                                'vscode.executeDefinitionProvider',
                                vscode.Uri.parse(message.uri),
                                new vscode.Position(message.position.line, message.position.character)
                            );

                            if (definitions && definitions.length > 0) {
                                console.log('[definition] jumpDefinition: ', definitions);
                                
                                // Actively hide the definition list (before processing new jumps)
                                if (this._view && definitions.length === 1) {
                                    this._view.webview.postMessage({
                                        type: 'clearDefinitionList'
                                    });
                                }
                                
                                // If there are multiple definitions, pass them to Monaco Editor
                                if (definitions.length > 1) {
                                    const currentPosition = new vscode.Position(message.position.line, message.position.character);
                                    const selectedDefinition = await this.showDefinitionPicker(definitions, editor, currentPosition);
                                    definitions = selectedDefinition ? [selectedDefinition] : [];
                                }
                                //console.log('[definition] jumpDefinition: ', message.token);
                                if (definitions && definitions.length > 0) {
                                    const contentInfo = await this._renderer.renderDefinitions(editor.document, definitions, message.token);
                                    this.updateContent(contentInfo);
                                    this.addToHistory(contentInfo, message.position.line);
                                    //console.log('[definition] jumpDefinition: ', contentInfo);
                                }
                            }
                        }
                    }
                    break;
                case 'doubleClick':
                    if (message.location === 'bottomArea') {
                        let curContext = this.getCurrentContent();
                        this.currentUri = (curContext && curContext.content)? vscode.Uri.parse(curContext.content.jmpUri) : undefined;
                        this.currentLine = (curContext && curContext.content)? curContext.content.line : 0;
                        if (this.currentUri) {
                            // Open the file
                            const document = await vscode.workspace.openTextDocument(this.currentUri);
                            const editor = await vscode.window.showTextDocument(document);
                            
                            // Jump to the specified line
                            const line = this.currentLine;//message.line - 1; // VSCode line numbers start at 0
                            const range = new vscode.Range(line, 0, line, 0);
                            
                            // Move the cursor and display the line
                            editor.selection = new vscode.Selection(range.start, range.start);
                            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                            this._currentCacheKey = createCacheKey(vscode.window.activeTextEditor);
                        }
                    }
                    break;
                case 'definitionItemSelected':
                    // Handle the situation where the definition list item is selected
                    //console.log('[definition] Definition item selected:', message);
                    
                    if (this._pickItems && message.index !== undefined) {
                        const selected = this._pickItems[message.index];
                        if (selected && editor) {
                            // Use the cached selected text instead of re-obtaining it
                            const selectedText = this._currentSelectedText;
                            
                            // Render the selected definition
                            this._renderer.renderDefinitions(editor.document, [selected.definition], selectedText).then(contentInfo => {
                                this.updateContent(contentInfo);
                                // Update the content of the history record, but keep the current line number
                                if (this._history.length > this._historyIndex) {
                                    this._history[this._historyIndex].content = contentInfo;
                                }
                            });
                        }
                    }
                    break;
                case 'closeDefinitionList':
                    // Handle the request to close the definition list
                    this._view?.webview.postMessage({
                        type: 'clearDefinitionList'
                    });
                    break;
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (this._view?.visible) {
                let curContext = this.getCurrentContent();
                //console.log('[definition] onDidChangeVisibility');
                // If we have cached content, restore it immediately
                if (curContext?.content) {
                    // Show loading
                    //this._view?.webview.postMessage({ type: 'startLoading' });
                    this._view.webview.postMessage({
                        type: 'update',
                        body: curContext.content.content,
                        uri: curContext.content.jmpUri,
                        languageId: curContext.content.languageId,
                        updateMode: this._updateMode,
                        scrollToLine: curContext.content.line + 1,
                        curLine: curContext.curLine + 1,
                        symbolName: curContext.content.symbolName
                    });
                    // Hide loading after content is updated
                    //this._view?.webview.postMessage({ type: 'endLoading' });
                }
                else {
                    // When there is no cached content, keep the Monaco editor in the "Ready for content." state
                    // Do not actively search for definitions, and do not display "No symbol found..."
                }
            } else {
                if (this._currentPanel) {
                    this._currentPanel.dispose();
                    this._currentPanel = undefined;
                }
            }
        });

        webviewView.onDidDispose(() => {
            this._view = undefined;
        });

        this.updateTitle();

        let curContext = this.getCurrentContent();

        // If there is cached content during initial loading, use it directly
        if (curContext?.content) {
            //console.log('[definition] Using cached content for initial load');
            // Show loading
            //this._view?.webview.postMessage({ type: 'startLoading' });
            this._view.webview.postMessage({
                type: 'update',
                body: curContext.content.content,
                languageId: curContext.content.languageId,
                updateMode: this._updateMode,
                scrollToLine: curContext.content.line + 1,
                curLine: curContext.curLine + 1,
                symbolName: curContext.content.symbolName
            });
            // Hide loading after content is updated
            //this._view?.webview.postMessage({ type: 'endLoading' });
        } else {
            //console.log('[definition] No cached content, keeping Ready for content state');
            // When there is no cached content, keep the Monaco editor in the "Ready for content." state and do not actively search for definitions
            // Definition lookup is triggered only when the user actively clicks on the symbol
        }
    }

    public pin() {
        this.updatePinned(true);
    }

    public unpin() {
        this.updatePinned(false);
    }

    public show() {
        if (!this._view) {
            vscode.commands.executeCommand('contextView.context.focus').then(() => {
            });
            return;
        }
        this._view.show?.();
    }

    private updatePinned(value: boolean) {
        if (this._pinned === value) {
            return;
        }

        this._pinned = value;
        vscode.commands.executeCommand('setContext', ContextWindowProvider.pinnedContext, value);

        this.update();
    }

    private updateTitle() {
        if (!this._view) {
            return;
        }
        this._view.description = this._pinned ? "(pinned)" : undefined;
    }
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the URI of the Monaco Editor resource
        const monacoScriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs')
        ).toString();
        
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        const nonce = getNonce();

        // Get the current theme
        const currentTheme = this._getVSCodeTheme();
        const editorConfiguration = this._getVSCodeEditorConfiguration();

        //console.log('[definition] ', currentTheme);
        //console.log('[definition] ', editorConfiguration);

        return /* html */`<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                style-src ${webview.cspSource} 'unsafe-inline';
                script-src 'nonce-${nonce}' 'unsafe-eval' ${webview.cspSource};
                img-src data: https: ${webview.cspSource};
                font-src ${webview.cspSource};
                ">

            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <style>
                .loading {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.08);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                }
                .loading.active {
                    display: flex;
                }
                .loading.show {
                    opacity: 1;
                }
                .loading::after {
                    content: '';
                    width: 20px;
                    height: 20px;
                    border: 2px solid #0078d4;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                body, html, #container {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    cursor: default !important; /* Force global hand cursor */
                    box-sizing: border-box; /* Add this line to ensure borders and padding are contained within the element width and height */
                }

                /* Add the following styles to ensure there is no top margin */
                body {
                    position: absolute;
                    top: 0;
                    left: 0;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                #container {
                    height: 100vh;
                    cursor: default !important; /* Force container hand cursor */
                    position: absolute;
                    top: 0;
                    left: 0;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                    overflow-x: auto !important; /* Add a horizontal scroll bar */
                    overflow-y: hidden; /* Keep vertical scrolling */
                }

                /* Scrollbar style specifically for Monaco Editor */
                .monaco-editor .monaco-scrollable-element .slider.horizontal {
                    height: 15px !important; /* Increase the height of the horizontal scroll bar */
                }
                
                /* Make sure the Monaco scrollbar container has enough height */
                .monaco-editor .monaco-scrollable-element .scrollbar.horizontal {
                    height: 18px !important; /* Scroll bar container height */
                    bottom: 0 !important;
                }

                /* Ensure that the Monaco editor content can be scrolled horizontally */
                .monaco-editor {
                    overflow-x: visible !important;
                }
                
                /* Ensure the editor content area can scroll horizontally */
                .monaco-editor .monaco-scrollable-element {
                    overflow-x: visible !important;
                }
                
                #main {
                    display: none;
                    padding: 10px;
                    cursor: default !important; /* Force the main content area to use the hand cursor */
                    margin-top: 0 !important;
                    overflow-x: auto !important; /* Add a horizontal scroll bar */
                }

                /* ========== Left list layout style ========== */
                #main-container {
                    display: flex;
                    flex-direction: row;
                    height: calc(100vh - 24px); /* Subtract the bottom navigation bar height */
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                }

                #definition-list {
                    width: 30%;
                    min-width: 150px;
                    max-width: 50%;
                    cursor: default !important;
                    background-color: var(--vscode-editor-background);
                    border-right: 1px solid var(--vscode-editorWidget-border);
                    overflow-y: auto;
                    overflow-x: auto;
                    resize: horizontal;
                    display: none; /* Hidden by default */
                    flex-direction: column;
                    padding-bottom: 10px;
                }

                /* todo: The following scroll bar controls can be removed. The actual scroll bar used is the browser's own scroll bar, which cannot be controlled by the following code */

                /* Adjust the vertical scroll bar to avoid covering the drag area */
                #definition-list::-webkit-scrollbar-track-piece:end {
                    margin-bottom: 10px;
                }

                #definition-list::-webkit-scrollbar-thumb {
                    background: rgba(128, 128, 128, 0);
                    border-radius: 4px;
                    transition: all 0.3s ease;
                    margin-bottom: 10px;
                }

                /* Defines the list scroll bar style */
                #definition-list::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                #definition-list::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 4px;
                }

                #definition-list::-webkit-scrollbar-thumb {
                    background: rgba(128, 128, 128, 0);
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                #definition-list:hover::-webkit-scrollbar-thumb {
                    background: rgba(128, 128, 128, 0.4);
                }

                #definition-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(128, 128, 128, 0.6);
                }

                #definition-list::-webkit-scrollbar-thumb:active {
                    background: rgba(128, 128, 128, 0.8);
                }

                #definition-list::-webkit-scrollbar-corner {
                    background: transparent;
                }

                /* List item container scroll bar style */
                #definition-list .list-items::-webkit-scrollbar {
                    width: 6px;
                }

                #definition-list .list-items::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 3px;
                }

                #definition-list .list-items::-webkit-scrollbar-thumb {
                    background: rgba(128, 128, 128, 0);
                    border-radius: 3px;
                    transition: all 0.3s ease;
                }

                #definition-list .list-items:hover::-webkit-scrollbar-thumb {
                    background: rgba(128, 128, 128, 0.3);
                }

                #definition-list .list-items::-webkit-scrollbar-thumb:hover {
                    background: rgba(128, 128, 128, 0.5);
                }

                #definition-list .list-header {
                    padding: 8px 12px;
                    background-color: var(--vscode-editorGroupHeader-tabsBackground);
                    border-bottom: 1px solid var(--vscode-editorWidget-border);
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    flex-shrink: 0;
                }

                #definition-list .list-items {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: visible;
                    width: max-content;
                    min-width: 100%;
                }

                .definition-item {
                    padding: 4px 6px;
                    cursor: pointer;
                    color: var(--vscode-foreground);
                    font-size: 13px;
                    transition: background-color 0.2s ease;
                    white-space: nowrap;
                    overflow: visible;
                    flex-shrink: 0;
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    min-height: 16px;
                }

                .definition-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    color: var(--vscode-list-hoverForeground);
                }

                .definition-item.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }

                .definition-item .definition-number {
                    font-weight: bold;
                    margin-right: 10px;
                    color: inherit;
                }

                .definition-item .definition-info {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .definition-item .file-path {
                    color: inherit;
                    font-weight: bold;
                }

                .definition-item .line-info {
                    color: inherit;
                    margin-left: 4px;
                }

                #container {
                    flex: 1;
                    position: relative;
                }
                
                /* ========== Bottom navigation bar style ========== */
                .nav-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    background-color: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-editorWidget-border);
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: 8px;
                    z-index: 1000;
                    padding-left: 20px; /* Add left padding */
                }

                .nav-button {
                    background-color: transparent;
                    color: var(--vscode-editor-foreground);
                    border: none;
                    padding: 0;
                    cursor: default;
                    width: 24px;
                    height: 16px;
                    position: relative;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    opacity: 0.7;
                }

                .nav-button:hover {
                    background-color: var(--vscode-editorWidget-background);
                    opacity: 1;
                }

                .nav-button::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 8px;
                    height: 8px;
                    border: 2px solid var(--vscode-editor-foreground);
                    border-top: none;
                    border-right: none;
                    transform: translate(-50%, -50%) rotate(45deg);
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }

                #nav-forward::before {
                    transform: translate(-50%, -50%) rotate(225deg);
                }

                .nav-button:hover::before {
                    opacity: 1;
                }

                .nav-jump {
                    background-color: transparent;
                    color: var(--vscode-editor-foreground);
                    border: none;
                    padding: 0;
                    cursor: default;
                    width: 24px;
                    height: 16px;
                    position: relative;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                    opacity: 0.7;
                }

                .nav-jump:hover {
                    background-color: var(--vscode-editorWidget-background);
                    opacity: 1;
                }
                .nav-jump::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 8px;
                    height: 8px;
                    border: 2px solid var(--vscode-editor-foreground);
                    border-bottom: none;
                    border-right: none;
                    transform: translate(-50%, -50%) rotate(45deg);
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                .nav-jump:hover::before {
                    opacity: 1;
                }
                /* Add double click area style */
                .double-click-area {
                    position: fixed;
                    bottom: 0; /* Consistent with the navigation bar height */
                    left: 120px;
                    right: 0;
                    height: 24px;
                    z-index: 1001;
                    cursor: default;
                    background-color: rgba(89, 255, 0, 0.11); /* For debugging, removable */
                    display: flex;
                    align-items: left;
                    justify-content: left;
                    color: rgba(128, 128, 128, 0.8);
                    font-size: 14px;
                    font-style: italic;
                    padding-left: 10px;
                }
                /* Add file name display style */
                .filename-display {
                    text-align: left;
                    color: rgba(128, 128, 128, 0.8);
                    font-size: 14px;
                    font-weight: normal;
                    font-style: normal;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: pre;
                    z-index: 1002;
                    padding-left: 0px;
                }
            </style>

            <link href="${styleUri}" rel="stylesheet">
            
            <title>Definition View</title>
        </head>
        <body>
            <div class="loading"></div>
            <article id="main">loading...</article>
            
            <!-- Main container: list on the left + Monaco editor on the right -->
            <div id="main-container">
                <!-- Left side definition list -->
                <div id="definition-list">
                    <div class="list-items">
                        <!-- The definition list will be populated dynamically via JavaScript -->
                    </div>
                </div>
                
                <!-- Monaco editor on the right -->
                <div id="container"></div>
            </div>

            <!-- Add double click area -->
            <div class="double-click-area" title="double-click: Jump to definition">
                <span class="filename-display"></span>
            </div>
            
            <!-- Add a simple init script for debugging and passing Monaco paths -->
            <script nonce="${nonce}">
                //console.log('[definition] HTML loaded');
                window.monacoScriptUri = '${monacoScriptUri}';
                //console.log('[definition] Monaco path set to:', window.monacoScriptUri);

                // Set the current theme - make sure to use a valid Monaco theme name
                window.vsCodeTheme = '${currentTheme}';
                //console.log('[definition] Theme set to:', window.vsCodeTheme);
                
                // Pass the full editor configuration - use try-catch to avoid JSON serialization errors
                try {
                    window.vsCodeEditorConfiguration = ${JSON.stringify(editorConfiguration)};
                    //console.log('[definition] Editor configuration loaded', window.vsCodeEditorConfiguration);
                } catch (error) {
                    console.error('[definition] Failed to parse editor configuration:', error);
                    window.vsCodeEditorConfiguration = { 
                        editorOptions: {}, 
                        theme: '${currentTheme}' 
                    };
                }
            </script>
            
            <!-- Load our main script, which will dynamically load Monaco -->
            <script type="module" nonce="${nonce}" src="${scriptUri}" onerror="console.error('[definition] Failed to load main.js'); document.getElementById('main').innerHTML = '<div style=\\'color: red; padding: 20px;\\'>Failed to load main.js</div>'"></script>
            
            <!-- Add bottom navigation bar -->
            <div class="nav-bar">
                <button class="nav-button" id="nav-back" title="Go Back">  </button>
                <button class="nav-button" id="nav-forward" title="Go Forward">  </button>
                <button class="nav-jump" id="nav-jump" title="Jump to definition"></button>
            </div>

            <script nonce="${nonce}">
                // Navigation button event processing
                const backButton = document.getElementById('nav-back');
                const forwardButton = document.getElementById('nav-forward');
                const jumpButton = document.getElementById('nav-jump');

                backButton.addEventListener('click', () => {
                    window.vscode.postMessage({
                        type: 'navigate',
                        direction: 'back'
                    });
                });

                forwardButton.addEventListener('click', () => {
                    window.vscode.postMessage({
                        type: 'navigate',
                        direction: 'forward'
                    });
                });

                jumpButton.addEventListener('click', () => {
                    window.vscode.postMessage({
                        type: 'doubleClick',
                        location: 'bottomArea'
                    });
                });

                // Update button status
                function updateNavButtons(canGoBack, canGoForward) {
                    backButton.disabled = !canGoBack;
                    forwardButton.disabled = !canGoForward;
                }
                // Double click event handling
                const doubleClickArea = document.querySelector('.double-click-area');
                doubleClickArea.addEventListener('dblclick', () => {
                    //console.log('[definition] doubleClickArea');
                    window.vscode.postMessage({
                        type: 'doubleClick',
                        location: 'bottomArea'
                    });
                });
                doubleClickArea.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                const navArea = document.querySelector('.nav-bar');
                navArea.addEventListener('contextmenu', e => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            </script>
        </body>
        </html>`;
    }

    // Add method to wait for panel to be ready
    private waitForPanelReady(): Promise<void> {
        return new Promise((resolve) => {
            if (!this._view) {
                resolve();
                return;
            }

            // Set timeout to avoid infinite waiting
            const timeout = setTimeout(() => {
                resolve();
            }, 5000); // 5 seconds timeout

            // Listen for confirmation messages from the panel
            const messageListener = this._view.webview.onDidReceiveMessage((message) => {
                if (message.type === 'contentReady') {
                    clearTimeout(timeout);
                    messageListener.dispose();
                    resolve();
                }
            });
        });
    }

    private async updateContent(contentInfo?: FileContentInfo, curLine: number =-1) {
        //console.log('[definition] updateContent', contentInfo);
        if (contentInfo && contentInfo.content.length && contentInfo.jmpUri) {
            //console.log(`definition: update content ${contentInfo.content}`);
            //console.log(`definition: update content ${curLine}`);
            // Show loading
            //this._view?.webview.postMessage({ type: 'startLoading' });

            this._view?.webview.postMessage({
                type: 'update',
                body: contentInfo.content,
                uri: contentInfo.jmpUri.toString(),
                languageId: contentInfo.languageId, // Add Language ID
                updateMode: this._updateMode,
                scrollToLine: contentInfo.line + 1,
                curLine: (curLine !== -1) ? curLine + 1 : -1,
                symbolName: contentInfo.symbolName // Adding a symbol name
            });

            // Hide loading after content is updated
            //this._view?.webview.postMessage({ type: 'endLoading' });
            // Wait for the panel to confirm that the rendering is complete
            await this.waitForPanelReady();
        } else {
            this._view?.webview.postMessage({
                type: 'noContent',
                body: '&nbsp;&nbsp;No symbol found at current cursor position',
                updateMode: this._updateMode,
            });
        }
    }

    private async update(ignoreCache = false) {
        if (!this._view?.visible) {
            //console.log('[definition] update no view');
            return;
        }

        this.updateTitle();

        if (this._pinned) {
            //console.log('[definition] update pinned');
            return;
        }

        const newCacheKey = createCacheKey(vscode.window.activeTextEditor);
        if (!ignoreCache && cacheKeyEquals(this._currentCacheKey, newCacheKey)) {
            //console.log('[definition] the same cache key');
            return;
        }

        // Cancel any existing loading
        if (this._loading) {
            this._loading.cts.cancel();
            this._loading = undefined;
        }

        // Check if there is a valid selection
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            //console.log('[definition] update no editor');
            return;
        }
        
        //console.log('[definition] update');
        const loadingEntry = { cts: new vscode.CancellationTokenSource() };
        this._loading = loadingEntry;

        const updatePromise = (async () => {
            const contentInfo = await this.getHtmlContentForActiveEditor(loadingEntry.cts.token);
            if (loadingEntry.cts.token.isCancellationRequested) {
                return;
            }

            if (this._loading !== loadingEntry) {
                // A new entry has started loading since we started
                return;
            }
            this._loading = undefined;
            
            if (contentInfo.jmpUri) {
                this.currentUri = vscode.Uri.parse(contentInfo.jmpUri);
                this.currentLine = contentInfo.line;

                this._currentCacheKey = newCacheKey;
            }
            
            if (this._updateMode === UpdateMode.Live || contentInfo.jmpUri) {
                this._history = [];
                this._history.push({ content: contentInfo, curLine: this.currentLine });
                this._historyIndex = 0;

                this.updateContent(contentInfo);
            }
        })();

        await Promise.race([
            updatePromise,

            // Don't show progress indicator right away, which causes a flash
            new Promise<void>(resolve => setTimeout(resolve, 0)).then(() => {
                if (loadingEntry.cts.token.isCancellationRequested) {
                    return;
                }
                return vscode.window.withProgress({ location: { viewId: ContextWindowProvider.viewType } }, () => updatePromise);
            }),
        ]);
    }

    // Modify the selection event handling method
    private async getHtmlContentForActiveEditor(token: vscode.CancellationToken): Promise<FileContentInfo> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            //console.log('No editor');
            // Around line 452, there's likely a return statement like this:
            // It needs to be updated to include the languageId property:
            return { content: '', line: 0, column: 0, jmpUri: '', languageId: 'plaintext', symbolName: '' };
        }
        // Get the current cursor position
        const position = editor.selection.active;
        
        // Get the range of words or identifiers under the current cursor position
        const wordRange = editor.document.getWordRangeAtPosition(position);

        // Get the text content in the range
        const selectedText = wordRange ? editor.document.getText(wordRange) : '';
        this._currentSelectedText = selectedText; // Cache selected text
        //vscode.window.showInformationMessage(`Selected text: ${selectedText}`);

        let definitions = await this.getDefinitionAtCurrentPositionInEditor(editor);

        if (token.isCancellationRequested || !definitions || definitions.length === 0) {
            //console.log('[definition] No definitions found');
            return { content: '', line: 0, column: 0, jmpUri: '', languageId: 'plaintext', symbolName: '' };
        }

        // Make sure to close the previous panel
        if (this._currentPanel) {
            this._currentPanel.dispose();
            this._currentPanel = undefined;
        }

        if (definitions.length > 1) {
            const currentPosition = editor.selection.active;
            const selectedDefinition = await this.showDefinitionPicker(definitions, editor, currentPosition);
            if (!selectedDefinition) {
                return { content: '', line: 0, column: 0, jmpUri: '', languageId: 'plaintext', symbolName: '' };
            }
            definitions = [selectedDefinition];
        } else {
            // Actively hide definition lists
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'clearDefinitionList'
                });
            }
        }

        //console.log(definitions);
        return definitions.length ? await this._renderer.renderDefinitions(editor.document, definitions, selectedText) : {
            content: '',
            line: 0,
            column: 0,
            jmpUri: '',
            languageId: 'plaintext',
            symbolName: ''
        };
    }

    private async getDefinitionAtCurrentPositionInEditor(editor: vscode.TextEditor) {
        return await vscode.commands.executeCommand<vscode.Location[]>(
           'vscode.executeDefinitionProvider',
           editor.document.uri,
           editor.selection.active
        );
    }

    private updateConfiguration() {
        const config = vscode.workspace.getConfiguration('contextView');
        this._updateMode = config.get<UpdateMode>('contextWindow.updateMode') || UpdateMode.Sticky;
    }

    private async showDefinitionPicker(definitions: any[], editor: vscode.TextEditor, currentPosition?: vscode.Position): Promise<any> {
        // Prepare to define list data and send it to 'webview'
        try {
            const definitionListData = await Promise.all(definitions.map(async (definition, index) => {
                try {
                    let def = definition;
                    let uri = (def instanceof vscode.Location) ? def.uri : def.targetUri;
                    let range = (def instanceof vscode.Location) ? def.range : (def.targetSelectionRange ?? def.targetRange);

                    // Use full path
                    const displayPath = uri.fsPath;

                    // Get symbol name
                    const document = await vscode.workspace.openTextDocument(uri);
                    const wordRange = document.getWordRangeAtPosition(new vscode.Position(range.start.line, range.start.character));
                    const symbolName = wordRange ? document.getText(wordRange) : `Definition ${index + 1}`;

                                            return {
                            title: symbolName,
                            location: `${displayPath}:${range.start.line + 1}`,
                            filePath: displayPath, // Use file system paths instead of URIs
                            lineNumber: range.start.line,
                            columnNumber: range.start.character + 1, // Add column number information (convert to 1-based)
                            isActive: index === 0, // The first definition is activated by default
                            definition: definition,
                            uri: uri.toString(),
                            startLine: range.start.line,
                            startCharacter: range.start.character
                        };
                } catch (error) {
                    return null;
                }
            }));
            
            // Filter out 'null' items
            const validDefinitions = definitionListData.filter(item => item !== null);
            
            // Cache definition items for subsequent use
            this._pickItems = validDefinitions;
            
            // Send definition list data to 'webview' only when there are multiple definitions
            if (this._view && validDefinitions.length > 1) {
                // Try to find the definition that best matches the current position as the default choice
                const currentFileUri = editor.document.uri.toString();
                let defaultIndex = 0;
                let bestMatch = -1;
                let minDistance = Number.MAX_SAFE_INTEGER;
                
                // If there is current location information, perform an exact match
                if (currentPosition) {
                    for (let i = 0; i < validDefinitions.length; i++) {
                        const def = validDefinitions[i];
                        if (def && def.uri === currentFileUri) {
                            // Calculate the position distance (difference in number of rows * 1000 + Column number difference)
                            const lineDiff = Math.abs(def.startLine - currentPosition.line);
                            const charDiff = Math.abs(def.startCharacter - currentPosition.character);
                            const distance = lineDiff * 1000 + charDiff;
                            
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestMatch = i;
                            }
                        }
                    }
                }
                
                // If a best match is found, use it; otherwise look for the first definition in the same file.
                if (bestMatch !== -1) {
                    defaultIndex = bestMatch;
                } else {
                    // Fallback to file matching
                    for (let i = 0; i < validDefinitions.length; i++) {
                        const def = validDefinitions[i];
                        if (def && def.uri === currentFileUri) {
                            defaultIndex = i;
                            break;
                        }
                    }
                }
                
                // Update activation status
                validDefinitions.forEach((def, index) => {
                    if (def) {
                        def.isActive = index === defaultIndex;
                    }
                });
                
                this._view.webview.postMessage({
                    type: 'updateDefinitionList',
                    definitions: validDefinitions
                });
                
                // Returns the definition that matches the current position
                return validDefinitions[defaultIndex] && validDefinitions[defaultIndex]?.definition ? validDefinitions[defaultIndex]!.definition : (validDefinitions[0]?.definition || definitions[0]);
            }
            
            // Returns the first definition as the default selection
            return validDefinitions.length > 0 && validDefinitions[0] ? validDefinitions[0].definition : definitions[0];
            
        } catch (error) {
            //console.error('Error preparing definitions:', error);
            return definitions[0]; // On error, returns the first definition
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

type CacheKey = typeof cacheKeyNone | DocumentCacheKey;

const cacheKeyNone = { type: 'none' } as const;

class DocumentCacheKey {
    readonly type = 'document';

    constructor(
        public readonly url: vscode.Uri,
        public readonly version: number,
        public readonly wordRange: vscode.Range | undefined,
    ) { }

    public equals(other: DocumentCacheKey): boolean {
        if (this.url.toString() !== other.url.toString()) {
            return false;
        }

        if (this.version !== other.version) {
            return false;
        }

        if (other.wordRange === this.wordRange) {
            return true;
        }

        if (!other.wordRange || !this.wordRange) {
            return false;
        }

        return this.wordRange.isEqual(other.wordRange);
    }
}

function cacheKeyEquals(a: CacheKey, b: CacheKey): boolean {
    if (a === b) {
        return true;
    }

    if (a.type !== b.type) {
        return false;
    }

    if (a.type === 'none' || b.type === 'none') {
        return false;
    }

    return a.equals(b);
}

function createCacheKey(editor: vscode.TextEditor | undefined): CacheKey {
    if (!editor) {
        return cacheKeyNone;
    }

    return new DocumentCacheKey(
        editor.document.uri,
        editor.document.version,
        editor.document.getWordRangeAtPosition(editor.selection.active));
}
