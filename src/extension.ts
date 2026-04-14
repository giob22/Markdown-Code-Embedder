import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownEmbedder } from './embedder';
import { EmbedDefinitionProvider } from './providers';
import { EmbedDiagnosticsProvider } from './diagnostics';
import { EmbedCodeLensProvider } from './codelens';
import { EmbedHoverProvider } from './hover';
import { EmbedCompletionProvider } from './completion';
import { resolveFilePath } from './utils';

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Code Embedder is now active!');

    const embedder = new MarkdownEmbedder();
    const diagnosticsProvider = new EmbedDiagnosticsProvider();
    const codeLensProvider = new EmbedCodeLensProvider();

    // ── Update all embeds in active document ───────────────────────────────
    const updateAllCommand = vscode.commands.registerCommand('markdown-embed.update', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        const document = editor.document;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Updating Code Embeds...',
            cancellable: false
        }, async () => {
            const edits = await embedder.generateEdits(document);
            if (edits.length > 0) {
                await editor.edit(editBuilder => {
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

    // ── Update single embed (from CodeLens) ────────────────────────────────
    const updateSingleCommand = vscode.commands.registerCommand(
        'markdown-embed.updateSingle',
        async (uri: vscode.Uri, matchIndex: number) => {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);

            const edits = await embedder.generateEditsForIndex(document, matchIndex);
            if (edits.length > 0) {
                await editor.edit(editBuilder => {
                    edits.sort((a, b) => b.range.start.compareTo(a.range.start));
                    for (const edit of edits) {
                        editBuilder.replace(edit.range, edit.newText);
                    }
                });
            }
        }
    );

    // ── Go to source file (from CodeLens) ─────────────────────────────────
    const goToSourceCommand = vscode.commands.registerCommand(
        'markdown-embed.goToSource',
        async (uri: vscode.Uri, matchIndex: number) => {
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            const embedRegex = /<!--\s*embed:([^\s]+)(.*?)-->/g;
            let match;
            const regex = new RegExp(embedRegex.source, 'g');

            while ((match = regex.exec(text)) !== null) {
                if (match.index === matchIndex) {
                    const attrString = match[1] + match[2];
                    const attrRegex = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
                    let attrMatch;
                    const attrs: { [key: string]: string } = {};
                    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
                        attrs[attrMatch[1]] = attrMatch[2];
                    }
                    if (attrs['file']) {
                        try {
                            const resolved = await resolveFilePath(document, attrs['file']);
                            const fileUri = vscode.Uri.file(resolved);
                            await vscode.window.showTextDocument(fileUri);
                        } catch (e: any) {
                            vscode.window.showErrorMessage(`Cannot open file: ${e.message}`);
                        }
                    }
                    break;
                }
            }
        }
    );

    // ── Lock embed (from CodeLens) ─────────────────────────────────────────
    const lockCommand = vscode.commands.registerCommand(
        'markdown-embed.lock',
        async (uri: vscode.Uri, matchIndex: number, fullMatch: string) => {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            const start = document.positionAt(matchIndex);
            const end = document.positionAt(matchIndex + fullMatch.length);
            const range = new vscode.Range(start, end);

            // Insert lock="true" before closing -->
            const newMatch = fullMatch.replace(/\s*-->$/, ' lock="true" -->');
            await editor.edit(eb => eb.replace(range, newMatch));
            codeLensProvider.refresh();
        }
    );

    // ── Unlock embed (from CodeLens) ───────────────────────────────────────
    const unlockCommand = vscode.commands.registerCommand(
        'markdown-embed.unlock',
        async (uri: vscode.Uri, matchIndex: number, fullMatch: string) => {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            const start = document.positionAt(matchIndex);
            const end = document.positionAt(matchIndex + fullMatch.length);
            const range = new vscode.Range(start, end);

            const newMatch = fullMatch.replace(/\s*lock=["']true["']/, '');
            await editor.edit(eb => eb.replace(range, newMatch));
            codeLensProvider.refresh();
        }
    );

    // ── Auto-update on markdown save ───────────────────────────────────────
    const onWillSave = vscode.workspace.onWillSaveTextDocument(event => {
        if (event.document.languageId === 'markdown') {
            console.log('Detected save on markdown file. Updating embeds...');
            event.waitUntil((async () => {
                const cleanupEdits = embedder.cleanLegacyErrorComments(event.document);
                const embedEdits = await embedder.generateEdits(event.document);
                const allEdits = [...cleanupEdits, ...embedEdits];
                allEdits.sort((a, b) => b.range.start.compareTo(a.range.start));
                return allEdits;
            })());
        }
    });

    // ── Auto-update markdown files when referenced source file is saved ────
    const onDidSaveSource = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        if (savedDoc.languageId === 'markdown') {
            return;
        }
        const config = vscode.workspace.getConfiguration('markdownEmbedder');
        if (!config.get<boolean>('autoUpdate')) {
            return;
        }
        const mdFiles = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
        for (const mdFileUri of mdFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(mdFileUri);
                const edits = await embedder.generateEdits(doc);
                if (edits.length > 0) {
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

    // ── Diagnostics: update on open, change, save ─────────────────────────
    const onDidOpen = vscode.workspace.onDidOpenTextDocument(async doc => {
        diagnosticsProvider.updateDiagnostics(doc);
        // Clean up legacy error comments on open
        if (doc.languageId === 'markdown') {
            const cleanupEdits = embedder.cleanLegacyErrorComments(doc);
            if (cleanupEdits.length > 0) {
                const we = new vscode.WorkspaceEdit();
                we.set(doc.uri, cleanupEdits);
                await vscode.workspace.applyEdit(we);
            }
        }
    });

    const onDidChange = vscode.workspace.onDidChangeTextDocument(e => {
        diagnosticsProvider.updateDiagnostics(e.document);
    });

    const onDidSaveDiag = vscode.workspace.onDidSaveTextDocument(doc => {
        diagnosticsProvider.updateDiagnostics(doc);
    });

    const onDidClose = vscode.workspace.onDidCloseTextDocument(doc => {
        diagnosticsProvider.clearDiagnostics(doc);
    });

    // Run diagnostics + cleanup on already-open documents
    vscode.workspace.textDocuments.forEach(async doc => {
        diagnosticsProvider.updateDiagnostics(doc);
        if (doc.languageId === 'markdown') {
            const cleanupEdits = embedder.cleanLegacyErrorComments(doc);
            if (cleanupEdits.length > 0) {
                const we = new vscode.WorkspaceEdit();
                we.set(doc.uri, cleanupEdits);
                await vscode.workspace.applyEdit(we);
            }
        }
    });

    // ── Register providers ─────────────────────────────────────────────────
    const definitionProvider = vscode.languages.registerDefinitionProvider(
        'markdown',
        new EmbedDefinitionProvider()
    );

    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
        'markdown',
        codeLensProvider
    );

    const hoverDisposable = vscode.languages.registerHoverProvider(
        'markdown',
        new EmbedHoverProvider()
    );

    const completionDisposable = vscode.languages.registerCompletionItemProvider(
        'markdown',
        new EmbedCompletionProvider(),
        '"', "'", '/'   // trigger characters
    );

    context.subscriptions.push(
        updateAllCommand,
        updateSingleCommand,
        goToSourceCommand,
        lockCommand,
        unlockCommand,
        onWillSave,
        onDidSaveSource,
        onDidOpen,
        onDidChange,
        onDidSaveDiag,
        onDidClose,
        definitionProvider,
        codeLensDisposable,
        hoverDisposable,
        completionDisposable,
        diagnosticsProvider
    );
}

export function deactivate() { }
