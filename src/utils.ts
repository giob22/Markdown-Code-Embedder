import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as vscode from 'vscode';

export function isUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://');
}

export function fetchUrl(url: string, redirectCount = 0): Promise<string> {
    if (redirectCount > 5) {
        return Promise.reject(new Error(`Too many redirects fetching ${url}`));
    }
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https://') ? https : http;
        const req = client.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                resolve(fetchUrl(res.headers.location, redirectCount + 1));
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                res.resume();
                return;
            }
            res.setEncoding('utf8');
            let data = '';
            res.on('data', (chunk: string) => { data += chunk; });
            res.on('end', () => resolve(data));
        });
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
        req.on('error', reject);
    });
}

export function getLanguageId(filePath: string): string {
    let cleanPath = filePath;
    if (isUrl(filePath)) {
        cleanPath = filePath.split('?')[0].split('#')[0];
    }
    const ext = path.extname(cleanPath).toLowerCase();
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
        '.rb': 'ruby',
        '.lua': 'lua'
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

/**
 * Returns character-offset ranges [start, end) for every fenced code block in text.
 * Used to skip embed tags that appear inside ``` or ~~~ fences.
 */
export function getCodeFenceRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    // Match opening fence (3+ backticks or tildes) followed by any info string,
    // then content, then a closing fence with the same or more characters.
    const fenceRegex = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm;
    let m;
    while ((m = fenceRegex.exec(text)) !== null) {
        ranges.push([m.index, m.index + m[0].length]);
    }
    return ranges;
}

export function isInCodeFence(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
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
