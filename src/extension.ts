import * as vscode from 'vscode';
import { MarkdownEmbedder } from './embedder';

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Code Embedder is now active!');

    const embedder = new MarkdownEmbedder();

    // Command to manually update
    let disposable = vscode.commands.registerCommand('markdown-embed.update', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Updating Code Embeds...",
            cancellable: false
        }, async () => {
            const edits = await embedder.generateEdits(document);
            if (edits.length > 0) {
                await editor.edit((editBuilder: vscode.TextEditorEdit) => {
                    // Apply edits in reverse order (which sort in generateEdits should ensure, 
                    // but let's double check or just iterate carefully)
                    // VS Code edits handle simultaneous edits if ranges don't overlap.
                    // generateEdits should ideally return sorted edits. (We'll add sort there or here).
                    edits.sort((a, b) => b.range.start.compareTo(a.range.start));
                    for (const edit of edits) {
                        editBuilder.replace(edit.range, edit.newText);
                    }
                });
                vscode.window.showInformationMessage(`Updated ${edits.length} embeds.`);
            } else {
                vscode.window.showInformationMessage('No embeds found to update.');
            }
        });
    });

    // Auto-update on save
    const onWillSave = vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        if (event.document.languageId === 'markdown') {
            console.log('Detected save on markdown file. Updating embeds...');
            event.waitUntil((async () => {
                const edits = await embedder.generateEdits(event.document);
                edits.sort((a, b) => b.range.start.compareTo(a.range.start));
                return edits;
            })());
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(onWillSave);

    // Note: We removed the old snippet providers for now as the syntax changed.
    // We can re-implement them for the new <!-- embed: --> syntax later if needed.
}

export function deactivate() { }
