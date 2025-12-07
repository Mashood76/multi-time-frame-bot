# Mobile App Setup - Windows Fix

## ⚠️ The Issue

Windows PATH conflicts with Git are preventing npm scripts from running properly.

## ✅ Solution - Install Expo CLI Globally

### Step 1: Install Expo CLI

```bash
npm install -g expo-cli
```

Wait for this to complete (may take a few minutes).

### Step 2: Start the Mobile App

```bash
cd "C:\Users\Front Man\Desktop\KIROBOT advance order book\mobile-app"
expo start
```

OR use the batch file I created:

```bash
# Just double-click this file:
start-mobile-app.bat
```

## 📱 Alternative: Use Expo Go without CLI

If the above doesn't work, you can use **Expo Snack** (online):

1. Go to https://snack.expo.dev
2. Copy the contents of `App.js` into the editor
3. Copy the contents of `app.json` into the config
4. Scan the QR code with Expo Go app

## 🖥️ Or Run Web Version

The easiest option - run in browser:

```bash
expo start --web
```

This opens the mobile app in your browser (no phone needed for testing).

## 🚀 Simplest Solution: Just Use Web App

Since the mobile app is having setup issues, you can still get notifications by:

1. Open `index.html` in browser
2. Allow browser notifications
3. Backend server sends signals to browser notifications

The web app has all the same features!
