import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFilePath, getLanguageId, isUrl, fetchUrl } from './utils';

const ATTR_REGEX = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
const REGION_START_REGEX = (name: string) =>
    new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#region\\s+${name}\\s*(?:-->|\\*\\/)?$`);
const REGION_END_REGEX = /^\s*(?:\/\/|--|#|<!--|\/\*)\s*#endregion\s*(?:-->|\*\/)?/;

export class EmbedHoverProvider implements vscode.HoverProvider {

    public async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | undefined> {
        const range = document.getWordRangeAtPosition(position, /<!--\s*embed:.*?-->/);
        if (!range) {
            return undefined;
        }

        const text = document.getText(range);
        const attrs: { [key: string]: string } = {};
        const attrRegex = new RegExp(ATTR_REGEX.source, 'g');
        let attrMatch;
        while ((attrMatch = attrRegex.exec(text)) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }

        if (!attrs['file']) {
            return undefined;
        }

        let fileContent: string = '';
        let resolvedPath: string = '';

        if (isUrl(attrs['file'])) {
            resolvedPath = attrs['file'];
            try {
                fileContent = await fetchUrl(attrs['file']);
            } catch (e: any) {
                const md = new vscode.MarkdownString(`**Embed Error:** ${e.message}`);
                return new vscode.Hover(md, range);
            }
        } else {
            try {
                resolvedPath = await resolveFilePath(document, attrs['file']);
            } catch {
                const md = new vscode.MarkdownString(`**Embed Error:** File not found: \`${attrs['file']}\``);
                return new vscode.Hover(md, range);
            }
            try {
                fileContent = await fs.promises.readFile(resolvedPath, 'utf-8');
            } catch (error: any) {
                const md = new vscode.MarkdownString(`**Embed Error:** ${error.message}`);
                return new vscode.Hover(md, range);
            }
        }

        try {
            const lines = fileContent.split(/\r?\n/);
            const lang = getLanguageId(attrs['file']);

            let previewContent: string;
            let locationLabel: string;

            if (attrs['region']) {
                const regionRegex = REGION_START_REGEX(attrs['region']);
                let startLine = -1;
                let endLine = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (regionRegex.test(lines[i])) {
                        startLine = i + 1;
                        continue;
                    }
                    if (startLine !== -1 && REGION_END_REGEX.test(lines[i])) {
                        endLine = i;
                        break;
                    }
                }
                if (startLine === -1 || endLine === -1) {
                    const md = new vscode.MarkdownString(
                        `**Embed Error:** Region \`${attrs['region']}\` not found in \`${attrs['file']}\``
                    );
                    return new vscode.Hover(md, range);
                }
                previewContent = lines.slice(startLine, endLine).join('\n');
                locationLabel = `region: ${attrs['region']}`;
            } else if (attrs['line']) {
                const parts = attrs['line'].split('-').map(n => parseInt(n, 10));
                previewContent = lines.slice(parts[0] - 1, parts[1]).join('\n');
                locationLabel = `lines: ${attrs['line']}`;
            } else {
                // Full file — limit preview to avoid huge hover
                const MAX_LINES = 40;
                const allLines = lines;
                previewContent = allLines.slice(0, MAX_LINES).join('\n');
                if (allLines.length > MAX_LINES) {
                    previewContent += `\n... (${allLines.length - MAX_LINES} more lines)`;
                }
                locationLabel = `full file`;
            }

            // Strip common indentation
            previewContent = stripIndentation(previewContent);

            const relPath = isUrl(attrs['file'])
                ? attrs['file']
                : path.relative(path.dirname(document.uri.fsPath), resolvedPath).split(path.sep).join('/');

            const md = new vscode.MarkdownString();
            md.isTrusted = true;
            md.appendMarkdown(`**Embed Preview** — \`${relPath}\` (${locationLabel})\n\n`);
            md.appendCodeblock(previewContent, lang);
            return new vscode.Hover(md, range);

        } catch (error: any) {
            const md = new vscode.MarkdownString(`**Embed Error:** ${error.message}`);
            return new vscode.Hover(md, range);
        }
    }
}

function stripIndentation(content: string): string {
    const lines = content.split(/\r?\n/);
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length === 0) { continue; }
        const m = line.match(/^(\s*)/);
        if (m) { minIndent = Math.min(minIndent, m[1].length); }
    }
    if (minIndent === Infinity || minIndent === 0) { return content; }
    return lines.map(line => line.length < minIndent ? '' : line.substring(minIndent)).join('\n');
}
