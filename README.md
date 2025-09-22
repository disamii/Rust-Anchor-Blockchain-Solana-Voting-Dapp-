# 🗳️ Voting DApp

A decentralized voting application built with **Rust**, **Next.js**, **Solana**, and **Anchor**.
This DApp allows users to vote between multiple options, automatically tally results, and store everything securely on the **Solana blockchain**.

---

## 📌 Features

* Vote between multiple options ✅
* Results **automatically tallied** in real time 📊
* Votes stored on **Solana blockchain program account** 🔐
* UI built with **Next.js + Tailwind CSS** 🎨
* Wallet integration using **@solana/web3.js** 💳
* Works on **Local Validator** and **Devnet** 🌍
* Smart contract written with **Anchor framework** ⚓

---

## 📂 Project Structure

```
Rust-Anchor-Blockchain-Solana-Voting-Dapp/
│── .next/              # Next.js build output
│── anchor/             # Anchor program (Solana smart contract)
│── node_modules/       # Dependencies
│── public/             # Static assets (icons, images, etc.)
│── src/                # Frontend source code (components, pages, hooks)
│── test-ledger/        # Local Solana test ledger
│
│── .gitignore          # Git ignore rules
│── .prettierignore     # Prettier formatting ignore
│── .prettierrc         # Prettier config
│── components.json     # UI component config
│── eslint.config.mjs   # ESLint config
│── next-env.d.ts       # Next.js TypeScript types
│── next.config.ts      # Next.js configuration
│── package.json        # Dependencies
│── package-lock.json   # Lockfile (npm)
│── postcss.config.mjs  # Tailwind/PostCSS config
│── README.md           # Documentation
│── tsconfig.json       # TypeScript configuration
│── yarn.lock           # Lockfile (yarn)
```

---

## ⚙️ Installation

### 1. Clone repository

```bash
git clone https://github.com/vipunsanjana/Rust-Anchor-Blockchain-Solana-Voting-Dapp.git
cd Rust-Anchor-Blockchain-Solana-Voting-Dapp
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Setup Solana CLI & Anchor

```bash
solana --version
anchor --version
```

If not installed, follow [Solana CLI Docs](https://docs.solana.com/cli/install-solana-cli-tools) and [Anchor Docs](https://book.anchor-lang.com).

### 4. Start local validator (optional)

```bash
solana-test-validator
```

### 5. Deploy program to Devnet

```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

## 🔑 Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=YourProgramPublicKeyHere
```

---

## 🚀 Usage

### Run frontend

```bash
npm run dev
```

App runs at **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 🗳️ How Voting Works

1. Connect wallet (Phantom/Solana wallet)
2. Select an option and cast vote
3. Votes recorded on-chain in Solana program
4. Tally updates in real time

---

## 🛠️ Tech Stack

* [Rust](https://www.rust-lang.org/) 🦀
* [Next.js](https://nextjs.org/) ⚛️
* [Tailwind CSS](https://tailwindcss.com/) 🎨
* [Solana](https://solana.com/) 🌍
* [Anchor](https://www.anchor-lang.com/) ⚓
* [@solana/web3.js](https://www.npmjs.com/package/@solana/web3.js) 💳

---

## 👨‍💻 Author

**Vipun Sanjana Software Engineer | AI & ML | Fullstack DevOps**

---
