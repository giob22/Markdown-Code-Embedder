import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getLanguageId, resolveFilePath, getCommentPrefix } from './utils';

interface EmbedContent {
    content: string;
    resolvedPath: string;
    startLine?: number;
    endLine?: number;
}

export class MarkdownEmbedder {
    private readonly embedRegex = /<!--\s*embed:([^\s]+)(.*?)-->/g;
    private readonly endEmbedRegex = /<!--\s*embed:end\s*-->/;

    public async generateEditsForIndex(document: vscode.TextDocument, targetIndex: number): Promise<vscode.TextEdit[]> {
        const text = document.getText();
        const regex = new RegExp(this.embedRegex.source, 'g');
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (match.index === targetIndex) {
                return this.generateEdits(document, targetIndex);
            }
        }
        return [];
    }

    public async generateEdits(document: vscode.TextDocument, onlyIndex?: number): Promise<vscode.TextEdit[]> {
        const text = document.getText();
        const edits: vscode.TextEdit[] = [];
        const promises: Promise<void>[] = [];

        let match;
        const regex = new RegExp(this.embedRegex);

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const primaryKey = match[1];
            const remainingAttributes = match[2];

            const matchIndex = match.index;
            const matchLen = fullMatch.length;

            // If targeting a specific embed, skip all others
            if (onlyIndex !== undefined && matchIndex !== onlyIndex) {
                continue;
            }

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

            // Find the closing tag
            const nextStartRegex = new RegExp(this.embedRegex.source);
            let nextStartMatch = nextStartRegex.exec(remainingText);

            // Ignore if the start tag is actually an end tag
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

                    const newContent = `\n${linkText}\n\`\`\`${lang}\n${embedResult.content}\n\`\`\`\n<!-- embed:end -->`;

                    const currentContent = document.getText(replaceRange);
                    if (currentContent !== newContent) {
                        edits.push(vscode.TextEdit.replace(replaceRange, newContent));
                    }
                } catch (error: any) {
                    // Do not write errors into the document — diagnostics provider
                    // surfaces them as squiggly lines + Problems panel entries.
                    console.error(`Error embedding ${attributes['file']}: ${error.message}`);
                }
            })());
        }

        await Promise.all(promises);
        return edits;
    }

    /**
     * Removes any legacy `<!-- Error embedding ... -->` comments written by older versions.
     * Returns TextEdits that delete them so the document stays clean.
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

        // Strip indentation first to ensure alignment is correct relative to visual content
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

            const langId = getLanguageId(filePath);
            const [commentPrefix, commentSuffix] = getCommentPrefix(langId);

            const linesToProcess = content.split(/\r?\n/);

            // Calculate max line length for alignment
            let maxLineLength = 0;
            linesToProcess.forEach(line => {
                if (line.length > maxLineLength) {
                    maxLineLength = line.length;
                }
            });

            const processedLines = linesToProcess.map((line, index) => {
                const originalLineNumber = (startLine || 1) + index;
                if (newLines.has(originalLineNumber)) {
                    // Calculate padding needed to align comments
                    // We add a minimal padding of 1 space if line equals max length
                    // Alignment position = maxLineLength + 1
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
            resolvedPath: filePath,
            startLine,
            endLine
        };
    }

    private extractRegion(lines: string[], regionName: string): { content: string, startLine: number, endLine: number } {
        const regionStartRegex = new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#region\\s+${regionName}\\s*(?:-->|\\*\\/)?$`);
        const regionEndRegex = new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#endregion\\s*(?:-->|\\*\\/)?`);

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

    private stripIndentation(content: string): string {
        const lines = content.split(/\r?\n/);

        let minIndent = Infinity;
        for (const line of lines) {
            if (line.trim().length === 0) continue;
            const match = line.match(/^(\s*)/);
            if (match) {
                minIndent = Math.min(minIndent, match[1].length);
            }
        }

        if (minIndent === Infinity || minIndent === 0) {
            return content;
        }

        return lines.map(line => {
            if (line.length < minIndent) return '';
            return line.substring(minIndent);
        }).join('\n');
    }
}
