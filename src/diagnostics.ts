import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFilePath, isUrl, getCodeFenceRanges, isInCodeFence } from './utils';

const EMBED_REGEX = /<!--\s*embed:([^\s]+)(.*?)-->/g;
const ATTR_REGEX = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
const REGION_START_REGEX = (name: string) =>
    new RegExp(`^\\s*(?:\\/\\/|--|#|<!--|\\/\\*)\\s*#region\\s+${name}\\s*(?:-->|\\*\\/)?$`);

export class EmbedDiagnosticsProvider {
    private collection: vscode.DiagnosticCollection;

    constructor() {
        this.collection = vscode.languages.createDiagnosticCollection('markdown-embed');
    }

    public get diagnosticCollection(): vscode.DiagnosticCollection {
        return this.collection;
    }

    public async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'markdown') {
            return;
        }

        const text = document.getText();
        const diagnostics: vscode.Diagnostic[] = [];
        const fenceRanges = getCodeFenceRanges(text);
        const regex = new RegExp(EMBED_REGEX.source, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const fullMatch = match[0];
            const primaryKey = match[1];
            const remainingAttributes = match[2];
            const attributeString = primaryKey + remainingAttributes;

            const attrs: { [key: string]: string } = {};
            const attrRegex = new RegExp(ATTR_REGEX.source, 'g');
            let attrMatch;
            while ((attrMatch = attrRegex.exec(attributeString)) !== null) {
                attrs[attrMatch[1]] = attrMatch[2];
            }

            if (!attrs['file']) {
                continue;
            }

            // Skip tags inside fenced code blocks
            if (isInCodeFence(match.index, fenceRanges)) {
                continue;
            }

            // URL embeds: skip local-file validation
            if (isUrl(attrs['file'])) {
                continue;
            }

            const matchStart = document.positionAt(match.index);
            const matchEnd = document.positionAt(match.index + fullMatch.length);
            const range = new vscode.Range(matchStart, matchEnd);

            // Check file exists
            let resolvedPath: string | undefined;
            try {
                resolvedPath = await resolveFilePath(document, attrs['file']);
            } catch {
                const diag = new vscode.Diagnostic(
                    range,
                    `Embed file not found: "${attrs['file']}"`,
                    vscode.DiagnosticSeverity.Error
                );
                diag.source = 'markdown-embed';
                diagnostics.push(diag);
                continue;
            }

            // Check region exists
            if (attrs['region']) {
                try {
                    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
                    const lines = content.split(/\r?\n/);
                    const regionRegex = REGION_START_REGEX(attrs['region']);
                    const found = lines.some(l => regionRegex.test(l));
                    if (!found) {
                        const diag = new vscode.Diagnostic(
                            range,
                            `Region "${attrs['region']}" not found in "${attrs['file']}"`,
                            vscode.DiagnosticSeverity.Error
                        );
                        diag.source = 'markdown-embed';
                        diagnostics.push(diag);
                    }
                } catch {
                    // file read error already caught above
                }
            }

            // Check line range validity
            if (attrs['line']) {
                const parts = attrs['line'].split('-').map(n => parseInt(n, 10));
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[0] > parts[1]) {
                    const diag = new vscode.Diagnostic(
                        range,
                        `Invalid line range "${attrs['line']}". Format: "start-end" (e.g. "1-10")`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diag.source = 'markdown-embed';
                    diagnostics.push(diag);
                } else if (resolvedPath) {
                    try {
                        const content = await fs.promises.readFile(resolvedPath, 'utf-8');
                        const lineCount = content.split(/\r?\n/).length;
                        if (parts[1] > lineCount) {
                            const diag = new vscode.Diagnostic(
                                range,
                                `Line range "${attrs['line']}" exceeds file length (${lineCount} lines)`,
                                vscode.DiagnosticSeverity.Warning
                            );
                            diag.source = 'markdown-embed';
                            diagnostics.push(diag);
                        }
                    } catch { /* ignore */ }
                }
            }
        }

        this.collection.set(document.uri, diagnostics);
    }

    public clearDiagnostics(document: vscode.TextDocument): void {
        this.collection.delete(document.uri);
    }

    public dispose(): void {
        this.collection.dispose();
    }
}
