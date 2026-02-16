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
                await editor.edit(editBuilder => {
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
    const onWillSave = vscode.workspace.onWillSaveTextDocument(event => {
        if (event.document.languageId === 'markdown') {
            console.log('Detected save on markdown file. Updating embeds...');
            event.waitUntil((async () => {
                const edits = await embedder.generateEdits(event.document);
                edits.sort((a, b) => b.range.start.compareTo(a.range.start));
                return edits;
            })());
        }
    });

    // Auto-update when source files change
    const onDidSaveSource = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        // If the saved document is a Markdown file, onWillSave (above) already handled it 
        // specific to that file. We skip it here to avoid redundancy and potential conflicts.
        if (savedDoc.languageId === 'markdown') {
            return;
        }

        const config = vscode.workspace.getConfiguration('markdownEmbedder');
        if (!config.get<boolean>('autoUpdate')) {
            return;
        }

        console.log(`File saved: ${savedDoc.fileName}. Checking for embeds in markdown files...`);

        // Find all markdown files in the workspace
        const mdFiles = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');

        for (const mdFileUri of mdFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(mdFileUri);
                const edits = await embedder.generateEdits(doc);

                if (edits.length > 0) {
                    console.log(`Updating embeds in ${mdFileUri.fsPath}...`);
                    edits.sort((a, b) => b.range.start.compareTo(a.range.start));

                    const workspaceEdit = new vscode.WorkspaceEdit();
                    workspaceEdit.set(mdFileUri, edits);

                    const applied = await vscode.workspace.applyEdit(workspaceEdit);
                    if (applied) {
                        await doc.save();
                    }
                }
            } catch (error) {
                console.error(`Failed to update embeds in ${mdFileUri.fsPath}:`, error);
            }
        }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(onWillSave);
    context.subscriptions.push(onDidSaveSource);

    // Note: We removed the old snippet providers for now as the syntax changed.
    // We can re-implement them for the new <!-- embed: --> syntax later if needed.
}

export function deactivate() { }
