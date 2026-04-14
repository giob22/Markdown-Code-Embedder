import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const REGION_START_REGEX = /^\s*(?:\/\/|--|#|<!--|\/\*)\s*#region\s+(\S+)\s*(?:-->|\*\/)?$/;

export class EmbedCompletionProvider implements vscode.CompletionItemProvider {

    public async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[] | undefined> {
        const lineText = document.lineAt(position).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // Only activate inside embed tags
        if (!textBeforeCursor.includes('<!-- embed:') && !textBeforeCursor.includes('<!--embed:')) {
            return undefined;
        }

        // Check if completing a file path: file="<cursor>
        const fileAttrMatch = textBeforeCursor.match(/file=["']([^"']*)$/);
        if (fileAttrMatch) {
            // replaceRange covers the entire value already typed after the opening quote
            const valueStart = position.character - fileAttrMatch[1].length;
            const replaceRange = new vscode.Range(
                new vscode.Position(position.line, valueStart),
                position
            );
            return this.getFileCompletions(document, fileAttrMatch[1], replaceRange);
        }

        // Check if completing a region name: region="<cursor>
        const regionAttrMatch = textBeforeCursor.match(/region=["']([^"']*)$/);
        if (regionAttrMatch) {
            const valueStart = position.character - regionAttrMatch[1].length;
            const replaceRange = new vscode.Range(
                new vscode.Position(position.line, valueStart),
                position
            );
            const fileMatch = lineText.match(/file=["']([^"']+)["']/);
            if (fileMatch) {
                return this.getRegionCompletions(document, fileMatch[1], replaceRange);
            }
            return undefined;
        }

        return undefined;
    }

    private async getFileCompletions(
        document: vscode.TextDocument,
        partialPath: string,
        replaceRange: vscode.Range
    ): Promise<vscode.CompletionItem[]> {
        const markdownDir = path.dirname(document.uri.fsPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

        // Determine which directory to list based on the partial path typed so far
        let searchDir: string;
        if (partialPath.includes('/')) {
            const lastSlash = partialPath.lastIndexOf('/');
            const dirPart = partialPath.substring(0, lastSlash);
            searchDir = path.resolve(markdownDir, dirPart);
        } else {
            searchDir = markdownDir;
        }

        const items: vscode.CompletionItem[] = [];
        const seen = new Set<string>();

        const addEntries = async (dir: string) => {
            try {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') { continue; }

                    const fullPath = path.join(dir, entry.name);
                    let relPath = path.relative(markdownDir, fullPath).split(path.sep).join('/');
                    if (!relPath.startsWith('.')) {
                        relPath = './' + relPath;
                    }

                    if (seen.has(relPath)) { continue; }
                    seen.add(relPath);

                    if (entry.isDirectory()) {
                        const folderPath = relPath + '/';
                        const item = new vscode.CompletionItem(folderPath, vscode.CompletionItemKind.Folder);
                        item.insertText = folderPath;
                        // Replace the entire typed value so no duplication
                        item.range = replaceRange;
                        item.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger' };
                        items.push(item);
                    } else {
                        const item = new vscode.CompletionItem(relPath, vscode.CompletionItemKind.File);
                        item.insertText = relPath;
                        item.range = replaceRange;
                        item.detail = entry.name;
                        items.push(item);
                    }
                }
            } catch { /* directory not readable */ }
        };

        await addEntries(searchDir);

        // Also offer workspace root entries if different from searchDir
        if (workspaceFolder) {
            const wsRoot = workspaceFolder.uri.fsPath;
            if (path.resolve(searchDir) !== path.resolve(wsRoot)) {
                await addEntries(wsRoot);
            }
        }

        return items;
    }

    private async getRegionCompletions(
        document: vscode.TextDocument,
        filePath: string,
        replaceRange: vscode.Range
    ): Promise<vscode.CompletionItem[]> {
        let resolvedPath: string;

        try {
            resolvedPath = path.resolve(path.dirname(document.uri.fsPath), filePath);
            await fs.promises.access(resolvedPath);
        } catch {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) { return []; }
            resolvedPath = path.resolve(workspaceFolder.uri.fsPath, filePath);
            try {
                await fs.promises.access(resolvedPath);
            } catch {
                return [];
            }
        }

        try {
            const content = await fs.promises.readFile(resolvedPath, 'utf-8');
            const lines = content.split(/\r?\n/);
            const regions: string[] = [];

            for (const line of lines) {
                const m = REGION_START_REGEX.exec(line);
                if (m) {
                    regions.push(m[1]);
                }
            }

            return regions.map(name => {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.EnumMember);
                item.insertText = name;
                item.range = replaceRange;
                item.detail = `Region in ${path.basename(filePath)}`;
                return item;
            });
        } catch {
            return [];
        }
    }
}
