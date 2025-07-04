import * as vscode from 'vscode';
import { ContextWindowProvider } from './contextView';

export function activate(context: vscode.ExtensionContext) {

	const provider = new ContextWindowProvider(context.extensionUri);
	context.subscriptions.push(provider);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ContextWindowProvider.viewType, provider));

	context.subscriptions.push(
		vscode.commands.registerCommand('contextView.contextWindow.pin', () => {
			provider.pin();
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('contextView.contextWindow.unpin', () => {
			provider.unpin();
		}));

    // Register the command to display the context window
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-context-window.showContextWindow', () => {
            provider.show();
        }));

    const config = vscode.workspace.getConfiguration('editor.tokenColorCustomizations');
    const semanticHighlighting = (config?.get('textMateRules') || []) as Array<{
        scope: string;
        settings: {
            foreground?: string;
        };
    }>;
    let includeColor = '#0000FF'; // default color

    // Find the color setting of the 'include' keyword
    for (const rule of semanticHighlighting) {
        if (rule.scope === 'keyword.control.directive.include') {
            includeColor = rule.settings.foreground || includeColor;
            break;
        }
    }

    const editorConfig = vscode.workspace.getConfiguration('editor');
    //const fontFamily = editorConfig.get('fontFamily') || 'Consolas, monospace';
    const fontWeight = String(editorConfig.get('fontWeight') || 'normal');
    //const fontSize = editorConfig.get('fontSize') || 14;

    let decorationTypeInclude = vscode.window.createTextEditorDecorationType({
        color: includeColor,
        fontStyle: fontWeight === 'bold' ? 'oblique' : 'normal',
        fontWeight: fontWeight,
        //textDecoration: `none; font-size: ${fontSize}px`  // Use 'textDecoration' to set the font size
    });

    function updateDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !['c', 'cc', 'cpp', 'h', 'hpp', 'csharp'].includes(editor.document.languageId)) {
            return;
        }

        const text = editor.document.getText();
        const includeDecorations: vscode.DecorationOptions[] = [];

        const regex = /(?:^|\n)[ \t]*#[ \t]*(include|pragma|region|endregion)\b/g;
        let match;
        while ((match = regex.exec(text))) {
            const startPos = editor.document.positionAt(match.index);
            const endPos = editor.document.positionAt(match.index + match[0].length);
            const decoration = { range: new vscode.Range(startPos, endPos) };

            if (match[1] === 'include') {
                includeDecorations.push(decoration);
            } else if (match[1] === 'pragma') {
                includeDecorations.push(decoration);
            } else if (match[1] === 'region') {
                includeDecorations.push(decoration);
            } else if (match[1] === 'endregion') {
                includeDecorations.push(decoration);
            }
        }

        editor.setDecorations(decorationTypeInclude, includeDecorations);
    }

    vscode.window.onDidChangeActiveTextEditor(updateDecorations, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('editor.fontWeight') ||
            e.affectsConfiguration('editor.fontSize') ||
            e.affectsConfiguration('editor.tokenColorCustomizations')) {
            // Re-get the color settings
            const config = vscode.workspace.getConfiguration('editor.tokenColorCustomizations');
            const semanticHighlighting = (config?.get('textMateRules') || []) as Array<{
                scope: string;
                settings: {
                    foreground?: string;
                };
            }>;
            
            // Update the color
            for (const rule of semanticHighlighting) {
                if (rule.scope === 'keyword.control.directive.include') {
                    includeColor = rule.settings.foreground || '#0000FF';
                    break;
                }
            }

            // Get the new font settings
            const editorConfig = vscode.workspace.getConfiguration('editor');
            const newFontWeight = String(editorConfig.get('fontWeight') || 'normal');

            // Update the decorator
            decorationTypeInclude.dispose();
            decorationTypeInclude = vscode.window.createTextEditorDecorationType({
                color: includeColor,
                fontStyle: newFontWeight === 'bold' ? 'oblique' : 'normal',
                fontWeight: newFontWeight,
            });
            updateDecorations();
        }
    }, null, context.subscriptions);

    updateDecorations();
}
