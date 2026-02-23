# 🎮 Markdown Code Embedder Demo

Welcome to the **Markdown Code Embedder**! This file is your playground to test the extension's capabilities.

## 🚀 How to Use This Demo

1. **Delete** the code blocks between the `<!-- embed:... -->` comments.
2. **Save** this file (`Ctrl+S`).
3. Watch the code reappear automatically! ✨

---

## 1. Embed a Region (The Best Way!)

Regions are the most robust way to embed code. Even if line numbers change in the source, this embed will stay correct.

<!-- embed:file="./src/demo.ts" region="hello-world" new="4-5" -->
[Source: ./src/demo.ts](demo.ts#L4-L6)
```typescript
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
```
<!-- embed:end -->

You can also combine ranges and single lines!

<!-- embed:file="./src/demo.ts" new="5-6,11" -->
[Source: ./src/demo.ts](demo.ts)
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

## 2. Embed a Specific Line Range

Perfect for quick snippets where you just want lines 10-12.

<!-- embed:file="./src/demo.ts" line="10-12" -->
[Source: ./src/demo.ts](demo.ts#L10-L12)
```typescript
const x = 10;
const y = 20;
console.log(x + y + 50);
```
<!-- embed:end -->

## 3. Embed an Entire File

Need to show the whole file? Easy.

<!-- embed:file="./src/demo.ts" -->
[Source: ./src/demo.ts](demo.ts)
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

## 4. Embed with Highlighting ✨

Want to draw attention to specific lines? Use the `new` attribute!

<!-- embed:file="demo.ts" new="5,11"-->
[Source: demo.ts](demo.ts)
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

## 5. Locked Embed (Frozen in Time) ❄️

This embed has `lock="true"`. Even if you change the source file, this block will **not** update. Great for historical records.

<!-- embed:file="./src/demo.ts" line="4-6" lock="true" -->
```typescript
// This content is locked!
console.log("I will not change even if source does.");
```
<!-- embed:end -->

<!-- embed:file="./src/demo.ts" line="4-6" new="4-6" -->
[Source: ./src/demo.ts](demo.ts#L4-L6)
```typescript
function hello(name: string) {
    console.log(`Hello, ${name}!`);
}
```
<!-- embed:end -->




