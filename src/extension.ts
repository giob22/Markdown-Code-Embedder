import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownEmbedder } from './embedder';
import { EmbedDefinitionProvider } from './providers';
import { EmbedDiagnosticsProvider } from './diagnostics';
import { EmbedCodeLensProvider } from './codelens';
import { EmbedHoverProvider } from './hover';
import { EmbedCompletionProvider } from './completion';
import { resolveFilePath } from './utils';

const REGION_START_REGEX = /^\s*(?:\/\/|--|#|<!--|\/\*)\s*#region\s+(\S+)\s*(?:-->|\*\/)?$/;
const REGION_END_REGEX   = /^\s*(?:\/\/|--|#|<!--|\/\*)\s*#endregion\s*(?:-->|\*\/)?/;

export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Code Embedder is now active!');

    const embedder = new MarkdownEmbedder();
    const diagnosticsProvider = new EmbedDiagnosticsProvider();
    const codeLensProvider = new EmbedCodeLensProvider();

    // ── Stale tracking ─────────────────────────────────────────────────────
    async function updateStaleMap(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'markdown') { return; }
        try {
            const indices = await embedder.getStaleMatchIndices(document);
            codeLensProvider.updateStaleIndices(document.uri.toString(), indices);
            codeLensProvider.refresh();
        } catch { /* ignore */ }
    }

    // ── Helper: update all markdown files in workspace ─────────────────────
    async function updateAllMarkdownFiles(): Promise<number> {
        const mdFiles = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
        let totalEdits = 0;
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
                        totalEdits += edits.length;
                    }
                }
            } catch (error) {
                console.error(`Failed to update embeds in ${mdFileUri.fsPath}:`, error);
            }
        }
        return totalEdits;
    }

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

    // ── Update all embeds across workspace ─────────────────────────────────
    const updateWorkspaceCommand = vscode.commands.registerCommand('markdown-embed.updateWorkspace', async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Updating Code Embeds in Workspace...',
            cancellable: false
        }, async () => {
            const totalEdits = await updateAllMarkdownFiles();
            if (totalEdits > 0) {
                vscode.window.showInformationMessage(`Workspace update complete: ${totalEdits} embed(s) refreshed.`);
            } else {
                vscode.window.showInformationMessage('No stale embeds found in workspace.');
            }
        });
    });

    // ── Insert embed tag (copy to clipboard, for non-markdown source files) ─
    const insertEmbedTagCommand = vscode.commands.registerCommand('markdown-embed.insertEmbedTag', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }
        if (editor.document.languageId === 'markdown') {
            vscode.window.showErrorMessage('Run this command from a source file (not a Markdown file).');
            return;
        }

        const document = editor.document;
        const selection = editor.selection;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

        // Compute file path relative to workspace root (or absolute fallback)
        let filePath: string;
        if (workspaceFolder) {
            filePath = path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath).split(path.sep).join('/');
        } else {
            filePath = document.uri.fsPath;
        }

        const lines = document.getText().split(/\r?\n/);
        const startLine = selection.start.line;
        const endLine = selection.end.line;

        // Detect region: check if the selection is inside or spans a #region block
        let regionName: string | undefined;

        // Check if any line in the selection starts a #region
        for (let i = startLine; i <= endLine; i++) {
            const m = REGION_START_REGEX.exec(lines[i]);
            if (m) {
                regionName = m[1];
                break;
            }
        }

        // If not found in selection, search backwards from startLine
        if (!regionName) {
            for (let i = startLine; i >= 0; i--) {
                if (REGION_END_REGEX.test(lines[i])) { break; }
                const m = REGION_START_REGEX.exec(lines[i]);
                if (m) {
                    regionName = m[1];
                    break;
                }
            }
        }

        let tag: string;
        if (regionName) {
            tag = `<!-- embed:file="${filePath}" region="${regionName}" -->`;
        } else if (!selection.isEmpty) {
            const lineStart = startLine + 1;
            const lineEnd = endLine + 1;
            tag = `<!-- embed:file="${filePath}" line="${lineStart}-${lineEnd}" -->`;
        } else {
            tag = `<!-- embed:file="${filePath}" -->`;
        }

        await vscode.env.clipboard.writeText(tag);
        vscode.window.showInformationMessage(`Embed tag copied to clipboard!`, 'Show').then(action => {
            if (action === 'Show') {
                vscode.window.showInformationMessage(tag);
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
        await updateAllMarkdownFiles();
    });

    // ── Diagnostics: update on open, change, save ─────────────────────────
    const onDidOpen = vscode.workspace.onDidOpenTextDocument(async doc => {
        diagnosticsProvider.updateDiagnostics(doc);
        if (doc.languageId === 'markdown') {
            const cleanupEdits = embedder.cleanLegacyErrorComments(doc);
            if (cleanupEdits.length > 0) {
                const we = new vscode.WorkspaceEdit();
                we.set(doc.uri, cleanupEdits);
                await vscode.workspace.applyEdit(we);
            }
            updateStaleMap(doc);
        }
    });

    const onDidChange = vscode.workspace.onDidChangeTextDocument(e => {
        diagnosticsProvider.updateDiagnostics(e.document);
    });

    const onDidSaveDiag = vscode.workspace.onDidSaveTextDocument(doc => {
        diagnosticsProvider.updateDiagnostics(doc);
        if (doc.languageId === 'markdown') {
            updateStaleMap(doc);
        }
    });

    const onDidClose = vscode.workspace.onDidCloseTextDocument(doc => {
        diagnosticsProvider.clearDiagnostics(doc);
    });

    // Run diagnostics + cleanup + stale check on already-open documents
    vscode.workspace.textDocuments.forEach(async doc => {
        diagnosticsProvider.updateDiagnostics(doc);
        if (doc.languageId === 'markdown') {
            const cleanupEdits = embedder.cleanLegacyErrorComments(doc);
            if (cleanupEdits.length > 0) {
                const we = new vscode.WorkspaceEdit();
                we.set(doc.uri, cleanupEdits);
                await vscode.workspace.applyEdit(we);
            }
            updateStaleMap(doc);
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
        '"', "'", '/'
    );

    context.subscriptions.push(
        updateAllCommand,
        updateWorkspaceCommand,
        insertEmbedTagCommand,
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
