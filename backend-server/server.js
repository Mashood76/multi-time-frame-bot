const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Enable CORS for mobile app
app.use(cors());
app.use(express.json());

// Store latest signal data in memory
let latestSignalData = {
    currentTimeframe: '15m',
    symbol: 'BTCUSDT',
    signals: {
        '15m': { buy: 0, sell: 0, neutral: 0, total: 18 },
        '1h': { buy: 0, sell: 0, neutral: 0, total: 18 },
        '4h': { buy: 0, sell: 0, neutral: 0, total: 18 },
        '1d': { buy: 0, sell: 0, neutral: 0, total: 18 }
    },
    latestSignal: null,
    history: []
};

// API endpoint to get current signals
app.get('/api/signals', (req, res) => {
    res.json(latestSignalData);
});

// API endpoint to update signals (called by web app)
app.post('/api/signals/update', (req, res) => {
    const { timeframe, signals, latestSignal } = req.body;
    
    if (timeframe && signals) {
        latestSignalData.currentTimeframe = timeframe;
        latestSignalData.signals[timeframe] = signals;
    }
    
    if (latestSignal) {
        latestSignalData.latestSignal = latestSignal;
        latestSignalData.history.unshift(latestSignal);
        if (latestSignalData.history.length > 50) {
            latestSignalData.history.pop();
        }
    }
    
    res.json({ success: true, data: latestSignalData });
});

// API endpoint to get signal history
app.get('/api/signals/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json({
        history: latestSignalData.history.slice(0, limit)
    });
});

// API endpoint to get multi-timeframe consensus
app.get('/api/signals/consensus', (req, res) => {
    const timeframes = ['15m', '1h', '4h', '1d'];
    let bullishCount = 0;
    let bearishCount = 0;
    
    timeframes.forEach(tf => {
        const sig = latestSignalData.signals[tf];
        if (sig.buy > sig.sell) bullishCount++;
        else if (sig.sell > sig.buy) bearishCount++;
    });
    
    let consensus = 'NEUTRAL';
    let message = 'Mixed signals across timeframes';
    
    if (bullishCount >= 3) {
        consensus = 'BULLISH';
        message = `${bullishCount}/4 timeframes showing upward trend`;
    } else if (bearishCount >= 3) {
        consensus = 'BEARISH';
        message = `${bearishCount}/4 timeframes showing downward trend`;
    }
    
    res.json({
        consensus,
        message,
        bullishTimeframes: bullishCount,
        bearishTimeframes: bearishCount,
        details: latestSignalData.signals
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// WebSocket support for real-time updates (optional enhancement)
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current data on connection
    socket.emit('signalData', latestSignalData);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Broadcast signal updates to all connected clients
function broadcastSignalUpdate(data) {
    io.emit('signalUpdate', data);
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 KIROBOT Signal Server running on port ${PORT}`);
    console.log(`📊 API Endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/signals`);
    console.log(`   POST http://localhost:${PORT}/api/signals/update`);
    console.log(`   GET  http://localhost:${PORT}/api/signals/history`);
    console.log(`   GET  http://localhost:${PORT}/api/signals/consensus`);
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
});

module.exports = { app, broadcastSignalUpdate };
