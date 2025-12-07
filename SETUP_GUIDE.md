# KIROBOT Trading Signals - Complete Setup Guide

## 🚀 Overview

This system provides **enhanced sensitivity trading signals** with a **professional mobile app** that sends **push notifications** based on multi-timeframe analysis across **18 strategies**.

### Key Features:
- ✅ **Increased Sensitivity**: All strategy thresholds optimized for earlier signal detection
- ✅ **Multi-Timeframe Analysis**: Tracks 15m, 1h, 4h, and 1d simultaneously
- ✅ **Smart Notifications**: Alerts when 3+ timeframes agree on direction
- ✅ **18 Advanced Strategies**: Volume, Delta, VWAP, FVG, Order Blocks, etc.
- ✅ **Real-Time Updates**: WebSocket support for instant signal propagation

---

## 📊 Enhanced Sensitivity Changes

### Strategy Thresholds (More Aggressive):

| Strategy | Old Threshold | New Threshold | Change |
|----------|--------------|---------------|---------|
| RSI (15m) | 20/80 | **28/72** | More sensitive |
| Volume Multiplier | 2.0x | **1.4x** | Lower trigger |
| POC Deviation | ±1% | **±2.5%** | Wider range |
| VWAP Deviation | ±1% | **±2.5%** | Wider range |
| Near HVN | 2% | **3.5%** | More sensitive |
| OB Imbalance | >20% | **>12%** | Lower trigger |
| Gap Detection | >3% | **>1.5%** | Earlier detection |
| Price Reversal | >2% | **>1%** | More sensitive |
| MSS Break | >5% | **>2.5%** | Faster response |

---

## 🛠️ Installation & Setup

### Part 1: Web Application (Already Running)

The web app (`index.html` + `app.js`) is **already configured** with enhanced sensitivity.

**Changes Made:**
- ✅ All 18 strategies have more aggressive thresholds
- ✅ Multi-timeframe signal tracking enabled
- ✅ Backend API integration added
- ✅ Signal consensus detection implemented

**No action needed** - the web app will work immediately!

---

### Part 2: Backend Server Setup

The backend server connects your web app to the mobile app.

#### Installation:

```bash
# Navigate to backend server directory
cd "C:\Users\Front Man\Desktop\KIROBOT advance order book\backend-server"

# Install dependencies
npm install

# Start the server
npm start
```

**Expected Output:**
```
🚀 KIROBOT Signal Server running on port 3000
📊 API Endpoints:
   GET  http://localhost:3000/api/signals
   POST http://localhost:3000/api/signals/update
   GET  http://localhost:3000/api/signals/history
   GET  http://localhost:3000/api/signals/consensus
   GET  http://localhost:3000/api/health
🔌 WebSocket: ws://localhost:3000
```

---

### Part 3: Mobile App Setup

#### Prerequisites:
1. Install **Node.js** (v16 or higher)
2. Install **Expo CLI**: `npm install -g expo-cli`
3. Install **Expo Go** app on your phone (iOS/Android)

#### Installation:

```bash
# Navigate to mobile app directory
cd "C:\Users\Front Man\Desktop\KIROBOT advance order book\mobile-app"

# Install dependencies
npm install

# Start the app
npm start
```

#### Running on Your Phone:

1. **Open Expo Go** app on your phone
2. **Scan the QR code** shown in terminal/browser
3. The app will load and start receiving notifications!

#### Running on Simulator:

**Android:**
```bash
npm run android
```

**iOS (Mac only):**
```bash
npm run ios
```

---

## 📱 Mobile App Features

### Main Dashboard:
- **Current Symbol & Timeframe** display
- **4 Timeframe Cards** (15m, 1h, 4h, 1d) showing:
  - Dominant signal (BUY/SELL/NEUTRAL)
  - Buy/Sell/Neutral count
  - Visual progress bar
- **Multi-Timeframe Consensus** card
- **Latest Signal** notification display
- **18 Strategy List** breakdown

### Notification Types:

#### 1. Multi-Timeframe Consensus
**Triggers when 3+ timeframes agree:**
```
🚀 STRONG BUY SIGNAL
3 timeframes showing bullish trend! Market is upward.
```

```
📉 STRONG SELL SIGNAL
3 timeframes showing bearish trend! Market is downward.
```

#### 2. Single Timeframe Strong Signal
**Triggers when 12+ strategies agree on one timeframe:**
```
📊 [15m] STRONG BUY
14/18 strategies indicating BUY
```

#### 3. Comparison Notifications
**Example scenarios:**

**Scenario A - Strong Buy:**
- 15m: 14 BUY, 2 SELL, 2 NEUTRAL
- 1h: 13 BUY, 3 SELL, 2 NEUTRAL
- 4h: 12 BUY, 4 SELL, 2 NEUTRAL
- 1d: 11 BUY, 5 SELL, 2 NEUTRAL

**Result:** "🚀 STRONG BUY SIGNAL - 4 timeframes bullish, market is upward"

**Scenario B - Mixed Signal:**
- 15m: 8 BUY, 7 SELL, 3 NEUTRAL
- 1h: 9 SELL, 7 BUY, 2 NEUTRAL
- 4h: 10 BUY, 6 SELL, 2 NEUTRAL
- 1d: 11 SELL, 5 BUY, 2 NEUTRAL

**Result:** "⚪ MIXED SIGNALS - No clear multi-timeframe consensus"

---

## 🔧 Configuration

### Adjusting Notification Sensitivity:

Edit `app.js` line 2018-2024 to change notification thresholds:

```javascript
// Current: Triggers at 12/18 strategies
if (current.buy >= 12) {
    // Send notification
}

// Make more sensitive (10/18):
if (current.buy >= 10) {
    // Send notification
}

// Make less sensitive (14/18):
if (current.buy >= 14) {
    // Send notification
}
```

### Changing Multi-Timeframe Requirement:

Edit `app.js` line 2008-2014:

```javascript
// Current: Requires 3+ timeframes
if (bullishTFs >= 3) {
    // Send notification
}

// Require all 4 timeframes:
if (bullishTFs >= 4) {
    // Send notification
}
```

---

## 📡 API Endpoints

### Get Current Signals:
```bash
curl http://localhost:3000/api/signals
```

**Response:**
```json
{
  "currentTimeframe": "15m",
  "symbol": "BTCUSDT",
  "signals": {
    "15m": { "buy": 14, "sell": 2, "neutral": 2, "total": 18 },
    "1h": { "buy": 12, "sell": 4, "neutral": 2, "total": 18 },
    "4h": { "buy": 13, "sell": 3, "neutral": 2, "total": 18 },
    "1d": { "buy": 11, "sell": 5, "neutral": 2, "total": 18 }
  },
  "latestSignal": {
    "title": "STRONG BUY",
    "message": "3 timeframes bullish",
    "type": "buy"
  }
}
```

### Get Multi-Timeframe Consensus:
```bash
curl http://localhost:3000/api/signals/consensus
```

**Response:**
```json
{
  "consensus": "BULLISH",
  "message": "4/4 timeframes showing upward trend",
  "bullishTimeframes": 4,
  "bearishTimeframes": 0
}
```

---

## 🧪 Testing the System

### Test 1: Web App Signals
1. Open `index.html` in browser
2. Open browser console (F12)
3. Look for logs like:
   ```
   [15m] Buy: 14, Sell: 2, Neutral: 2
   🚀 STRONG BUY SIGNAL: 3+ timeframes showing bullish consensus!
   ✅ Signal sent to backend server
   ```

### Test 2: Backend Server
```bash
# Check server health
curl http://localhost:3000/api/health

# Should return:
# {"status":"ok","timestamp":"2024-...","uptime":123.45}
```

### Test 3: Mobile App Notifications
1. Launch mobile app
2. Wait 10 seconds for data fetch
3. Pull down to refresh
4. Check for notifications when signals trigger

---

## 🎯 Strategy List (All 18)

1. **Volume Cluster Analysis** - Identifies high-volume price zones
2. **Cumulative Delta** - Tracks buy vs sell pressure
3. **VWAP + Order Flow** - Price position relative to volume-weighted average
4. **Liquidity Hunter** - Detects large order walls and liquidity zones
5. **Volume Profile POC** - Point of Control from volume distribution
6. **Delta Divergence** - Price vs delta divergence detection
7. **Absorption & Exhaustion** - High volume with low movement
8. **Iceberg Order Detection** - Hidden large orders
9. **Open Interest + Delta** - Futures market positioning
10. **Volume Pressure Zones** - Breakout probability areas
11. **Smart Money Flow** - Institutional accumulation/distribution
12. **Break of Structure (BOS)** - Key level breakouts
13. **Fair Value Gap (FVG)** - Price inefficiency zones
14. **Change of Character (CHoCH)** - Trend reversal signals
15. **Market Structure Shift (MSS)** - Major trend changes
16. **Order Blocks (OB)** - Institutional order zones
17. **Liquidity Sweep** - Stop hunt detection
18. **Inducement & Mitigation** - Smart money trap levels

---

## 🚨 Troubleshooting

### Mobile App Not Receiving Notifications:

**Issue:** No notifications appearing

**Solutions:**
1. Check notification permissions: Settings > App > Notifications
2. Ensure backend server is running: `http://localhost:3000/api/health`
3. Check mobile app console for errors
4. Verify network connection

### Backend Server Connection Failed:

**Issue:** "Backend server not available" in console

**Solutions:**
1. Start backend server: `cd backend-server && npm start`
2. Check port 3000 is not in use
3. Update API URL in `app.js` if using different host/port

### Expo App Not Loading:

**Issue:** QR code scan fails

**Solutions:**
1. Ensure phone and computer on same WiFi network
2. Try tunnel mode: `expo start --tunnel`
3. Check firewall settings
4. Try web version: `npm run web`

---

## 📈 Performance Optimization

### Reduce API Calls:
```javascript
// In app.js, change update interval (line 90):
setInterval(analyzeAllStrategies, 5000);  // Current: 5 seconds
setInterval(analyzeAllStrategies, 10000); // Less frequent: 10 seconds
```

### Limit Notification Frequency:
```javascript
// Add notification cooldown in sendNotificationData():
let lastNotificationTime = 0;
const COOLDOWN = 30000; // 30 seconds

if (Date.now() - lastNotificationTime < COOLDOWN) return;
lastNotificationTime = Date.now();
```

---

## 🔐 Production Deployment

### Web App:
- Host on **Vercel**, **Netlify**, or **GitHub Pages**
- Update API URL to production backend

### Backend Server:
- Deploy to **Heroku**, **Railway**, or **DigitalOcean**
- Use environment variables for configuration
- Enable HTTPS

### Mobile App:
- Build with Expo: `expo build:android` / `expo build:ios`
- Submit to **Google Play Store** / **Apple App Store**
- Configure push notification credentials

---

## 📞 Support

For issues or questions:
1. Check console logs for errors
2. Verify all services are running
3. Review this guide's troubleshooting section
4. Test with mock data first

---

## ✨ Summary

**Your enhanced trading system is now ready!**

✅ **Web App**: More sensitive signals (28/72 RSI, 1.4x volume, etc.)  
✅ **Backend**: Real-time signal distribution via API/WebSocket  
✅ **Mobile App**: Professional UI with push notifications  
✅ **Multi-Timeframe**: Tracks 4 timeframes simultaneously  
✅ **18 Strategies**: All analyzed with increased sensitivity  

**Start all three components and begin receiving intelligent trading notifications!**
