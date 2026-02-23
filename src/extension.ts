import * as vscode from 'vscode';
import { MarkdownEmbedder } from './embedder';
import { EmbedDefinitionProvider } from './providers';

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Code Embedder is now active!');

    const embedder = new MarkdownEmbedder();


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
                    // Apply edits in reverse order to avoid range conflicts
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


    const onDidSaveSource = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        // Skip markdown files handled by onWillSave
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

    const definitionProvider = new EmbedDefinitionProvider();
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('markdown', definitionProvider));

    // Update diagnostics on save and change

    context.subscriptions.push(disposable);
    context.subscriptions.push(onWillSave);
    context.subscriptions.push(onDidSaveSource);

}

export function deactivate() { }
