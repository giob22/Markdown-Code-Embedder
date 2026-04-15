import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getLanguageId, resolveFilePath, getCommentPrefix, isUrl, fetchUrl, getCodeFenceRanges, isInCodeFence } from './utils';

interface EmbedContent {
    content: string;
    resolvedPath: string;
    startLine?: number;
    endLine?: number;
}

const REGION_MARKER_REGEX = /^\s*(?:\/\/|--|#|<!--|\/\*)\s*#(?:region|endregion)\b.*(?:-->|\*\/)?$/;

export class MarkdownEmbedder {
    private readonly embedRegex = /<!--\s*embed:([^\s]+)(.*?)-->/g;
    private readonly endEmbedRegex = /<!--\s*embed:end\s*-->/;

    public async generateEditsForIndex(document: vscode.TextDocument, targetIndex: number): Promise<vscode.TextEdit[]> {
        return this.generateEdits(document, targetIndex);
    }

    public async generateEdits(document: vscode.TextDocument, onlyIndex?: number): Promise<vscode.TextEdit[]> {
        const text = document.getText();
        const edits: vscode.TextEdit[] = [];
        const promises: Promise<void>[] = [];
        const fenceRanges = getCodeFenceRanges(text);

        let match;
        const regex = new RegExp(this.embedRegex);

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const primaryKey = match[1];
            const remainingAttributes = match[2];

            const matchIndex = match.index;
            const matchLen = fullMatch.length;

            if (onlyIndex !== undefined && matchIndex !== onlyIndex) {
                continue;
            }

            if (isInCodeFence(matchIndex, fenceRanges)) {
                continue;
            }

            const attributeString = primaryKey + remainingAttributes;
            const attributes = this.parseAttributes(attributeString);

            if (!attributes['file']) {
                continue;
            }

            if (attributes['lock'] === 'true') {
                continue;
            }

            const remainingText = text.substring(matchIndex + matchLen);
            const closeMatch = this.endEmbedRegex.exec(remainingText);

            let replaceRange: vscode.Range;

            const nextStartRegex = new RegExp(this.embedRegex.source);
            let nextStartMatch = nextStartRegex.exec(remainingText);

            if (nextStartMatch && this.endEmbedRegex.test(nextStartMatch[0])) {
                nextStartMatch = null;
            }

            if (closeMatch && text.indexOf(closeMatch[0], matchIndex + matchLen) !== -1 &&
                (!nextStartMatch || closeMatch.index < nextStartMatch.index)) {

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

            const capturedAttributes = { ...attributes };
            const capturedRange = replaceRange;

            promises.push((async () => {
                try {
                    const newContent = await this.buildNewContent(document, capturedAttributes);
                    if (newContent === null) { return; }

                    const currentContent = document.getText(capturedRange);
                    if (currentContent !== newContent) {
                        edits.push(vscode.TextEdit.replace(capturedRange, newContent));
                    }
                } catch (error: any) {
                    console.error(`Error embedding ${capturedAttributes['file']}: ${error.message}`);
                }
            })());
        }

        await Promise.all(promises);
        return edits;
    }

    /**
     * Returns match indices of embeds whose current document content differs from source.
     * Used for stale detection in CodeLens.
     */
    public async getStaleMatchIndices(document: vscode.TextDocument): Promise<Set<number>> {
        const text = document.getText();
        const staleSet = new Set<number>();
        const promises: Promise<void>[] = [];
        const fenceRanges = getCodeFenceRanges(text);

        let match;
        const regex = new RegExp(this.embedRegex);

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const primaryKey = match[1];
            const remainingAttributes = match[2];
            const matchIndex = match.index;
            const matchLen = fullMatch.length;
            const attributeString = primaryKey + remainingAttributes;
            const attributes = this.parseAttributes(attributeString);

            if (isInCodeFence(matchIndex, fenceRanges)) { continue; }
            if (!attributes['file'] || attributes['lock'] === 'true') { continue; }

            const remainingText = text.substring(matchIndex + matchLen);
            const closeMatch = this.endEmbedRegex.exec(remainingText);

            if (!closeMatch) {
                // No embed:end → never embedded → stale
                staleSet.add(matchIndex);
                continue;
            }

            const closeIndex = matchIndex + matchLen + closeMatch.index;
            const closeEndIndex = closeIndex + closeMatch[0].length;
            const replaceRange = new vscode.Range(
                document.positionAt(matchIndex + matchLen),
                document.positionAt(closeEndIndex)
            );
            const currentContent = document.getText(replaceRange);

            const capturedIndex = matchIndex;
            const capturedAttrs = { ...attributes };
            const capturedCurrentContent = currentContent;

            promises.push((async () => {
                try {
                    const expectedContent = await this.buildNewContent(document, capturedAttrs);
                    if (expectedContent !== null && capturedCurrentContent !== expectedContent) {
                        staleSet.add(capturedIndex);
                    }
                } catch {
                    // Content resolution error — diagnostics will show it, not stale
                }
            })());
        }

        await Promise.all(promises);
        return staleSet;
    }

    /**
     * Builds the full replacement string for an embed (link + fenced code + end tag).
     * Returns null on error.
     */
    private async buildNewContent(
        document: vscode.TextDocument,
        attributes: { [key: string]: string }
    ): Promise<string | null> {
        try {
            const embedResult = await this.resolveContent(document, attributes);
            const lang = getLanguageId(attributes['file']);

            let linkText: string;
            if (isUrl(attributes['file'])) {
                linkText = `[Source: ${attributes['file']}](${attributes['file']})`;
            } else {
                const markdownDir = path.dirname(document.uri.fsPath);
                let relativePath = path.relative(markdownDir, embedResult.resolvedPath);
                relativePath = relativePath.split(path.sep).join('/');
                let linkSuffix = '';
                if (embedResult.startLine !== undefined && embedResult.endLine !== undefined) {
                    linkSuffix = `#L${embedResult.startLine}-L${embedResult.endLine}`;
                }
                linkText = `[Source: ${attributes['file']}](${relativePath}${linkSuffix})`;
            }

            let newContent = `\n${linkText}\n\`\`\`${lang}\n${embedResult.content}\n\`\`\`\n<!-- embed:end -->`;

            if (attributes['indent']) {
                const spaces = parseInt(attributes['indent'], 10);
                if (!isNaN(spaces) && spaces > 0) {
                    const prefix = ' '.repeat(spaces);
                    newContent = newContent.split('\n').map((line, i) => i === 0 ? line : prefix + line).join('\n');
                }
            }

            return newContent;
        } catch (error: any) {
            console.error(`Error building embed content for ${attributes['file']}: ${error.message}`);
            return null;
        }
    }

    /**
     * Removes any legacy `<!-- Error embedding ... -->` comments written by older versions.
     */
    public cleanLegacyErrorComments(document: vscode.TextDocument): vscode.TextEdit[] {
        const text = document.getText();
        const edits: vscode.TextEdit[] = [];
        const errorRegex = /\n?<!--\s*Error embedding [^>]+-->/g;
        let match;
        while ((match = errorRegex.exec(text)) !== null) {
            const start = document.positionAt(match.index);
            const end = document.positionAt(match.index + match[0].length);
            edits.push(vscode.TextEdit.delete(new vscode.Range(start, end)));
        }
        return edits;
    }

    private parseAttributes(str: string): { [key: string]: string } {
        const attrs: { [key: string]: string } = {};
        const attrRegex = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
        let match;
        while ((match = attrRegex.exec(str)) !== null) {
            attrs[match[1]] = match[2];
        }
        return attrs;
    }

    private async resolveContent(document: vscode.TextDocument, attrs: { [key: string]: string }): Promise<EmbedContent> {
        let fileContent: string;
        let resolvedPath: string;

        if (isUrl(attrs['file'])) {
            fileContent = await fetchUrl(attrs['file']);
            resolvedPath = attrs['file'];
        } else {
            resolvedPath = await resolveFilePath(document, attrs['file']);
            fileContent = await fs.promises.readFile(resolvedPath, 'utf-8');
        }

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
            const includeMarkers = attrs['strip-comments'] === 'false';
            const regionData = this.extractRegion(lines, attrs['region'], includeMarkers);
            content = regionData.content;
            startLine = regionData.startLine;
            endLine = regionData.endLine;
        }

        // For full-file / line-range embeds: strip any #region/#endregion lines unless disabled
        if (!attrs['region'] && attrs['strip-comments'] !== 'false') {
            content = content.split(/\r?\n/)
                .filter(line => !REGION_MARKER_REGEX.test(line))
                .join('\n');
        }

        // Strip common indentation
        content = this.stripIndentation(content);

        // Handle 'new' attribute for line highlighting
        if (attrs['new']) {
            const newLines = new Set<number>();
            attrs['new'].split(',').forEach(part => {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
                    if (!isNaN(start) && !isNaN(end)) {
                        for (let i = start; i <= end; i++) {
                            newLines.add(i);
                        }
                    }
                } else {
                    const line = parseInt(part.trim(), 10);
                    if (!isNaN(line)) {
                        newLines.add(line);
                    }
                }
            });

            const langId = getLanguageId(resolvedPath);
            const [commentPrefix, commentSuffix] = getCommentPrefix(langId);

            const linesToProcess = content.split(/\r?\n/);

            let maxLineLength = 0;
            linesToProcess.forEach(line => {
                if (line.length > maxLineLength) {
                    maxLineLength = line.length;
                }
            });

            const processedLines = linesToProcess.map((line, index) => {
                const originalLineNumber = (startLine || 1) + index;
                if (newLines.has(originalLineNumber)) {
                    const padding = ' '.repeat(maxLineLength - line.length + 1);
                    const suffix = `${padding}${commentPrefix} NEW${commentSuffix}`;
                    return line + suffix;
                }
                return line;
            });
            content = processedLines.join('\n');
        }

        // Handle 'withLineNumbers' attribute
        if (attrs['withLineNumbers'] === 'true') {
            const linesToProcess = content.split(/\r?\n/);
            const maxLineNumber = (startLine || 1) + linesToProcess.length - 1;
            const maxLineNumberWidth = maxLineNumber.toString().length;

            const processedLines = linesToProcess.map((line, index) => {
                const originalLineNumber = (startLine || 1) + index;
                const paddedLineNumber = originalLineNumber.toString().padStart(maxLineNumberWidth, ' ');
                return `${paddedLineNumber}: ${line}`;
            });
            content = processedLines.join('\n');
        }

        return {
            content,
            resolvedPath,
            startLine,
            endLine
        };
    }

    private extractRegion(lines: string[], regionName: string, includeMarkers = false): { content: string, startLine: number, endLine: number } {
        const regionStartRegex = new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#region\\s+${regionName}\\s*(?:-->|\\*\\/)?$`);
        const regionEndRegex = new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#endregion\\s*(?:-->|\\*\\/)?`);

        let startIdx = -1; // 0-based index of the #region line
        let endIdx = -1;   // 0-based index of the #endregion line

        for (let i = 0; i < lines.length; i++) {
            if (regionStartRegex.test(lines[i])) {
                startIdx = i;
                continue;
            }
            if (startIdx !== -1 && regionEndRegex.test(lines[i])) {
                endIdx = i;
                break;
            }
        }

        if (startIdx !== -1 && endIdx !== -1) {
            const sliceFrom = includeMarkers ? startIdx     : startIdx + 1;
            const sliceTo   = includeMarkers ? endIdx + 1   : endIdx;
            return {
                content: lines.slice(sliceFrom, sliceTo).join('\n'),
                startLine: startIdx + 2, // 1-based, first content line
                endLine: endIdx          // 1-based, last content line
            };
        }

        throw new Error(`Region ${regionName} not found`);
    }

    private stripIndentation(content: string): string {
        const lines = content.split(/\r?\n/);

        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim().length === 0) { continue; }
            const match = line.match(/^(\s*)/);
            if (match) {
                minIndent = Math.min(minIndent, match[1].length);
            }
        }

        if (minIndent === Infinity || minIndent === 0) {
            return content;
        }

        return lines.map(line => {
            if (line.length < minIndent) { return ''; }
            return line.substring(minIndent);
        }).join('\n');
    }
}
