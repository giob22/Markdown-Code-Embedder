import * as vscode from 'vscode';

const EMBED_REGEX = /<!--\s*embed:([^\s]+)(.*?)-->/g;
const ATTR_REGEX = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;

export class EmbedCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        if (document.languageId !== 'markdown') {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        const text = document.getText();
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

            const matchStart = document.positionAt(match.index);
            const range = new vscode.Range(matchStart, matchStart);
            const isLocked = attrs['lock'] === 'true';

            // Update lens (only if not locked)
            if (!isLocked) {
                lenses.push(new vscode.CodeLens(range, {
                    title: '↻ Update',
                    command: 'markdown-embed.updateSingle',
                    arguments: [document.uri, match.index],
                    tooltip: 'Update this embed'
                }));
            } else {
                lenses.push(new vscode.CodeLens(range, {
                    title: '🔒 Locked',
                    command: '',
                    tooltip: 'This embed is locked and will not be auto-updated'
                }));
            }

            // Go to source lens
            lenses.push(new vscode.CodeLens(range, {
                title: `→ ${attrs['file']}${attrs['region'] ? `#${attrs['region']}` : ''}`,
                command: 'markdown-embed.goToSource',
                arguments: [document.uri, match.index],
                tooltip: `Open ${attrs['file']}`
            }));

            // Lock/Unlock lens
            lenses.push(new vscode.CodeLens(range, {
                title: isLocked ? '🔓 Unlock' : '🔒 Lock',
                command: isLocked ? 'markdown-embed.unlock' : 'markdown-embed.lock',
                arguments: [document.uri, match.index, fullMatch],
                tooltip: isLocked ? 'Allow auto-updates for this embed' : 'Prevent auto-updates for this embed'
            }));
        }

        return lenses;
    }
}
