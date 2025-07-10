
# ⏱️ humantime-js

[![npm version](https://img.shields.io/npm/v/humantime-js?style=flat-square&color=brightgreen)](https://www.npmjs.com/package/humantime-js)
[![License](https://img.shields.io/npm/l/humantime-js?style=flat-square)](LICENSE)
[![Bundle Size](https://badgen.net/bundlephobia/min/humantime-js)](https://bundlephobia.com/result?p=humantime-js)

> ⚡ A tiny JavaScript library to turn timestamps into friendly phrases like **"just now"**, **"5 mins ago"**, or **"yesterday"**.
---

## ✨ Features
✅ Ultra lightweight (under 1 KB) 
✅ Zero dependencies  
✅ Works seamlessly in Node.js & browsers  
✅ Simple, clean & human-friendly  
✅ Quick to use and easy to customize
---


## 📦 Installation
```bash
npm install humantime-js
```
or with yarn
```bash
yarn add humantime-js
```

## 🚀 Usage
```bash
import { timeAgo } from 'humantime-js';

// Example: 3 minutes ago
console.log(timeAgo(new Date(Date.now() - 3 * 60 * 1000))); // "3 mins ago"

// Example: just now
console.log(timeAgo(new Date())); // "just now"
```
>✨ Make your UI, blog, feed, or dashboard feel more alive and user-friendly!

##
