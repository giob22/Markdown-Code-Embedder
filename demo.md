# 🎮 Markdown Code Embedder Demo

Welcome to the **Markdown Code Embedder**! This file is your playground to test the extension's capabilities.

## 🚀 How to Use This Demo

1. **Delete** the code blocks between the `<!-- embed:... -->` comments.
2. **Save** this file (`Ctrl+S`).
3. Watch the code reappear automatically! ✨

---

## 1. Embed a Region (The Best Way!)

Regions are the most robust way to embed code. Even if line numbers change in the source, this embed will stay correct.

<!-- embed:file="./src/demo.ts" region="hello-world" -->
[Source: ./src/demo.ts](src/demo.ts#L3-L7)
```typescript
// #region hello-world
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
// #endregion
```
<!-- embed:end -->

## 2. Embed a Specific Line Range

Perfect for quick snippets where you just want lines 10-12.

<!-- embed:file="./src/demo.ts" line="10-12" -->
[Source: ./src/demo.ts](src/demo.ts#L10-L12)
```typescript
const x = 10;
const y = 20;
console.log(x + y + 50);
```
<!-- embed:end -->

## 3. Embed an Entire File

Need to show the whole file? Easy.

<!-- embed:file="./src/demo.ts" -->
[Source: ./src/demo.ts](src/demo.ts)
```typescript
// This is a demo file for testing embedding

// #region hello-world
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
// #endregion

// #region second-region
const x = 10;
const y = 20;
console.log(x + y + 50);
// #endregion
```
<!-- embed:end -->

## 4. Locked Embed (Frozen in Time) ❄️

This embed has `lock="true"`. Even if you change the source file, this block will **not** update. Great for historical records.

<!-- embed:file="./src/demo.ts" line="4-6" lock="true" -->
```typescript
// This content is locked!
console.log("I will not change even if source does.");
```
<!-- embed:end -->
