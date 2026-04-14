
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { resolveFilePath } from './utils';

export class EmbedDefinitionProvider implements vscode.DefinitionProvider {

    public async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {

        console.log('[DefinitionProvider] provideDefinition called');

        // Matches any embed tag roughly to see if we are inside one
        const range = document.getWordRangeAtPosition(position, /<!--\s*embed:.*?-->/);
        if (!range) {
            return undefined;
        }

        const text = document.getText(range);

        // Parse attributes to find 'file' and 'region'
        const attrRegex = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
        let match;
        let relPath: string | undefined;
        let regionName: string | undefined;

        while ((match = attrRegex.exec(text)) !== null) {
            if (match[1] === 'file') {
                relPath = match[2];
            } else if (match[1] === 'region') {
                regionName = match[2];
            }
        }

        if (relPath) {
            console.log(`[DefinitionProvider] Found file link: ${relPath}`);

            // Check if the cursor is within the file path string
            // match[0] is the whole match, but we need to find "file='...'" part to be precise.
            const startOffset = document.offsetAt(range.start);
            const relativeStart = text.indexOf(relPath);

            if (relativeStart === -1) return undefined;

            const pathStartIndex = startOffset + relativeStart;
            const pathEndIndex = pathStartIndex + relPath.length;
            const cursorIndex = document.offsetAt(position);

            // Allow clicking anywhere in the tag for now, or strict on path?
            // User requested click on path. Strict check:
            if (cursorIndex >= pathStartIndex && cursorIndex <= pathEndIndex) {
                try {
                    const resolvedPath = await resolveFilePath(document, relPath);
                    const uri = vscode.Uri.file(resolvedPath);

                    let selectionRange = new vscode.Range(0, 0, 0, 0);

                    if (regionName) {
                        try {
                            const content = await fs.promises.readFile(resolvedPath, 'utf-8');
                            const lines = content.split(/\r?\n/);
                            const regionStartRegex = new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#region\\s+${regionName}\\s*(?:-->|\\*\\/)?$`);
                            for (let i = 0; i < lines.length; i++) {
                                if (regionStartRegex.test(lines[i])) {
                                    selectionRange = new vscode.Range(i, 0, i, lines[i].length);
                                    break;
                                }
                            }
                        } catch (e) {
                            console.error('[DefinitionProvider] Error reading file for region', e);
                        }
                    }

                    return new vscode.Location(uri, selectionRange);
                } catch (e) {
                    console.error('[DefinitionProvider] Definition not found', e);
                    return undefined;
                }
            }
        }

        return undefined;
    }
}
