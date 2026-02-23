"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.resolveFilePath = exports.getCommentPrefix = exports.getLanguageId = void 0;
var path = require("path");
var fs = require("fs");
var vscode = require("vscode");
function getLanguageId(filePath) {
    var ext = path.extname(filePath).toLowerCase();
    var map = {
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
exports.getLanguageId = getLanguageId;
function getCommentPrefix(languageId) {
    var prefixes = {
        'javascript': '//',
        'typescript': '//',
        'c': '//',
        'cpp': '//',
        'csharp': '//',
        'java': '//',
        'go': '//',
        'rust': '//',
        'php': '//',
        'python': '#',
        'ruby': '#',
        'perl': '#',
        'yaml': '#',
        'shellscript': '#',
        'bash': '#',
        'html': '<!--',
        'xml': '<!--',
        'css': '/*',
        'sql': '--',
        'lua': '--'
    };
    return prefixes[languageId] || '//';
}
exports.getCommentPrefix = getCommentPrefix;
function resolveFilePath(document, relPath) {
    return __awaiter(this, void 0, void 0, function () {
        var targetPath, _a, workspaceFolder, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    targetPath = path.resolve(path.dirname(document.uri.fsPath), relPath);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 10]);
                    return [4 /*yield*/, fs.promises.access(targetPath)];
                case 2:
                    _c.sent();
                    return [2 /*return*/, targetPath];
                case 3:
                    _a = _c.sent();
                    workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                    if (!workspaceFolder) return [3 /*break*/, 8];
                    targetPath = path.resolve(workspaceFolder.uri.fsPath, relPath);
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, fs.promises.access(targetPath)];
                case 5:
                    _c.sent();
                    return [2 /*return*/, targetPath];
                case 6:
                    _b = _c.sent();
                    throw new Error("File not found: ".concat(relPath));
                case 7: return [3 /*break*/, 9];
                case 8: throw new Error("File not found: ".concat(relPath));
                case 9: return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.resolveFilePath = resolveFilePath;
