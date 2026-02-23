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
exports.MarkdownEmbedder = void 0;
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var utils_1 = require("./utils");
var MarkdownEmbedder = /** @class */ (function () {
    function MarkdownEmbedder() {
        this.embedRegex = /<!--\s*embed:([^\s]+)(.*?)-->/g;
        this.endEmbedRegex = /<!--\s*embed:end\s*-->/;
    }
    MarkdownEmbedder.prototype.generateEdits = function (document) {
        return __awaiter(this, void 0, void 0, function () {
            var text, edits, promises, match, regex, _loop_1, this_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        text = document.getText();
                        edits = [];
                        promises = [];
                        regex = new RegExp(this.embedRegex);
                        _loop_1 = function () {
                            var fullMatch = match[0];
                            var primaryKey = match[1];
                            var remainingAttributes = match[2];
                            var matchIndex = match.index;
                            var matchLen = fullMatch.length;
                            // Combine attributes for parsing
                            var attributeString = primaryKey + remainingAttributes;
                            var attributes = this_1.parseAttributes(attributeString);
                            if (!attributes['file']) {
                                return "continue";
                            }
                            // If lock="true", skip updating this embed
                            if (attributes['lock'] === 'true') {
                                return "continue";
                            }
                            var remainingText = text.substring(matchIndex + matchLen);
                            var closeMatch = this_1.endEmbedRegex.exec(remainingText);
                            var replaceRange;
                            // Find the closing tag
                            var nextStartRegex = new RegExp(this_1.embedRegex.source);
                            var nextStartMatch = nextStartRegex.exec(remainingText);
                            // Ignore if the start tag is actually an end tag
                            if (nextStartMatch && this_1.endEmbedRegex.test(nextStartMatch[0])) {
                                nextStartMatch = null;
                            }
                            if (closeMatch && text.indexOf(closeMatch[0], matchIndex + matchLen) !== -1 &&
                                (!nextStartMatch || closeMatch.index < nextStartMatch.index)) {
                                // Determine if there is content between start and end that looks like a code block we manage
                                var closeIndex = matchIndex + matchLen + closeMatch.index;
                                var closeEndIndex = closeIndex + closeMatch[0].length;
                                replaceRange = new vscode.Range(document.positionAt(matchIndex + matchLen), document.positionAt(closeEndIndex));
                            }
                            else {
                                replaceRange = new vscode.Range(document.positionAt(matchIndex + matchLen), document.positionAt(matchIndex + matchLen));
                            }
                            promises.push((function () { return __awaiter(_this, void 0, void 0, function () {
                                var embedResult, lang, markdownDir, relativePath, linkSuffix, linkText, newContent, currentContent, error_1;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, this.resolveContent(document, attributes)];
                                        case 1:
                                            embedResult = _a.sent();
                                            lang = (0, utils_1.getLanguageId)(attributes['file']);
                                            markdownDir = path.dirname(document.uri.fsPath);
                                            relativePath = path.relative(markdownDir, embedResult.resolvedPath);
                                            // Ensure relative path uses forward slashes for Markdown compatibility
                                            relativePath = relativePath.split(path.sep).join('/');
                                            linkSuffix = '';
                                            if (embedResult.startLine !== undefined && embedResult.endLine !== undefined) {
                                                linkSuffix = "#L".concat(embedResult.startLine, "-L").concat(embedResult.endLine);
                                            }
                                            linkText = "[Source: ".concat(attributes['file'], "](").concat(relativePath).concat(linkSuffix, ")");
                                            newContent = "\n".concat(linkText, "\n```").concat(lang, "\n").concat(embedResult.content, "\n```\n<!-- embed:end -->");
                                            currentContent = document.getText(replaceRange);
                                            if (currentContent !== newContent) {
                                                edits.push(vscode.TextEdit.replace(replaceRange, newContent));
                                            }
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_1 = _a.sent();
                                            console.error("Error embedding ".concat(attributes['file'], ": ").concat(error_1.message));
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); })());
                        };
                        this_1 = this;
                        while ((match = regex.exec(text)) !== null) {
                            _loop_1();
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, edits];
                }
            });
        });
    };
    MarkdownEmbedder.prototype.parseAttributes = function (str) {
        var attrs = {};
        // Match key="value" or key='value'
        var attrRegex = /([a-zA-Z0-9-_]+)=["']([^"']+)["']/g;
        var match;
        while ((match = attrRegex.exec(str)) !== null) {
            attrs[match[1]] = match[2];
        }
        return attrs;
    };
    MarkdownEmbedder.prototype.resolveContent = function (document, attrs) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, fileContent, lines, content, startLine, endLine, _a, start, end, regionData, newLines_1, langId, commentPrefix_1, linesToProcess, processedLines;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, utils_1.resolveFilePath)(document, attrs['file'])];
                    case 1:
                        filePath = _b.sent();
                        return [4 /*yield*/, fs.promises.readFile(filePath, 'utf-8')];
                    case 2:
                        fileContent = _b.sent();
                        lines = fileContent.split(/\r?\n/);
                        content = fileContent;
                        if (attrs['line']) {
                            _a = attrs['line'].split('-').map(function (n) { return parseInt(n, 10); }), start = _a[0], end = _a[1];
                            if (isNaN(start) || isNaN(end)) {
                                throw new Error('Invalid line format');
                            }
                            content = lines.slice(start - 1, end).join('\n');
                            startLine = start;
                            endLine = end;
                        }
                        else if (attrs['region']) {
                            regionData = this.extractRegion(lines, attrs['region']);
                            content = regionData.content;
                            startLine = regionData.startLine;
                            endLine = regionData.endLine;
                        }
                        // Handle 'new' attribute for line highlighting
                        if (attrs['new']) {
                            newLines_1 = attrs['new'].split(',').map(function (n) { return parseInt(n.trim(), 10); });
                            langId = (0, utils_1.getLanguageId)(filePath);
                            commentPrefix_1 = (0, utils_1.getCommentPrefix)(langId);
                            linesToProcess = content.split(/\r?\n/);
                            processedLines = linesToProcess.map(function (line, index) {
                                var originalLineNumber = (startLine || 1) + index;
                                if (newLines_1.includes(originalLineNumber)) {
                                    // Check if line already has a comment, if so append, otherwise add new comment
                                    // For simplicity, just append to the end. 
                                    var suffix = " ".concat(commentPrefix_1, " NEW");
                                    return line + suffix;
                                }
                                return line;
                            });
                            content = processedLines.join('\n');
                        }
                        content = this.stripIndentation(content);
                        return [2 /*return*/, {
                                content: content,
                                resolvedPath: filePath,
                                startLine: startLine,
                                endLine: endLine
                            }];
                }
            });
        });
    };
    MarkdownEmbedder.prototype.extractRegion = function (lines, regionName) {
        var regionStartRegex = new RegExp("^\\s*(?:\\/\\/|#|<!--|\\/\\*)\\s*#region\\s+".concat(regionName, "\\s*(?:-->|\\*\\/)?$"));
        var regionEndRegex = new RegExp("^\\s*(?:\\/\\/|#|<!--|\\/\\*)\\s*#endregion\\s*(?:-->|\\*\\/)?");
        // Also support just #endregion without name or strict matching if preferred, but strict is safer for named regions
        var startLine = -1;
        var endLine = -1;
        for (var i = 0; i < lines.length; i++) {
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
                startLine: startLine + 1,
                endLine: endLine // 1-based end line (inclusive)
            };
        }
        throw new Error("Region ".concat(regionName, " not found"));
    };
    MarkdownEmbedder.prototype.stripIndentation = function (content) {
        var lines = content.split(/\r?\n/);
        var minIndent = Infinity;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            if (line.trim().length === 0)
                continue;
            var match = line.match(/^(\s*)/);
            if (match) {
                minIndent = Math.min(minIndent, match[1].length);
            }
        }
        if (minIndent === Infinity || minIndent === 0) {
            return content;
        }
        return lines.map(function (line) {
            if (line.length < minIndent)
                return '';
            return line.substring(minIndent);
        }).join('\n');
    };
    return MarkdownEmbedder;
}());
exports.MarkdownEmbedder = MarkdownEmbedder;
