# 🌌 CODA: Intelligent Snippet Vault

![Version](https://img.shields.io/badge/version-2.1.1--PRODUCTION-red?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Hardened-green?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Gemini_Powered-blue?style=for-the-badge)

**Coda** is a high-performance, security-hardened snippet manager designed for modern developers. It combines a terminal-inspired aesthetic with advanced AI intelligence, allowing you to capture, link, and analyze your code across multiple projects in a zero-trust environment.

---

## 🚀 Key Features

### 🧠 Neural Co-Pilot (Gemini Integrated)

- **Contextual Intelligence:** Automatically suggests improvements and architectural tips based on your active code buffer.
- **Topology Analysis:** Understand the "synergy" between snippets across different projects using generative AI.
- **Auto-Tagging:** Intelligent categorization of snippets for instant retrieval.

### 🔒 Hardened Security

- **Argon2id Encryption:** Industry-standard password hashing with hardened parameters (64MB RAM, 3 iterations).
- **Strict IPC Protocol:** Robust Content Security Policy (CSP) prevents unauthorized script execution and data exfiltration.
- **Vault Integrity:** Atomic backup/restore system with schema verification.

### 🎨 Premium Aesthetics

- **Dynamic Themes:** Switch between high-contrast protocols: **Crimson**, **Void**, **Matrix**, and **Glacier**.
- **Interactive UI:** Framer Motion animations, glassmorphism effects, and real-time system telemetry.
- **Circular Brand Identity:** A unified, professional interface designed for focus.

### 📊 Performance Analytics

- **Telemetry Engine:** Real-time monitoring of CPU usage, RAM allocation, and database latency.
- **Resource Ledger:** Track snippet usage, copy velocity, and cross-project density.

---

## 📦 Latest Release (v1.0.0)

The production installers are optimized for Windows x64 and include all security hardening features.

| File Type                    | Download Link                                                      | Description                                                   |
| :--------------------------- | :----------------------------------------------------------------- | :------------------------------------------------------------ |
| **Standard Installer** | [Coda_2.1.1_x64-setup.exe](./release_output/Coda_2.1.1_x64-setup.exe) | Recommended for most users. Includes auto-update support.     |
| **Enterprise MSI**     | [Coda_2.1.1_x64_en-US.msi](./release_output/Coda_2.1.1_x64_en-US.msi) | Designed for silent installations and system-wide deployment. |

> [!IMPORTANT]
> These files are located in the `/release_output` directory of this repository.

---

## 🛠️ Development

### Prerequisites

- **Rust:** `1.75+`
- **Node.js:** `20+`
- **Tauri CLI:** `npm install -g @tauri-apps/cli`

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/coda.git

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
# Generate optimized production bundles
npm run tauri build
```

---

## 🛡️ Security Policy

Coda operates on a **Zero-Trust** model. All local data is isolated, and neural links to the Gemini API are encrypted via HTTPS. No snippet content is stored on external servers except for transient AI analysis buffers.

---

## 📄 License

Copyright © 2026 K.A.Y.E. All rights reserved.
