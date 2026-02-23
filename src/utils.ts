import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function getLanguageId(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: { [key: string]: string } = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.css': 'css',
        '.html': 'html',
        '.json': 'json',
        '.md': 'markdown',
        '.sh': 'bash',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.xml': 'xml',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby'
    };
    return map[ext] || '';
}


export function getCommentPrefix(languageId: string): [string, string] {
    const formats: { [key: string]: [string, string] } = {
        'javascript': ['//', ''],
        'typescript': ['//', ''],
        'c': ['//', ''],
        'cpp': ['//', ''],
        'csharp': ['//', ''],
        'java': ['//', ''],
        'go': ['//', ''],
        'rust': ['//', ''],
        'php': ['//', ''],
        'python': ['#', ''],
        'ruby': ['#', ''],
        'perl': ['#', ''],
        'yaml': ['#', ''],
        'shellscript': ['#', ''],
        'bash': ['#', ''],
        'html': ['<!--', ' -->'],
        'xml': ['<!--', ' -->'],
        'css': ['/*', ' */'],
        'sql': ['--', ''],
        'lua': ['--', '']
    };
    return formats[languageId] || ['//', ''];
}

export async function resolveFilePath(document: vscode.TextDocument, relPath: string): Promise<string> {
    let targetPath = path.resolve(path.dirname(document.uri.fsPath), relPath);

    try {
        await fs.promises.access(targetPath);
        return targetPath;
    } catch {
        // Try relative to workspace root
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            targetPath = path.resolve(workspaceFolder.uri.fsPath, relPath);
            try {
                await fs.promises.access(targetPath);
                return targetPath;
            } catch {
                throw new Error(`File not found: ${relPath}`);
            }
        } else {
            throw new Error(`File not found: ${relPath}`);
        }
    }
}
