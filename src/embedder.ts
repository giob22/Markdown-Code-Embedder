import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getLanguageId, resolveFilePath } from './utils';

interface EmbedContent {
    content: string;
    resolvedPath: string;
    startLine?: number;
    endLine?: number;
}

export class MarkdownEmbedder {
    // Regex to match: <!-- embed:file="..." line="..." --> or region="..."
    // We capture the entire comment content to parse attributes manually for flexibility
    private readonly embedRegex = /<!--\s*embed:([^\s]+)(.*?)-->/g;
    private readonly endEmbedRegex = /<!--\s*embed:end\s*-->/;

    public async generateEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
        const text = document.getText();
        const edits: vscode.TextEdit[] = [];
        const promises: Promise<void>[] = [];

        let match;
        // We need to re-create regex to reset state if we were to re-use it, but here it's fine
        const regex = new RegExp(this.embedRegex);

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const primaryKey = match[1]; // e.g. "file=..." (legacy handling if any) or just the first key
            const remainingAttributes = match[2]; // The rest of the string

            const matchIndex = match.index;
            const matchLen = fullMatch.length;

            // Combine attributes for parsing
            const attributeString = primaryKey + remainingAttributes;
            const attributes = this.parseAttributes(attributeString);

            if (!attributes['file']) {
                continue;
            }

            // If lock="true", skip updating this embed
            if (attributes['lock'] === 'true') {
                continue;
            }

            const remainingText = text.substring(matchIndex + matchLen);
            const closeMatch = this.endEmbedRegex.exec(remainingText);

            let replaceRange: vscode.Range;

            // Determine if we are replacing an existing block or inserting a new one
            // We must find the closing tag.
            // Safety: Ensure no other embed starts before this closing tag to avoid eating subsequent embeds.
            const nextStartRegex = new RegExp(this.embedRegex.source); // Remove 'g' flag behavior for simple search or just use regex
            let nextStartMatch = nextStartRegex.exec(remainingText);

            // SPECIAL CHECK: The embedRegex is broad and matches 'embed:end' too (as key='end').
            // If the found 'start' tag is actually an 'end' tag, ignore it as a start candidate.
            if (nextStartMatch && this.endEmbedRegex.test(nextStartMatch[0])) {
                nextStartMatch = null;
            }

            if (closeMatch && text.indexOf(closeMatch[0], matchIndex + matchLen) !== -1 &&
                (!nextStartMatch || closeMatch.index < nextStartMatch.index)) {

                // Determine if there is content between start and end that looks like a code block we manage
                const closeIndex = matchIndex + matchLen + closeMatch.index;
                const closeEndIndex = closeIndex + closeMatch[0].length;
                replaceRange = new vscode.Range(
                    document.positionAt(matchIndex + matchLen),
                    document.positionAt(closeEndIndex)
                );
            } else {
                replaceRange = new vscode.Range(
                    document.positionAt(matchIndex + matchLen),
                    document.positionAt(matchIndex + matchLen)
                );
            }

            promises.push((async () => {
                try {
                    const embedResult = await this.resolveContent(document, attributes);
                    const lang = getLanguageId(attributes['file']);

                    // Calculate relative path for the link
                    const markdownDir = path.dirname(document.uri.fsPath);
                    let relativePath = path.relative(markdownDir, embedResult.resolvedPath);
                    // Ensure relative path uses forward slashes for Markdown compatibility
                    relativePath = relativePath.split(path.sep).join('/');

                    let linkSuffix = '';
                    if (embedResult.startLine !== undefined && embedResult.endLine !== undefined) {
                        linkSuffix = `#L${embedResult.startLine}-L${embedResult.endLine}`;
                    }

                    const linkText = `[Source: ${attributes['file']}](${relativePath}${linkSuffix})`;

                    // Construct new content
                    // \n[Source: ...](...)\n```lang\ncontent\n```\n<!-- embed:end -->
                    const newContent = `\n${linkText}\n\`\`\`${lang}\n${embedResult.content}\n\`\`\`\n<!-- embed:end -->`;

                    const currentContent = document.getText(replaceRange);
                    if (currentContent !== newContent) {
                        edits.push(vscode.TextEdit.replace(replaceRange, newContent));
                    }
                } catch (error: any) {
                    console.error(`Error embedding ${attributes['file']}: ${error.message}`);
                    // Optionally insert error message in markdown?
                }
            })());
        }

        await Promise.all(promises);
        return edits;
    }

    private parseAttributes(str: string): { [key: string]: string } {
        const attrs: { [key: string]: string } = {};
        // Match key="value" or key='value'
        const attrRegex = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
        let match;
        while ((match = attrRegex.exec(str)) !== null) {
            attrs[match[1]] = match[2];
        }
        return attrs;
    }

    private async resolveContent(document: vscode.TextDocument, attrs: { [key: string]: string }): Promise<EmbedContent> {
        const filePath = await resolveFilePath(document, attrs['file']);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);

        let content = fileContent;
        let startLine: number | undefined;
        let endLine: number | undefined;

        if (attrs['line']) {
            const [start, end] = attrs['line'].split('-').map(n => parseInt(n, 10));
            if (isNaN(start) || isNaN(end)) {
                throw new Error('Invalid line format');
            }
            content = lines.slice(start - 1, end).join('\n');
            startLine = start;
            endLine = end;
        } else if (attrs['region']) {
            const regionData = this.extractRegion(lines, attrs['region']);
            content = regionData.content;
            startLine = regionData.startLine;
            endLine = regionData.endLine;
        }

        return {
            content,
            resolvedPath: filePath,
            startLine,
            endLine
        };
    }

    private extractRegion(lines: string[], regionName: string): { content: string, startLine: number, endLine: number } {
        const regionStartRegex = new RegExp(`^\\s*(?:\\/\\/|#|<!--|\\/\\*)\\s*#region\\s+${regionName}\\s*(?:-->|\\*\\/)?$`);
        const regionEndRegex = new RegExp(`^\\s*(?:\\/\\/|#|<!--|\\/\\*)\\s*#endregion\\s*(?:-->|\\*\\/)?`);

        // Also support just #endregion without name or strict matching if preferred, but strict is safer for named regions

        let startLine = -1;
        let endLine = -1;

        for (let i = 0; i < lines.length; i++) {
            if (regionStartRegex.test(lines[i])) {
                startLine = i + 1; // Content starts after this line
                continue;
            }
            if (startLine !== -1 && regionEndRegex.test(lines[i])) {
                endLine = i; // Content ends before this line
                break;
            }
        }

        if (startLine !== -1 && endLine !== -1) {
            return {
                content: lines.slice(startLine, endLine).join('\n'),
                startLine: startLine + 1, // 1-based start line (inclusive)
                endLine: endLine // 1-based end line (inclusive)
            };
        }

        throw new Error(`Region ${regionName} not found`);
    }
}
