<p align="center">
  <img src="assets/banner.png" alt="humantime-js Banner" />
</p>

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

## 📜 API
```
timeAgo(date: Date): string
```
Takes a JavaScript ``` Date ```object and returns a human-readable relative time string.

## 🛠️ Build & Test
```bash
npm run build       # Build the library with Rollup
npm test            # Run tests with Jest
```
## 🤝 Contributing
Contributions, issues and feature requests are welcome!
Feel free to open an issue or submit a pull request.

If you like this project, consider leaving a ⭐ to show your support!

## 📄 License
MIT © 2025 Agyare Kelvin Yeboah

## 🌟 Why humantime-js?
Because your users deserve text that feels natural, familiar, and human – not robotic timestamps.


## 📬 Let’s Connect  

Have feedback, ideas, or just want to chat? Reach out to me:  
<div>
  <a href="mailto:onlykelvin06@gmail.com">
    <img src="https://img.shields.io/badge/Email-4285F4?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
  <a href="https://www.instagram.com/_.yo.kelvin/">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" />
  </a>
  <a href="https://www.youtube.com/@TechTutor_Tv?sub_confirmation=1">
    <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube" />
  </a>
  <a href = "https://www.linkedin.com/in/kelvin-agyare-yeboah-6728a7301?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://github.com/KelvCodes">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
</div>     
