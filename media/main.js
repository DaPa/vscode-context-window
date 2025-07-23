//@ts-check

// Import language configuration
import { languageConfig_js, languageConfig_cpp, languageConfig_cs } from './languageConfig.js';

// Monaco Editor initialization and message processing
(function() {
    const vscode = acquireVsCodeApi();
    window.vscode = vscode;
    //console.log('[definition] WebView script started from main.js');

    // Make sure WebView uses VS Code's color theme
    //document.body.classList.add('vscode-light', 'vscode-dark', 'vscode-high-contrast');
    
    // Display loading status
    document.getElementById('main').style.display = 'block';
    document.getElementById('main').innerHTML = 'Loading editor...';
    document.getElementById('container').style.display = 'none';
    
    // Add error handling
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('[definition] Global error:', message, 'at', source, lineno, colno, error);
        document.getElementById('main').style.display = 'block';
        document.getElementById('main').innerHTML = `<div style="color: red; padding: 20px;">Loading error: ${message}</div>`;
        return true;
    };
    
    try {
        // Try to get the Monaco path from the window object
        const monacoPath = window.monacoScriptUri || '../node_modules/monaco-editor/min/vs';
        //console.log('[definition] Using Monaco path:', monacoPath);

        let uri = '';
        let content = '';
        let language = '';

        // Add highlight style
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .highlighted-line {
                background-color: rgba(173, 214, 255, 0.25);
            }
            .highlighted-glyph {
                background-color: #0078d4;
                width: 5px !important;
                margin-left: 3px;
            }
            .highlighted-symbol {
                background-color: #198844!important;
                color: #ffffff!important;
                font-weight: bold!important;
                border: 1px solid #5bdb0791 !important;
                border-radius: 2px;
                padding: 0 2px;
                text-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
            }
            .ctrl-hover-link {
                text-decoration: underline;
                text-decoration-color: #0000ff;
                font-weight: bold!important;
            }
            .ctrl-hover-link-dark {
                text-decoration: underline;
                text-decoration-color: #ffffff;
                font-weight: bold!important;
            }
            .monaco-editor {
                cursor: pointer !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
            }
            #main {
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                font-family: var(--vscode-editor-font-family);
                font-size: var(--vscode-editor-font-size);
                padding: 20px;
            }
            body {
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Dynamically load Monaco loader.js
        const loaderScript = document.createElement('script');
        loaderScript.src = `${monacoPath}/loader.js`;
        loaderScript.onload = function() {
            //console.log('[definition] Monaco loader.js loaded');
            
            // Now it's safe to use require
            require.config({ 
                paths: { 'vs': monacoPath }
            });
            
            //console.log('[definition] Require.js configured, attempting to load Monaco');
            
            // Initialize the editor
            require(['vs/editor/editor.main'], function() {
                //console.log('[definition] Monaco editor loaded');

                let light = window.vsCodeEditorConfiguration?.theme === 'vs';

                // If there are custom theme rules
                if (window.vsCodeEditorConfiguration && window.vsCodeEditorConfiguration.customThemeRules) {
                    const contextEditorCfg = window.vsCodeEditorConfiguration.contextEditorCfg || {};
                    // Define a custom theme
                    monaco.editor.defineTheme('custom-vs', {
                        base: light ? 'vs' : 'vs-dark',  // based on vs theme
                        inherit: true,  // Inherit the rules of the base theme
                        rules: window.vsCodeEditorConfiguration.customThemeRules,
                        colors: {
                            "editor.selectionBackground": contextEditorCfg.selectionBackground || "#07c2db71",// #ffb7007f
                            //"editor.selectionForeground": "#ffffffff",
                            "editor.inactiveSelectionBackground": contextEditorCfg.inactiveSelectionBackground || "#07c2db71",
                            "editor.selectionHighlightBackground": contextEditorCfg.selectionHighlightBackground || "#5bdb0771",// Ffb700a0
                            "editor.selectionHighlightBorder": contextEditorCfg.selectionHighlightBorder || "#5bdb0791",
                            "editor.findMatchBackground": "#F4D03F",
                            //"editor.background": "#e6e6e6",
                        }
                    });
                    
                    // Use a custom theme
                    window.vsCodeTheme = 'custom-vs';
                }
                
                                                    // Hide the loading state and display the editor container
                document.getElementById('main').style.display = 'none';
                document.getElementById('main-container').style.display = 'flex';
                
                // Display the Monaco editor when initializing (display "Ready for content.")
                document.getElementById('container').style.display = 'block';
                document.getElementById('main').style.display = 'none';
                
                try {
                    //console.log('[definition] editor settings: ', window.vsCodeEditorConfiguration);
                    //console.log('[definition] theme settings: ', window.vsCodeTheme);

                    var openerService = {
                        open: function (resource, options) {
                            // do something here, resource will contain the Uri
                            //console.log('[definition] open service: ', resource);
                        }
                    };

                    // Handle VS Code editor configuration
                    const createEditorOptions = () => {
                        const vsCodeConfig = window.vsCodeEditorConfiguration?.editorOptions || {};
                        
                        // Basic configuration
                        const baseOptions = {
                            value: 'Ready for content.',
                            language: 'plaintext',
                            readOnly: true,
                            theme: window.vsCodeTheme || 'vs',
                            automaticLayout: true
                        };

                        // Extract relevant options from VS Code configuration
                        const {
                            fontSize,
                            fontFamily,
                            lineHeight,
                            letterSpacing,
                            tabSize,
                            insertSpaces,
                            wordWrap,
                            minimap,
                            scrollBeyondLastLine,
                            lineNumbers,
                            renderWhitespace,
                            cursorStyle,
                            cursorWidth,
                            cursorBlinking,
                            links,
                            mouseWheelZoom,
                            smoothScrolling,
                            tokenColorCustomizations,
                            ...otherOptions
                        } = vsCodeConfig;

                        return {
                            ...baseOptions,
                            // Font related
                            fontSize,
                            fontFamily,
                            lineHeight,
                            letterSpacing,
                            // Editor behavior
                            tabSize,
                            insertSpaces,
                            wordWrap,
                            // View options
                            minimap: minimap || { enabled: false },
                            scrollBeyondLastLine: scrollBeyondLastLine ?? false,
                            lineNumbers: lineNumbers || 'on',
                            renderWhitespace: renderWhitespace || 'true',
                            // Cursor options
                            cursorStyle: 'pointer',
                            mouseStyle: 'pointer',
                            smoothScrolling: smoothScrolling ?? true,
                            tokenColorCustomizations,
                            // Other valid options
                            ...otherOptions,
                            hover: {
                                enabled: true,
                                above: true,
                                delay: 200,
                                sticky: true
                            },
                            // Enable quick suggestions
                            quickSuggestions: true,
                            // Enable navigation history
                            history: {
                                undoStopAfter: false,
                                undoStopBefore: false
                            },
                        };
                    };
                    
                    // Create an editor instance
                    const editor = monaco.editor.create(document.getElementById('container'), createEditorOptions(),
                    {
                        openerService: openerService
                    });

                    // Add ResizeObserver to monitor container size changes (only used for re-layout when dragging the separator bar)
                    const containerElement = document.getElementById('container');
                    if (containerElement && window.ResizeObserver) {
                        const resizeObserver = new ResizeObserver(() => {
                            // When the container size changes, re-layout the Monaco editor
                            if (editor) {
                                editor.layout();
                            }
                        });
                        resizeObserver.observe(containerElement);
                        
                        // Make sure to clean up the ResizeObserver when the editor is destroyed
                        editor.onDidDispose(() => {
                            resizeObserver.disconnect();
                        });
                    }

                    // Add configuration to disable selection
                    editor.updateOptions({
                        readOnly: true,
                        domReadOnly: true,
                        mouseStyle: 'pointer',
                        cursorWidth: 0,
                        selectOnLineNumbers: true,
                        selectionClipboard: true,    // Disable selection to clipboard
                        contextmenu: false,           // Disable right-click menu
                        links: false,  // Disable all link functions
                        quickSuggestions: false,  // Disable quick suggestions
                        keyboardHandler: null,       // disable keyboard handling
                        find: {                     // Disable the find function
                            addExtraSpaceOnTop: false,
                            autoFindInSelection: 'never',
                            seedSearchStringFromSelection: 'select'
                        }
                    });

                    // Force the mouse style to be set
                    const forcePointerCursor = (isOverText = false) => {
                        const editorContainer = editor.getDomNode();
                        if (editorContainer) {
                            // Set different cursor styles depending on whether you are hovering over text
                            const cursorStyle = isOverText ? 'pointer' : 'default';
                            editorContainer.style.cursor = cursorStyle;
                            
                            // Traverse all child elements and set the cursor style
                            const elements = editorContainer.querySelectorAll('*');
                            elements.forEach(el => {
                                el.style.cursor = cursorStyle;
                            });
                        }
                    };

                    // Set to the default cursor during initialization
                    forcePointerCursor(false);

                    // Define the language list using JavaScript provider as default
                    const defaultLanguages = [
                        'python', 'java', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'perl', 'lua', 'vb', 'vbnet', 'cobol', 'fortran', 'pascal', 'delphi', 'ada',
                        'erlang', 
                    ];

                    // Set up the JavaScript provider for the default language
                    defaultLanguages.forEach(lang => {
                        monaco.languages.setMonarchTokensProvider(lang, languageConfig_js);
                    });

                    // Define a custom token provider for JavaScript
                    monaco.languages.setMonarchTokensProvider('javascript', languageConfig_js);
                    monaco.languages.setMonarchTokensProvider('typescript', languageConfig_js);

                    // Define a custom token provider for C/C++
                    monaco.languages.setMonarchTokensProvider('cpp', languageConfig_cpp);
                    monaco.languages.setMonarchTokensProvider('c', languageConfig_cpp);

                    monaco.languages.setMonarchTokensProvider('csharp', languageConfig_cs);

                    // Add a simple token detection function
                    // function logTokenInfo() {
                    //     const testCode = 'AA::BB::CC a, b, c = 0;';//editor.getValue();
                    //     const languageId = editor.getModel().getLanguageId();
                        
                    //     console.log('[definition] Test code:', testCode);
                    //     console.log('[definition] Language ID:', languageId);
                        
                    //     // Use Monaco's tokenize function to parse the code
                    //     const tokens = monaco.editor.tokenize(testCode, languageId);
                        
                    //     console.log('[definition] Token parsing result:', tokens);
                        
                    //     // Print each token in detail
                    //     if (tokens && tokens.length > 0) {
                    //         let lastOffset = 0;
                    //         tokens[0].forEach(token => {
                    //             const tokenType = token.type;
                    //             const startOffset = lastOffset;
                    //             const endOffset = token.offset || testCode.length;
                    //             const tokenText = testCode.substring(startOffset, endOffset);
                    //             lastOffset = endOffset;
                                
                    //             console.log(`[definition] Token: "${tokenType}",  : "${tokenText}"`);
                    //         });
                    //     } else {
                    //         console.log('[definition] token information not found');
                    //     }
                    // }

                    // // Reset in scenarios where the style may be reset
                    // editor.onDidChangeModelContent(() => {
                    //     console.log('[definition] Editor content has changed, token parsing result:');
                    //     logTokenInfo();
                    // });
                    //editor.onDidScrollChange(forcePointerCursor);
                    //editor.onDidChangeConfiguration(forcePointerCursor);

                    // Check 'readOnly' setting
                    //console.log('[definition]cursor type:', editor.getOption(monaco.editor.EditorOption.mouseStyle));

                    // Add the following code after creating the editor instance
                    editor._standaloneKeybindingService.addDynamicKeybinding(
                        '-editor.action.openLink',
                        null,
                        () => {} // Empty function, prevents Ctrl+Click from jumping
                    );

                    // Disable keyboard events completely
                    // editor.onKeyDown((e) => {
                    //     // Allow Ctrl+C to copy
                    //     // if (e.ctrlKey && e.code === 'KeyC') {
                    //     //     return;
                    //     // }
                    //     // e.preventDefault();
                    //     // e.stopPropagation();
                    // });

                    // Disable selection completely
                    // editor.onDidChangeCursorSelection(() => {
                    //     // Get the current cursor position
                    //     const position = editor.getPosition();
                    //     if (position) {
                    //         // Set the selection range to the cursor position
                    //         editor.setSelection({
                    //             startLineNumber: position.lineNumber,
                    //             startColumn: position.column,
                    //             endLineNumber: position.lineNumber,
                    //             endColumn: position.column
                    //         });
                    //     }
                    // });

                    const editorDomNode = editor.getDomNode();
                    if (editorDomNode) {
                        editorDomNode.addEventListener('dblclick', (e) => {
                            if (e.target && (
                                e.target.tagName === 'TEXTAREA' && e.target.className === 'input' ||
                                e.target.getAttribute('aria-label') === 'Find' ||
                                e.target.getAttribute('placeholder') === 'Find' ||
                                e.target.getAttribute('title') === 'Find'
                            )) {
                                return true;
                            }
                            //e.preventDefault();
                            //e.stopPropagation();
                            //console.log('[definition] DOM level intercepts double-click event', e.target);
                            
                            if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
                                vscode.postMessage({
                                    type: 'doubleClick',
                                    location: 'bottomArea'
                                });
                            }

                            return true;
                        }, true); // Use the capture phase to ensure that the event is intercepted before it reaches Monaco

                        editorDomNode.addEventListener('contextmenu', (e) => {
                                if (e.ctrlKey) {
                                    // Ctrl+right click to manually pop up the Monaco menu
                                    // Need to call Monaco's menu API
                                    // The following is a common practice (different versions of the API are slightly different)
                                    if (editor._contextMenuService) {
                                        // 6.x/7.x version
                                        editor._contextMenuService.showContextMenu({
                                            getAnchor: () => ({ x: e.clientX, y: e.clientY }),
                                            getActions: () => editor._getMenuActions(),
                                            onHide: () => {},
                                        });
                                    } else if (editor.trigger) {
                                        // Old version
                                        editor.trigger('keyboard', 'editor.action.showContextMenu', {});
                                    }
                                } else {
                                    // Normal right click, execute your own logic
                                    editor.focus();
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Write your own right-click menu logic here
                                    //console.log('Custom right-click menu');
                                }
                            }, true);
                    }

                    editorDomNode.addEventListener('selectstart', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }, true);

                    // Process the mouse side buttons
                    editor.getDomNode().addEventListener('auxclick', (e) => {
                        //console.log('[definition] auxclick:', e);
                        // Prevent default behavior
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.button === 3) { // Mouse back button
                            vscode.postMessage({
                                type: 'navigate',
                                direction: 'back'
                            });
                        } else if (e.button === 4) { // Mouse forward button
                            vscode.postMessage({
                                type: 'navigate',
                                direction: 'forward'
                            });
                        }
                    });

                    // editor.onMouseDown((e) => {
                    //     e.event.preventDefault();
                    //     e.event.stopPropagation();
                    //     //console.log('[definition] onMouseDown: ', e);
                    //     return false;  // Prevent default processing
                    // });

                    // editor.onMouseLeave((e) => {
                    //     e.event.preventDefault();
                    //     e.event.stopPropagation();
                    //     forcePointerCursor(false);
                    //     return false;  // Prevent default processing
                    // });

                    // Add mouse hover event handling
                    let currentDecorations = [];
                    editor.onMouseMove((e) => {
                        // Use the default cursor by default
                        let isOverText = false;

                        // Get the current word
                        const model = editor.getModel();
                        const position = e.target.position;
                        if (model && position && e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
                            const word = model.getWordAtPosition(position);
                            if (word) {
                                // Hover the mouse over the text, using the hand cursor
                                isOverText = true;
                                // Add new decoration
                                currentDecorations = editor.deltaDecorations(currentDecorations, [{
                                    range: new monaco.Range(
                                    position.lineNumber,
                                    word.startColumn,
                                    position.lineNumber,
                                    word.endColumn
                                    ),
                                    options: {
                                        inlineClassName: light ? 'ctrl-hover-link' : 'ctrl-hover-link-dark'
                                    }
                                }]);

                                // Clear the decoration when the mouse moves out
                                const container = editor.getDomNode();
                                if (container) {
                                    container.addEventListener('mouseleave', () => {
                                        currentDecorations = editor.deltaDecorations(currentDecorations, []);
                                    }, { once: true });
                                }
                            }
                        } else {
                            // Clear the decoration when the Ctrl key is not pressed
                            currentDecorations = editor.deltaDecorations(currentDecorations, []);
                        }
                        // Update the cursor style based on the mouse position
                        forcePointerCursor(isOverText);

                        return true;

                        // if (isOverText) {
                        //     e.event.preventDefault();
                        //     e.event.stopPropagation();
                        //     return false;  // Preventing default processing
                        // }
                        // else {
                        //     return true;
                        // }
                    });

                    // Completely disable define jump functionality
                    editor._standaloneKeybindingService.addDynamicKeybinding(
                        '-editor.action.goToDefinition',
                        null,
                        () => {} // Empty function, prevent jump
                    );

                    // Add the following code after creating the editor instance
                    const originalGetDefinitionsAtPosition = editor._codeEditorService.getDefinitionsAtPosition;
                    editor._codeEditorService.getDefinitionsAtPosition = function(model, position, token) {
                        // Returns an empty array, indicating that there is no definition to jump to
                        return Promise.resolve([]);
                    };

                    // Override peek implementation
                    const originalPeekDefinition = editor._codeEditorService.peekDefinition;
                    editor._codeEditorService.peekDefinition = function(model, position, token) {
                        // Returns an empty array, indicating that there is no definition to peek
                        return Promise.resolve([]);
                    };

                    // Override reference implementation
                    const originalFindReferences = editor._codeEditorService.findReferences;
                    editor._codeEditorService.findReferences = function(model, position, token) {
                        // Returns an empty array, indicating that there are no references to find
                        return Promise.resolve([]);
                    };

                    // Override implementation
                    const originalFindImplementations = editor._codeEditorService.findImplementations;
                    editor._codeEditorService.findImplementations = function(model, position, token) {
                        // Returns an empty array, indicating that there is no implementation to find
                        return Promise.resolve([]);
                    };

                    // Override type definition implementation
                    const originalFindTypeDefinition = editor._codeEditorService.findTypeDefinition;
                    editor._codeEditorService.findTypeDefinition = function(model, position, token) {
                        // Returns an empty array, indicating that there is no type definition to find
                        return Promise.resolve([]);
                    };

                    // Completely disable all jump related commands
                    const disabledCommands = [
                        'editor.action.openLink',
                        'editor.action.openLinkToSide',
                        'editor.action.openLinkInPeek',
                        'editor.action.goToDefinition',
                        'editor.action.goToTypeDefinition',
                        'editor.action.goToImplementation',
                        'editor.action.goToReferences',
                        'editor.action.peekDefinition',
                        'editor.action.peekTypeDefinition',
                        'editor.action.peekImplementation',
                        'editor.action.peekReferences'
                    ];

                    disabledCommands.forEach(command => {
                        editor._standaloneKeybindingService.addDynamicKeybinding(
                            `-${command}`,
                            null,
                            () => {}
                        );
                    });

                    // Handle link click events - jump inside Monaco
                    editor.onMouseUp((e) => {
                        //console.log('[definition] Mouse up event:', e.target, e.event);
                        // Completely prevent event propagation
                        //e.event.preventDefault();
                        //e.event.stopPropagation();
                        // Use e.event.buttons to determine the mouse button
                        //const isLeftClick = (e.event.buttons & 1) === 1; // Left button
                        //const isRightClick = (e.event.buttons & 2) === 2; // Right click
                        
                        if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
                            // Get the current word
                            const model = editor.getModel();
                            if (!model) {
                                //console.log('[definition] **********************no model found************************');
                                model = monaco.editor.createModel(content, language);
                                editor.setModel(model);
                            }
                            const position = e.target.position;
                            // Check if the click position is within the current selection range
                            const selection = editor.getSelection();
                            const isClickedTextSelected = selection && !selection.isEmpty() && selection.containsPosition(position);
                            if (model && position && !isClickedTextSelected) {
                                const word = model.getWordAtPosition(position);
                                if (word) {
                                    if (e.event.rightButton) {
                                        //console.log('[definition] start to mid + jump definition: ', word);
                                        editor.setSelection({
                                            startLineNumber: position.lineNumber,
                                            startColumn: word.startColumn,
                                            endLineNumber: position.lineNumber,
                                            endColumn: word.endColumn
                                        });
                                    } else {
                                        //console.log('[definition] start to jump definition: ', word);
                                        vscode.postMessage({
                                                        type: 'jumpDefinition',
                                                        uri: uri,
                                                        token: word.word,
                                                        position: {
                                                            line: position.lineNumber - 1,
                                                            character: position.column - 1
                                                        }
                                                    });
                                    }
                                }
                            }
                        }
                        return true;
                    });

                    //console.log('[definition] Monaco editor created');

                    // Notify the extension that the editor is ready
                    vscode.postMessage({ type: 'editorReady' });
                    //console.log('[definition] Editor ready message sent');
                    
                    // Request initial content
                    vscode.postMessage({ type: 'requestContent' });
                    //console.log('[definition] Content requested');

                    // Update file name display function
                    function updateFilenameDisplay(uri) {
                        const filenameDisplay = document.querySelector('.filename-display');
                        if (uri && filenameDisplay) {
                            // Extract the file name from the URI
                            const filename = uri.split('/').pop().split('\\').pop();
                            let filePath = uri;
                            try {
                                filePath = decodeURIComponent(uri);
                            } catch (e) {
                                //console.log('[definition] Error decoding URI:', e);
                                filePath = uri;
                            }
                            const displayText = `${filename}       (${filePath})`;
                            //console.log('[definition] File name:', filename, uri);
                            filenameDisplay.textContent = displayText || '';
                        } else if (filenameDisplay) {
                            filenameDisplay.textContent = '';
                        }
                    }

                    function updateDefinitionList(definitions) {
                        const listItems = document.querySelector('#definition-list .list-items');
                        if (!listItems) {
                            return;
                        }

                        // Only show the definition list panel if there are multiple definitions
                        const definitionList = document.querySelector('#definition-list');
                        if (definitionList) {
                            if (definitions && definitions.length > 1) {
                                definitionList.style.display = 'flex';
                            } else {
                                // If there is only one or none defined, hide the list panel
                                definitionList.style.display = 'none';
                                // Force the Monaco editor to re-layout to fill the entire space
                                if (editor) {
                                    setTimeout(() => {
                                        editor.layout();
                                    }, 100);
                                }
                                return;
                            }
                        }

                        // Clear the existing content
                        listItems.innerHTML = '';

                        // If not defined, display empty state
                        if (!definitions || definitions.length === 0) {
                            listItems.innerHTML = '<div style="padding: 10px; color: var(--vscode-descriptionForeground); font-style: italic;">No definitions found</div>';
                            return;
                        }

                        const getFileName = (path) => path.replace(/^.*[\\/]/, '');

                        // Create definition items
                        definitions.forEach((def, index) => {
                            const item = document.createElement('div');
                            item.className = `definition-item${def.isActive ? ' active' : ''}`;
                            
                            // Use the data in def directly without parsing the 'location' string
                            const filePath = def.filePath;
                            const lineNumber = def.lineNumber + 1; // Convert to 1-based line number
                            const columnNumber = def.columnNumber || 1;

                            //console.log('[definition] File name:', filePath, lineNumber, columnNumber);
                            const fileNameWithExt = getFileName(filePath);
                            const symbolName = fileNameWithExt || `Definition ${index + 1}`;
                            
                            item.innerHTML = `
                                <span class="definition-number">${symbolName}</span>
                                <div class="definition-info">
                                    <span class="file-path">${filePath}</span>
                                    <span class="line-info">- Line: ${lineNumber}, Column: ${columnNumber}</span>
                                </div>
                            `;

                            // Add click event
                            item.addEventListener('click', () => {
                                selectDefinitionItem(index, def);
                            });

                            // Add double-click event - directly reuse the double-click jump function of the bottom navigation bar
                            item.addEventListener('dblclick', () => {
                                // First select the current definition item and update the content of the Context Window
                                selectDefinitionItem(index, def);
                                
                                // Then directly call the double-click jump logic of the bottom navigation bar
                                setTimeout(() => {
                                    vscode.postMessage({
                                        type: 'doubleClick',
                                        location: 'bottomArea'
                                    });
                                }, 100); // Delay slightly to ensure content is updated
                            });

                            listItems.appendChild(item);
                            
                            // If it is the default activated item, automatically select it
                            if (def.isActive) {
                                setTimeout(() => {
                                    selectDefinitionItem(index, def);
                                }, 100);
                            }
                        });

                        // Add keyboard event listener
                        setupDefinitionListKeyboardNavigation(definitions);
                        
                        // Force the Monaco editor to re-layout to fit the new container size
                        if (editor) {
                            setTimeout(() => {
                                editor.layout();
                            }, 100);
                        }
                    }

                    function selectDefinitionItem(index, def) {
                        // Remove the active state of other items
                        document.querySelectorAll('.definition-item').forEach(i => i.classList.remove('active'));
                        // Add the active state of the current item
                        const items = document.querySelectorAll('.definition-item');
                        if (items[index]) {
                            items[index].classList.add('active');
                            // Scroll to the visible area
                            items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }

                        // Send a message to the extension
                        vscode.postMessage({
                            type: 'definitionItemSelected',
                            symbolName: def.title,
                            filePath: def.filePath,
                            lineNumber: def.lineNumber,
                            index: index
                        });
                    }

                    // Global variables store currently defined data and keyboard processing functions
                    let currentDefinitions = [];
                    let handleDefinitionListKeydown = null;

                    function setupDefinitionListKeyboardNavigation(definitions) {
                        currentDefinitions = definitions;
                        
                        // Remove the previous event listener
                        if (handleDefinitionListKeydown) {
                            document.removeEventListener('keydown', handleDefinitionListKeydown);
                        }
                        
                        // Create a new event handling function
                        handleDefinitionListKeydown = function(e) {
                            const items = document.querySelectorAll('.definition-item');
                            if (items.length === 0) return;

                            const currentActive = document.querySelector('.definition-item.active');
                            let currentIndex = currentActive ? Array.from(items).indexOf(currentActive) : 0;

                            switch (e.key) {
                                case 'ArrowUp':
                                case 'Up':
                                    e.preventDefault();
                                    currentIndex = Math.max(0, currentIndex - 1);
                                    selectDefinitionItem(currentIndex, currentDefinitions[currentIndex]);
                                    break;
                                
                                case 'ArrowDown':
                                case 'Down':
                                    e.preventDefault();
                                    currentIndex = Math.min(items.length - 1, currentIndex + 1);
                                    selectDefinitionItem(currentIndex, currentDefinitions[currentIndex]);
                                    break;
                                
                                case 'p':
                                    if (e.ctrlKey) {
                                        e.preventDefault();
                                        currentIndex = Math.max(0, currentIndex - 1);
                                        selectDefinitionItem(currentIndex, currentDefinitions[currentIndex]);
                                    }
                                    break;
                                
                                case 'n':
                                    if (e.ctrlKey) {
                                        e.preventDefault();
                                        currentIndex = Math.min(items.length - 1, currentIndex + 1);
                                        selectDefinitionItem(currentIndex, currentDefinitions[currentIndex]);
                                    }
                                    break;
                                
                                case 'Escape':
                                    e.preventDefault();
                                    // Send a message to close the definition list
                                    vscode.postMessage({
                                        type: 'closeDefinitionList'
                                    });
                                    break;
                                
                                case 'Enter':
                                    e.preventDefault();
                                    // Enter key selects the current item (already handled by 'selectDefinitionItem')
                                    break;
                            }
                        };
                        
                        // Add a new event listener
                        document.addEventListener('keydown', handleDefinitionListKeydown);
                    }

                    function clearDefinitionList() {
                        const listItems = document.querySelector('#definition-list .list-items');
                        if (listItems) {
                            listItems.innerHTML = '';
                        }
                        
                        // Hide the definition list and let the Monaco editor take up the entire space
                        const definitionList = document.querySelector('#definition-list');
                        const mainContainer = document.querySelector('#main-container');
                        
                        if (definitionList) {
                            definitionList.style.display = 'none';
                        }
                        
                        if (mainContainer) {
                            mainContainer.style.flexDirection = 'row';
                        }
                        
                        // Force the Monaco editor to re-layout to fit the new container size
                        if (editor) {
                            setTimeout(() => {
                                editor.layout();
                            }, 100);
                        }
                        
                        // Remove the keyboard event listener
                        if (handleDefinitionListKeydown) {
                            document.removeEventListener('keydown', handleDefinitionListKeydown);
                            handleDefinitionListKeydown = null;
                        }
                    }
                    
                    // Handle messages from extensions
                    window.addEventListener('message', event => {
                        const message = event.data;
                        //console.log('[definition] Received message:', message);
                        
                        try {
                            switch (message.type) {
                                /*case 'updateEditorConfiguration':
                                    // Update editor configuration
                                    if (editor && message.configuration) {
                                        //console.log('[definition] Updating editor configuration');
                                        
                                        // Update editor options
                                        editor.updateOptions(message.configuration || {});
                                        
                                        // Update the theme
                                        if (message.configuration.tokenColorCustomizations) {
                                            // Make sure colors is a valid object
                                            const safeColors = {};
                                            const colors = window.vsCodeEditorConfiguration.tokenColorCustomizations;
                                            if (colors && typeof colors === 'object') {
                                                Object.keys(colors).forEach(key => {
                                                    if (typeof colors[key] === 'string') {
                                                        safeColors[key] = colors[key];
                                                    }
                                                });
                                            }
                                            monaco.editor.defineTheme('vscode-custom', {
                                                base: message.configuration.theme || 'vs',
                                                inherit: true,
                                                rules: [],
                                                colors: safeColors
                                            });
                                            try {
                                                monaco.editor.setTheme('vscode-custom');
                                                //console.log('[definition] Custom theme applied 2');
                                            } catch (themeError) {
                                                //console.error('[definition] Failed to apply custom theme 2:', themeError);
                                                monaco.editor.setTheme('vs'); // Fall back to the default theme
                                            }
                                        } else if (message.configuration.theme) {
                                            monaco.editor.setTheme(message.configuration.theme);
                                        }

                                        // Update semantic highlighting
                                        if (message.configuration.semanticTokenColorCustomizations) {
                                            try {
                                                // Monaco does not support setting a common semantic markup provider for all languages (*)
                                                const supportedLanguages = ['javascript', 'typescript', 'html', 'css', 'json', 'markdown', 'cpp', 'python', 'java', 'go'];
                                                
                                                // Set up the semantic markup provider for each supported language
                                                supportedLanguages.forEach(lang => {
                                                    try {
                                                        monaco.languages.setTokensProvider(lang, {
                                                            getInitialState: () => null,
                                                            tokenize: (line) => {
                                                                return { tokens: [], endState: null };
                                                            }
                                                        });
                                                    } catch (langError) {
                                                        //console.warn(`[definition] Failed to update semantic tag provider for ${lang}:`, langError);
                                                    }
                                                });
                                                
                                                //console.log('[definition] semantic highlight configuration has been updated');
                                            } catch (error) {
                                                //console.error('[definition] Update semantic highlight configuration failed:', error);
                                            }
                                        }
                                    }
                                    break;*/
                                case 'updateContextEditorCfg':
                                    if (message.contextEditorCfg) {
                                        // Redefine the theme
                                        monaco.editor.defineTheme('custom-vs', {
                                            base: light ? 'vs' : 'vs-dark',
                                            inherit: true,
                                            rules: window.vsCodeEditorConfiguration.customThemeRules,
                                            colors: {
                                                "editor.selectionBackground": message.contextEditorCfg.selectionBackground,
                                                "editor.inactiveSelectionBackground": message.contextEditorCfg.inactiveSelectionBackground,
                                                "editor.selectionHighlightBackground": message.contextEditorCfg.selectionHighlightBackground,
                                                "editor.selectionHighlightBorder": message.contextEditorCfg.selectionHighlightBorder,
                                                // ... other colors
                                            }
                                        });
                                        
                                        // Reapply the theme
                                        if (editor) {
                                            editor.updateOptions({ theme: 'custom-vs' });
                                        }
                                    }
                                    break;
                                case 'updateTheme':
                                    // Update editor theme
                                    if (editor && message.theme) {
                                        //monaco.editor.setTheme(message.theme);
                                    }
                                    break;
                                case 'shortJump':
                                    if (editor) {
                                        const models = monaco.editor.getModels();
                                        let model = models.length > 0 ? models[0] : null;
                                        
                                        if (!model) {
                                            //console.log('[definition] no model', models);
                                            //console.log('[definition] ***********Creating new model with language*************:', message.languageId);
                                            model = monaco.editor.createModel(content, language || 'plaintext');
                                            editor.setModel(model);
                                        }

                                        // Clear the previous decoration
                                        const existingDecorations = editor.getDecorationsInRange(new monaco.Range(
                                            1, 1,
                                            model.getLineCount(),
                                            Number.MAX_SAFE_INTEGER
                                        ));
                                        const symbolDecorations = existingDecorations?.filter(d => d.options.inlineClassName === 'highlighted-symbol');
                                        if (symbolDecorations && symbolDecorations.length > 0) {
                                            editor.deltaDecorations(symbolDecorations.map(d => d.id), []);
                                        }
                                        
                                        // Scroll to the specified line
                                        if (message.scrollToLine) {
                                            //console.log('[definition] Scrolling to line:', message.scrollToLine);
                                            

                                            // Add row highlight decoration
                                            const lineDecorations = editor.deltaDecorations([], [{
                                                range: new monaco.Range(message.scrollToLine, 1, message.scrollToLine, 1),
                                                options: {
                                                    isWholeLine: true,
                                                    className: 'highlighted-line',
                                                    glyphMarginClassName: 'highlighted-glyph'
                                                }
                                            }]);

                                            let line = message.scrollToLine;
                                            let column = 1;
                                            
                                            // If there is a definition name, highlight it
                                            if (message.symbolName) {
                                                const text = model.getValue();
                                                const lines = text.split('\n');
                                                const lineText = lines[message.scrollToLine - 1] || '';
                                                
                                                // Search for symbol name in the current line
                                                const symbolIndex = lineText.indexOf(message.symbolName);
                                                //console.log('[definition] Symbol index:', symbolIndex);
                                                if (symbolIndex !== -1) {
                                                    column = symbolIndex + 1;
                                                    // Add symbol highlight decoration
                                                    editor.deltaDecorations([], [{
                                                        range: new monaco.Range(
                                                            message.scrollToLine,
                                                            symbolIndex + 1,
                                                            message.scrollToLine,
                                                            symbolIndex + message.symbolName.length + 1
                                                        ),
                                                        options: {
                                                            inlineClassName: 'highlighted-symbol'
                                                        }
                                                    }]);
                                                } else {
                                                    //console.log('[definition] Symbol not found in line: ', lineText);
                                                    //console.log(`[definition] Symbol not found in line: ${message.symbolName}`);
                                                }
                                            }
                                            editor.setSelection({
                                                            startLineNumber: line,
                                                            startColumn: column,
                                                            endLineNumber: line,
                                                            endColumn: column
                                                        });
                                            // force layout before scrolling
                                            //editor.layout();
                                            editor.revealLineInCenter(message.scrollToLine);
                                        }
                                    } else {
                                        //console.error('[definition] Editor not initialized');
                                    }
                                    break;
                                case 'updateDefinitionList':
                                    // Update the definition list
                                    if (message.definitions && Array.isArray(message.definitions)) {
                                        updateDefinitionList(message.definitions);
                                    }
                                    break;
                                case 'clearDefinitionList':
                                    // Clear the definition list
                                    clearDefinitionList();
                                    break;
                                case 'update':
                                    //console.log('[definition] Updating editor content');
                                    // Show the editor and hide the original content area
                                    document.getElementById('container').style.display = 'block';
                                    document.getElementById('main').style.display = 'none';

                                    uri = message.uri;
                                    //console.log('[definition] Updating editor content with URI:', uri);
                                    updateFilenameDisplay(uri);
                                    
                                    // Update editor content and language
                                    if (editor) {
                                        const models = monaco.editor.getModels();
                                        let model = models.length > 0 ? models[0] : null;

                                        content = message.body;
                                        language = message.languageId;
                                        
                                        if (!model) {
                                            //console.log('[definition] no model', models);
                                            //console.log('[definition] ***********Creating new model with language*************:', message.languageId);
                                            model = monaco.editor.createModel(message.body, message.languageId || 'plaintext');
                                            editor.setModel(model);
                                        } else {
                                            //console.log('[definition] Updating existing model');
                                            // If the language has changed, update the language
                                            if (model.getLanguageId() !== message.languageId && message.languageId) {
                                                //console.log('[definition] Changing language from', model.getLanguageId(), 'to', message.languageId);
                                                monaco.editor.setModelLanguage(model, message.languageId);
                                            }
                                            // Update content
                                            model.setValue(message.body);
                                        }

                                        const initialTheme = editor.getOption(monaco.editor.EditorOption.theme);
                                        //console.log('[definition] Initial theme:', initialTheme);

                                        // Clear the previous decoration
                                        const existingDecorations = editor.getDecorationsInRange(new monaco.Range(
                                            1, 1,
                                            model.getLineCount(),
                                            Number.MAX_SAFE_INTEGER
                                        ));
                                        const symbolDecorations = existingDecorations?.filter(d => d.options.inlineClassName === 'highlighted-symbol');
                                        if (symbolDecorations && symbolDecorations.length > 0) {
                                            editor.deltaDecorations(symbolDecorations.map(d => d.id), []);
                                        }
                                        
                                        // Scroll to the specified line
                                        if (message.scrollToLine) {
                                            //console.log('[definition] Scrolling to line:', message.curLine);
                                            // force layout before scrolling
                                            editor.layout();

                                            let line = message.scrollToLine;
                                            if (message.curLine && message.curLine !== -1)
                                                line = message.curLine;
                                            editor.revealLineInCenter(line);

                                            // Add row highlight decoration
                                            const lineDecorations = editor.deltaDecorations([], [{
                                                range: new monaco.Range(message.scrollToLine, 1, message.scrollToLine, 1),
                                                options: {
                                                    isWholeLine: true,
                                                    className: 'highlighted-line',
                                                    glyphMarginClassName: 'highlighted-glyph'
                                                }
                                            }]);
                                            let column = 1;
                                            // If there is a definition name, highlight it
                                            if (message.symbolName) {
                                                const text = model.getValue();
                                                const lines = text.split('\n');
                                                const lineText = lines[message.scrollToLine - 1] || '';
                                                
                                                // Search for symbol name in the current line
                                                const symbolRegex = new RegExp(`\\b${message.symbolName}\\b`);
                                                const symbolMatch = lineText.match(symbolRegex);
                                                const symbolIndex = symbolMatch ? symbolMatch.index : -1;
                                                //console.log('[definition] Symbol index:', symbolIndex);
                                                if (symbolIndex !== -1) {
                                                    column = symbolIndex + 1;
                                                    // Add symbol highlight decoration
                                                    editor.deltaDecorations([], [{
                                                        range: new monaco.Range(
                                                            message.scrollToLine,
                                                            symbolIndex + 1,
                                                            message.scrollToLine,
                                                            symbolIndex + message.symbolName.length + 1
                                                        ),
                                                        options: {
                                                            inlineClassName: 'highlighted-symbol'
                                                        }
                                                    }]);
                                                } else {
                                                    //console.log('[definition] Symbol not found in line: ', lineText);
                                                    //console.log(`[definition] Symbol not found in line: ${message.symbolName}`);
                                                }
                                            }
                                        }
                                        // After the content is set, send a confirmation message
                                        setTimeout(() => {
                                            vscode.postMessage({ type: 'contentReady' });
                                        }, 1); // Delay slightly to ensure rendering is complete
                                    } else {
                                        console.error('[definition] Editor not initialized');
                                    }
                                    break;
                                    
                                case 'noContent':
                                    //console.log('[definition] Showing no content message');
                                    // Show the original content area and hide the editor
                                    document.getElementById('container').style.display = 'none';
                                    document.getElementById('main').style.display = 'block';
                                    document.getElementById('main').innerHTML = message.body;
                                    break;
                                    
                                case 'startLoading':
                                    //console.log('[definition] Starting loading animation');
                                    document.querySelector('.loading').classList.add('active');
                                    setTimeout(() => {
                                        document.querySelector('.loading').classList.add('show');
                                    }, 0);
                                    break;
                                    
                                case 'endLoading':
                                    //console.log('[definition] Ending loading animation');
                                    document.querySelector('.loading').classList.remove('show');
                                    setTimeout(() => {
                                        document.querySelector('.loading').classList.remove('active');
                                    }, 200);
                                    break;
                                //default:
                                    //console.log('[definition] Unknown message type:', message.type);
                            }
                        } catch (error) {
                            console.error('[definition] Error handling message:', error);
                            document.getElementById('main').style.display = 'block';
                            document.getElementById('main').innerHTML = '<div style="color: red; padding: 20px;">Error processing message: ' + error.message + '</div>';
                        }
                    });
                    

                } catch (error) {
                    console.error('[definition] Error initializing editor:', error);
                    document.getElementById('main').style.display = 'block';
                    document.getElementById('main').innerHTML = '<div style="color: red; padding: 20px;">Error initializing editor: ' + error.message + '</div>';
                }
            }, function(error) {
                console.error('[definition] Failed to load Monaco editor:', error);
                document.getElementById('main').style.display = 'block';
                document.getElementById('main').innerHTML = '<div style="color: red; padding: 20px;">Failed to load Monaco editor: ' + (error ? error.message : 'Unknown error') + '</div>';
            });
        };
        
        loaderScript.onerror = function(error) {
            console.error('[definition] Failed to load Monaco loader.js:', error);
            document.getElementById('main').style.display = 'block';
            document.getElementById('main').innerHTML = '<div style="color: red; padding: 20px;">Failed to load Monaco loader.js</div>';
        };
        
        // Add the script to your document
        document.head.appendChild(loaderScript);
        
    } catch (error) {
        console.error('[definition] Error in main script:', error);
        document.getElementById('main').style.display = 'block';
        document.getElementById('main').innerHTML = '<div style="color: red; padding: 20px;">Initialization failed: ' + error.message + '</div>';
    }
})();