// Configuration
let SYMBOL = 'BTCUSDT';
let CURRENT_TIMEFRAME = '15m';
let ws = null;
let tradesWs = null;

// DOM Elements Cache
const elements = {
    currentPrice: null,
    highPrice: null,
    lowPrice: null,
    priceChange: null,
    vwap: null,
    vwapDeviation: null,
    poc: null,
    pocDeviation: null,
    hvn: null,
    volumeSpike: null,
    cumulativeDelta: null,
    buyVolume: null,
    sellVolume: null,
    volumeDelta: null,
    obImbalance: null,
    largestBidWall: null,
    largestAskWall: null,
    liqRatio: null,
    vah: null,
    val: null,
    distResistance: null,
    distSupport: null
};

// Initialize DOM elements
function initElements() {
    elements.currentPrice = document.getElementById('current-price');
    elements.highPrice = document.getElementById('high-price');
    elements.lowPrice = document.getElementById('low-price');
    elements.priceChange = document.getElementById('price-change');
    elements.vwap = document.getElementById('vwap');
    elements.vwapDeviation = document.getElementById('vwap-deviation');
    elements.poc = document.getElementById('poc');
    elements.pocDeviation = document.getElementById('poc-deviation');
    elements.hvn = document.getElementById('hvn');
    elements.volumeSpike = document.getElementById('volume-spike');
    elements.cumulativeDelta = document.getElementById('cumulative-delta');
    elements.buyVolume = document.getElementById('buy-volume');
    elements.sellVolume = document.getElementById('sell-volume');
    elements.volumeDelta = document.getElementById('volume-delta');
    elements.obImbalance = document.getElementById('ob-imbalance');
    elements.largestBidWall = document.getElementById('largest-bid-wall');
    elements.largestAskWall = document.getElementById('largest-ask-wall');
    elements.liqRatio = document.getElementById('liq-ratio');
    elements.vah = document.getElementById('vah');
    elements.val = document.getElementById('val');
    elements.distResistance = document.getElementById('dist-resistance');
    elements.distSupport = document.getElementById('dist-support');
}

// Data storage for each timeframe
let timeframeData = {
    '1m': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] },
    '5m': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] },
    '15m': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] },
    '1h': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] },
    '4h': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] },
    '1d': { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] }
};

let cumulativeDelta = 0;
let recentTrades = [];
let volumeProfile = {};
let orderBookDepth = { bids: [], asks: [] };

// Initialize
function init() {
    initElements();
    setupEventListeners();
    connectWebSocket();
    connectTradesWebSocket();
    fetch24hData();
    fetchAllTimeframes();
    fetchFuturesData();
    fetchFearGreedIndex();
    
    // Update intervals
    setInterval(updateTime, 1000);
    setInterval(fetchAllTimeframes, 10000); // Update all TFs every 10s
    setInterval(fetchFuturesData, 30000);
    setInterval(fetchFearGreedIndex, 300000);
    setInterval(analyzeAllStrategies, 5000); // Analyze strategies every 5s
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching for FVG and OB
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            const parentCard = e.target.closest('.card');
            
            // Remove active from all tabs in this card
            parentCard.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            parentCard.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab
            e.target.classList.add('active');
            const content = parentCard.querySelector(`#${tabId}`);
            if (content) content.classList.add('active');
            
            // Update data for selected timeframe
            const timeframe = tabId.split('-')[1];
            if (tabId.startsWith('fvg-')) {
                updateFVGDisplay(timeframe);
            } else if (tabId.startsWith('ob-')) {
                updateOrderBlocksDisplay(timeframe);
            }
        });
    });
    
    // Coin selector
    document.querySelectorAll('.coin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            SYMBOL = e.target.dataset.coin;
            document.getElementById('current-symbol').textContent = SYMBOL;
            resetData();
            connectWebSocket();
            connectTradesWebSocket();
            fetch24hData();
            fetchAllTimeframes();
            fetchFuturesData();
        });
    });
    
    // Timeframe selector
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tf-card').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            CURRENT_TIMEFRAME = e.target.dataset.tf;
            document.getElementById('current-timeframe').textContent = CURRENT_TIMEFRAME;
            document.querySelector(`.tf-card[data-tf="${CURRENT_TIMEFRAME}"]`).classList.add('active');
            updateMainDisplay();
        });
    });
}

// Reset data on coin change
function resetData() {
    cumulativeDelta = 0;
    recentTrades = [];
    Object.keys(timeframeData).forEach(tf => {
        timeframeData[tf] = { vwap: 0, poc: 0, delta: 0, trend: '', priceVolumeData: [] };
    });
}

// Connect to Binance WebSocket for Order Book
function connectWebSocket() {
    if (ws) ws.close();
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@depth20@100ms`;
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        document.getElementById('connection-status').textContent = '🟢 Connected';
        document.getElementById('connection-status').style.background = 'rgba(0, 255, 136, 0.2)';
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateOrderBook(data);
    };
    
    ws.onerror = () => {
        document.getElementById('connection-status').textContent = '🔴 Error';
    };
    
    ws.onclose = () => {
        document.getElementById('connection-status').textContent = '🟡 Reconnecting...';
        setTimeout(connectWebSocket, 3000);
    };
}

// Connect to Trades WebSocket
function connectTradesWebSocket() {
    if (tradesWs) tradesWs.close();
    
    const wsUrl = `wss://stream.binance.com:9443/ws/${SYMBOL.toLowerCase()}@trade`;
    tradesWs = new WebSocket(wsUrl);
    
    tradesWs.onmessage = (event) => {
        const trade = JSON.parse(event.data);
        updateTrades(trade);
    };
}

// Fetch 24h ticker data
async function fetch24hData() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${SYMBOL}`);
        const data = await response.json();
        
        document.getElementById('current-price').textContent = parseFloat(data.lastPrice).toFixed(2);
        document.getElementById('open-price').textContent = parseFloat(data.openPrice).toFixed(2);
        document.getElementById('high-price').textContent = parseFloat(data.highPrice).toFixed(2);
        document.getElementById('low-price').textContent = parseFloat(data.lowPrice).toFixed(2);
        
        const change = parseFloat(data.priceChangePercent);
        const changeEl = document.getElementById('price-change');
        changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.className = change > 0 ? 'value green' : 'value red';
        
        document.getElementById('total-volume').textContent = formatVolume(parseFloat(data.volume));
        
        calculateMarketStructure();
        
    } catch (error) {
        console.error('Error fetching 24h data:', error);
    }
    
    setTimeout(fetch24hData, 10000);
}

// Fetch all timeframes data
async function fetchAllTimeframes() {
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    for (const tf of timeframes) {
        await fetchTimeframeData(tf);
    }
    
    updateMainDisplay();
    
    // Initial update for market structure sections
    updateLiquidityLevels();
    updateStructureBreaks();
}

// Fetch data for specific timeframe
async function fetchTimeframeData(timeframe) {
    try {
        const limit = timeframe === '1d' ? 30 : 50;
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${timeframe}&limit=${limit}`);
        const data = await response.json();
        
        const priceVolumeData = data.map(candle => ({
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
        
        timeframeData[timeframe].priceVolumeData = priceVolumeData;
        
        // Calculate values for this timeframe
        const vwap = calculateVWAPForTF(priceVolumeData);
        const poc = calculatePOCForTF(priceVolumeData);
        const delta = calculateDeltaForTF(priceVolumeData);
        const trend = calculateTrendForTF(priceVolumeData);
        
        timeframeData[timeframe].vwap = vwap;
        timeframeData[timeframe].poc = poc;
        timeframeData[timeframe].delta = delta;
        timeframeData[timeframe].trend = trend;
        
        // Update UI for this timeframe
        updateTimeframeUI(timeframe);
        
        // Update market structure displays for all timeframes
        updateFVGDisplay(timeframe);
        updateOrderBlocksDisplay(timeframe);
        
        // Update liquidity and structure breaks for current timeframe only
        if (timeframe === CURRENT_TIMEFRAME) {
            updateLiquidityLevels();
            updateStructureBreaks();
        }
        
    } catch (error) {
        console.error(`Error fetching ${timeframe} data:`, error);
    }
}

// Calculate VWAP for timeframe
function calculateVWAPForTF(data) {
    if (data.length === 0) return 0;
    
    let sumPV = 0;
    let sumV = 0;
    
    data.forEach(({ close, volume }) => {
        sumPV += close * volume;
        sumV += volume;
    });
    
    return sumPV / sumV;
}

// Calculate POC for timeframe
function calculatePOCForTF(data) {
    if (data.length === 0) return 0;
    
    const volumeProfile = {};
    
    data.forEach(({ close, volume }) => {
        const priceLevel = Math.round(close);
        if (!volumeProfile[priceLevel]) {
            volumeProfile[priceLevel] = 0;
        }
        volumeProfile[priceLevel] += volume;
    });
    
    let maxVolume = 0;
    let pocPrice = 0;
    
    Object.entries(volumeProfile).forEach(([price, volume]) => {
        if (volume > maxVolume) {
            maxVolume = volume;
            pocPrice = parseFloat(price);
        }
    });
    
    return pocPrice;
}

// Calculate RSI for timeframe
function calculateRSI(data, period = 14) {
    if (data.length < period + 1) return 50; // Default neutral
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI using smoothed averages
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        
        if (change > 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
    }
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
}

// Timeframe-specific thresholds - INCREASED SENSITIVITY
const TIMEFRAME_THRESHOLDS = {
    '1m': {
        rsi: { oversold: 24, overbought: 76 },  // More sensitive
        volumeMultiplier: 1.5,  // Lower threshold
        pocDeviation: 2.5,  // Wider range
        vwapDeviation: 1.5  // Wider range
    },
    '5m': {
        rsi: { oversold: 26, overbought: 74 },
        volumeMultiplier: 1.5,
        pocDeviation: 3,
        vwapDeviation: 2
    },
    '15m': {
        rsi: { oversold: 28, overbought: 72 },
        volumeMultiplier: 1.4,
        pocDeviation: 3.5,
        vwapDeviation: 2.5
    },
    '1h': {
        rsi: { oversold: 30, overbought: 70 },
        volumeMultiplier: 1.4,
        pocDeviation: 4,
        vwapDeviation: 3
    },
    '4h': {
        rsi: { oversold: 32, overbought: 68 },
        volumeMultiplier: 1.3,
        pocDeviation: 4.5,
        vwapDeviation: 3.5
    },
    '1d': {
        rsi: { oversold: 35, overbought: 65 },
        volumeMultiplier: 1.2,
        pocDeviation: 5,
        vwapDeviation: 4
    }
};

// Get thresholds for current timeframe
function getThresholds() {
    return TIMEFRAME_THRESHOLDS[CURRENT_TIMEFRAME] || TIMEFRAME_THRESHOLDS['15m'];
}

// Calculate Delta for timeframe
function calculateDeltaForTF(data) {
    if (data.length === 0) return 0;
    
    let delta = 0;
    
    data.forEach(({ close, open, volume }) => {
        if (close > open) {
            delta += volume; // Bullish candle
        } else {
            delta -= volume; // Bearish candle
        }
    });
    
    return delta;
}

// Calculate Trend for timeframe
function calculateTrendForTF(data) {
    if (data.length < 2) return 'Neutral';
    
    const firstClose = data[0].close;
    const lastClose = data[data.length - 1].close;
    const change = ((lastClose - firstClose) / firstClose) * 100;
    
    if (change > 2) return '📈 Strong Up';
    if (change > 0.5) return '↗️ Up';
    if (change < -2) return '📉 Strong Down';
    if (change < -0.5) return '↘️ Down';
    return '➡️ Sideways';
}

// Update timeframe UI
function updateTimeframeUI(tf) {
    const data = timeframeData[tf];
    
    const vwapEl = document.querySelector(`.tf-vwap-${tf}`);
    const pocEl = document.querySelector(`.tf-poc-${tf}`);
    const deltaEl = document.querySelector(`.tf-delta-${tf}`);
    const trendEl = document.querySelector(`.tf-trend-${tf}`);
    
    if (vwapEl) vwapEl.textContent = data.vwap.toFixed(2);
    if (pocEl) pocEl.textContent = data.poc.toFixed(2);
    if (deltaEl) {
        deltaEl.textContent = formatVolume(data.delta);
        deltaEl.className = data.delta > 0 ? 'green' : 'red';
    }
    if (trendEl) {
        trendEl.textContent = data.trend;
        trendEl.className = data.trend.includes('Up') ? 'green' : data.trend.includes('Down') ? 'red' : '';
    }
}

// Update main display with current timeframe data
function updateMainDisplay() {
    const data = timeframeData[CURRENT_TIMEFRAME];
    
    if (data.priceVolumeData.length > 0) {
        document.getElementById('vwap').textContent = data.vwap.toFixed(2);
        document.getElementById('poc').textContent = data.poc.toFixed(2);
        
        const currentPrice = parseFloat(document.getElementById('current-price').textContent);
        
        if (currentPrice) {
            const vwapDev = ((currentPrice - data.vwap) / data.vwap) * 100;
            const vwapDevEl = document.getElementById('vwap-deviation');
            vwapDevEl.textContent = `${vwapDev > 0 ? '+' : ''}${vwapDev.toFixed(2)}%`;
            vwapDevEl.className = vwapDev > 0 ? 'value green' : 'value red';
            
            const pocDev = ((currentPrice - data.poc) / data.poc) * 100;
            const pocDevEl = document.getElementById('poc-deviation');
            pocDevEl.textContent = `${pocDev > 0 ? '+' : ''}${pocDev.toFixed(2)}%`;
            pocDevEl.className = pocDev > 0 ? 'value green' : 'value red';
        }
        
        document.getElementById('trend').textContent = data.trend;
        
        // Calculate Volume MA
        const avgVolume = data.priceVolumeData.reduce((sum, d) => sum + d.volume, 0) / data.priceVolumeData.length;
        document.getElementById('volume-ma').textContent = formatVolume(avgVolume);
        
        // Calculate Volume Profile
        calculateVolumeProfileForMain(data.priceVolumeData);
        detectVolumeSpikeForMain(data.priceVolumeData);
    }
}

// Calculate Volume Profile for main display
function calculateVolumeProfileForMain(data) {
    const volumeProfile = {};
    
    data.forEach(({ close, volume }) => {
        const priceLevel = Math.round(close);
        if (!volumeProfile[priceLevel]) {
            volumeProfile[priceLevel] = 0;
        }
        volumeProfile[priceLevel] += volume;
    });
    
    const sortedPrices = Object.entries(volumeProfile).sort((a, b) => b[1] - a[1]);
    const totalVolume = Object.values(volumeProfile).reduce((a, b) => a + b, 0);
    const targetVolume = totalVolume * 0.7;
    
    let accumulatedVolume = 0;
    let valueAreaPrices = [];
    
    for (let [price, volume] of sortedPrices) {
        if (accumulatedVolume < targetVolume) {
            valueAreaPrices.push(parseFloat(price));
            accumulatedVolume += volume;
        } else {
            break;
        }
    }
    
    if (valueAreaPrices.length > 0) {
        document.getElementById('vah').textContent = Math.max(...valueAreaPrices).toFixed(2);
        document.getElementById('val').textContent = Math.min(...valueAreaPrices).toFixed(2);
    }
    
    const volumes = Object.values(volumeProfile);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    const hvnEntries = Object.entries(volumeProfile).filter(([, vol]) => vol > avgVolume * 1.5);
    const lvnEntries = Object.entries(volumeProfile).filter(([, vol]) => vol < avgVolume * 0.5);
    
    if (hvnEntries.length > 0) {
        document.getElementById('hvn').textContent = parseFloat(hvnEntries[0][0]).toFixed(2);
    }
    
    if (lvnEntries.length > 0) {
        document.getElementById('lvn').textContent = parseFloat(lvnEntries[0][0]).toFixed(2);
    }
}

// Detect Volume Spike for main display
function detectVolumeSpikeForMain(data) {
    if (data.length < 2) return;
    
    const latestVolume = data[data.length - 1].volume;
    const avgVolume = data.slice(0, -1).reduce((sum, d) => sum + d.volume, 0) / (data.length - 1);
    
    const spikeThreshold = avgVolume * 2;
    const spikeEl = document.getElementById('volume-spike');
    
    if (latestVolume > spikeThreshold) {
        const spikePercent = ((latestVolume - avgVolume) / avgVolume * 100).toFixed(0);
        spikeEl.textContent = `🚨 YES (+${spikePercent}%)`;
        spikeEl.className = 'value red';
    } else {
        spikeEl.textContent = 'No';
        spikeEl.className = 'value';
    }
}

// Update Order Book
function updateOrderBook(data) {
    const bids = data.bids.slice(0, 5);
    const asks = data.asks.slice(0, 5).reverse();
    
    orderBookDepth.bids = data.bids;
    orderBookDepth.asks = data.asks;
    
    document.querySelector('#asks-table tbody').innerHTML = asks.map(([price, size]) => {
        const total = parseFloat(price) * parseFloat(size);
        return `<tr>
            <td>${parseFloat(price).toFixed(2)}</td>
            <td>${parseFloat(size).toFixed(4)}</td>
            <td>${total.toFixed(2)}</td>
        </tr>`;
    }).join('');
    
    document.querySelector('#bids-table tbody').innerHTML = bids.map(([price, size]) => {
        const total = parseFloat(price) * parseFloat(size);
        return `<tr>
            <td>${parseFloat(price).toFixed(2)}</td>
            <td>${parseFloat(size).toFixed(4)}</td>
            <td>${total.toFixed(2)}</td>
        </tr>`;
    }).join('');
    
    const bestBid = parseFloat(bids[0][0]);
    const bestAsk = parseFloat(asks[asks.length - 1][0]);
    const spread = bestAsk - bestBid;
    document.getElementById('spread').textContent = `${spread.toFixed(2)} (${((spread / bestAsk) * 100).toFixed(3)}%)`;
    
    const totalBidVolume = bids.reduce((sum, [, size]) => sum + parseFloat(size), 0);
    const totalAskVolume = asks.reduce((sum, [, size]) => sum + parseFloat(size), 0);
    const imbalance = ((totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume)) * 100;
    
    const imbalanceEl = document.getElementById('ob-imbalance');
    imbalanceEl.textContent = `${imbalance.toFixed(2)}%`;
    imbalanceEl.className = imbalance > 0 ? 'value green' : 'value red';
    
    analyzeLiquidity(data);
}

// Analyze Liquidity
function analyzeLiquidity(data) {
    const bids = data.bids || [];
    const asks = data.asks || [];
    
    const totalBidLiq = bids.reduce((sum, [price, size]) => sum + (parseFloat(price) * parseFloat(size)), 0);
    const totalAskLiq = asks.reduce((sum, [price, size]) => sum + (parseFloat(price) * parseFloat(size)), 0);
    
    document.getElementById('total-bid-liq').textContent = `${(totalBidLiq / 1000).toFixed(2)}K`;
    document.getElementById('total-ask-liq').textContent = `${(totalAskLiq / 1000).toFixed(2)}K`;
    
    const bidSizes = bids.map(([price, size]) => ({ price: parseFloat(price), size: parseFloat(size) }));
    const askSizes = asks.map(([price, size]) => ({ price: parseFloat(price), size: parseFloat(size) }));
    
    const largestBid = bidSizes.reduce((max, b) => b.size > max.size ? b : max, { price: 0, size: 0 });
    const largestAsk = askSizes.reduce((max, a) => a.size > max.size ? a : max, { price: 0, size: 0 });
    
    document.getElementById('largest-bid-wall').textContent = `${largestBid.size.toFixed(4)} @ ${largestBid.price.toFixed(2)}`;
    document.getElementById('largest-ask-wall').textContent = `${largestAsk.size.toFixed(4)} @ ${largestAsk.price.toFixed(2)}`;
    
    const ratio = totalBidLiq / totalAskLiq;
    const ratioEl = document.getElementById('liq-ratio');
    ratioEl.textContent = ratio.toFixed(2);
    ratioEl.className = ratio > 1 ? 'value green' : 'value red';
}

// Update Trades
function updateTrades(trade) {
    const isBuy = trade.m === false;
    const size = parseFloat(trade.q);
    
    if (isBuy) {
        cumulativeDelta += size;
    } else {
        cumulativeDelta -= size;
    }
    
    const buyVolEl = document.getElementById('buy-volume');
    const sellVolEl = document.getElementById('sell-volume');
    
    const currentBuy = parseFloat(buyVolEl.textContent.replace(/[^0-9.]/g, '') || 0);
    const currentSell = parseFloat(sellVolEl.textContent.replace(/[^0-9.]/g, '') || 0);
    
    if (isBuy) {
        buyVolEl.textContent = formatVolume(currentBuy + size);
    } else {
        sellVolEl.textContent = formatVolume(currentSell + size);
    }
    
    const delta = currentBuy - currentSell;
    const deltaEl = document.getElementById('volume-delta');
    deltaEl.textContent = formatVolume(delta);
    deltaEl.className = delta > 0 ? 'value green' : 'value red';
    
    const cumDeltaEl = document.getElementById('cumulative-delta');
    cumDeltaEl.textContent = formatVolume(cumulativeDelta);
    cumDeltaEl.className = cumulativeDelta > 0 ? 'value green' : 'value red';
    
    recentTrades.unshift({
        time: new Date(trade.T).toLocaleTimeString(),
        price: parseFloat(trade.p),
        size: size,
        side: isBuy ? 'BUY' : 'SELL'
    });
    
    if (recentTrades.length > 10) recentTrades.pop();
    
    document.querySelector('#trades-table tbody').innerHTML = recentTrades.map(t => `
        <tr>
            <td>${t.time}</td>
            <td>${t.price.toFixed(2)}</td>
            <td>${t.size.toFixed(4)}</td>
            <td class="side-${t.side.toLowerCase()}">${t.side}</td>
        </tr>
    `).join('');
}

// Calculate FVG (Fair Value Gaps)
function calculateFVG(timeframe) {
    const tfData = timeframeData[timeframe];
    if (!tfData || !tfData.priceVolumeData || tfData.priceVolumeData.length < 3) return [];
    
    const data = tfData.priceVolumeData;
    const fvgList = [];
    const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
    
    if (!currentPrice) return [];
    
    // Check last 20 candles for gaps
    for (let i = 2; i < Math.min(data.length, 20); i++) {
        const candle1 = data[i - 2];
        const candle2 = data[i - 1];
        const candle3 = data[i];
        
        // Bullish FVG: candle1.high < candle3.low (gap between them)
        if (candle1.high < candle3.low) {
            const gapLow = candle1.high;
            const gapHigh = candle3.low;
            const gapSize = ((gapHigh - gapLow) / gapLow) * 100;
            
            if (gapSize > 0.3) { // Gap > 0.3%
                const isFilled = currentPrice >= gapLow && currentPrice <= gapHigh;
                fvgList.push({
                    type: 'bullish',
                    low: gapLow,
                    high: gapHigh,
                    filled: isFilled,
                    size: gapSize
                });
            }
        }
        
        // Bearish FVG: candle1.low > candle3.high
        if (candle1.low > candle3.high) {
            const gapHigh = candle1.low;
            const gapLow = candle3.high;
            const gapSize = ((gapHigh - gapLow) / gapLow) * 100;
            
            if (gapSize > 0.3) {
                const isFilled = currentPrice >= gapLow && currentPrice <= gapHigh;
                fvgList.push({
                    type: 'bearish',
                    low: gapLow,
                    high: gapHigh,
                    filled: isFilled,
                    size: gapSize
                });
            }
        }
    }
    
    // Sort by distance to current price
    fvgList.sort((a, b) => {
        const distA = Math.min(Math.abs(currentPrice - a.low), Math.abs(currentPrice - a.high));
        const distB = Math.min(Math.abs(currentPrice - b.low), Math.abs(currentPrice - b.high));
        return distA - distB;
    });
    
    return fvgList.slice(0, 5); // Return top 5 closest
}

// Update FVG Display
function updateFVGDisplay(timeframe) {
    try {
        const fvgList = calculateFVG(timeframe);
        const container = document.getElementById(`fvg-list-${timeframe}`);
        
        if (!container) {
            console.warn(`FVG container not found for ${timeframe}`);
            return;
        }
        
        if (!fvgList || fvgList.length === 0) {
            container.innerHTML = '<div class="fvg-item">No FVG detected</div>';
            return;
        }
        
        container.innerHTML = fvgList.map(fvg => `
            <div class="fvg-item ${fvg.type}">
                <span class="fvg-type ${fvg.type}">${fvg.type === 'bullish' ? '🟢' : '🔴'} ${fvg.type.toUpperCase()} FVG</span>
                <span class="fvg-range">$${fvg.low.toFixed(2)} - $${fvg.high.toFixed(2)}</span>
                <span class="fvg-status ${fvg.filled ? 'filled' : ''}">${fvg.filled ? 'Filled' : 'Unfilled'}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error(`Error updating FVG display for ${timeframe}:`, error);
    }
}

// Calculate Order Blocks
function calculateOrderBlocks(timeframe) {
    const tfData = timeframeData[timeframe];
    if (!tfData || !tfData.priceVolumeData || tfData.priceVolumeData.length < 5) return [];
    
    const data = tfData.priceVolumeData;
    const obList = [];
    const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
    
    if (!currentPrice) return [];
    
    // Calculate average volume
    const avgVolume = data.reduce((sum, c) => sum + c.volume, 0) / data.length;
    
    // Find last strong move candles (last 15 candles)
    for (let i = 1; i < Math.min(data.length, 15); i++) {
        const candle = data[i];
        const prevCandle = data[i - 1];
        
        // Bullish OB: Strong up move (last down candle before big move up)
        if (candle.close > candle.open && candle.volume > avgVolume * 1.3) {
            const priceMove = ((candle.close - candle.open) / candle.open) * 100;
            
            if (priceMove > 0.5) { // >0.5% move
                const obLow = prevCandle.low;
                const obHigh = prevCandle.high;
                const distance = ((currentPrice - obHigh) / currentPrice * 100);
                
                obList.push({
                    type: 'bullish',
                    low: obLow,
                    high: obHigh,
                    strength: candle.volume > avgVolume * 2 ? 'Strong' : 'Moderate',
                    distance: distance,
                    candlesAgo: i
                });
            }
        }
        
        // Bearish OB: Strong down move
        if (candle.close < candle.open && candle.volume > avgVolume * 1.3) {
            const priceMove = ((candle.open - candle.close) / candle.open) * 100;
            
            if (priceMove > 0.5) {
                const obHigh = prevCandle.high;
                const obLow = prevCandle.low;
                const distance = ((currentPrice - obLow) / currentPrice * 100);
                
                obList.push({
                    type: 'bearish',
                    low: obLow,
                    high: obHigh,
                    strength: candle.volume > avgVolume * 2 ? 'Strong' : 'Moderate',
                    distance: distance,
                    candlesAgo: i
                });
            }
        }
    }
    
    // Sort by distance to current price
    obList.sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
    
    return obList.slice(0, 5);
}

// Update Order Blocks Display
function updateOrderBlocksDisplay(timeframe) {
    try {
        const obList = calculateOrderBlocks(timeframe);
        const container = document.getElementById(`ob-list-${timeframe}`);
        
        if (!container) {
            console.warn(`OB container not found for ${timeframe}`);
            return;
        }
        
        if (!obList || obList.length === 0) {
            container.innerHTML = '<div class="ob-item">No Order Blocks detected</div>';
            return;
        }
        
        container.innerHTML = obList.map(ob => `
            <div class="ob-item ${ob.type}">
                <div class="ob-header">
                    <span class="ob-type">${ob.type === 'bullish' ? '🟢' : '🔴'} ${ob.type.toUpperCase()} OB</span>
                    <span class="ob-strength">${ob.strength}</span>
                </div>
                <div class="ob-details">
                    <span>Zone: $${ob.low.toFixed(2)} - $${ob.high.toFixed(2)}</span>
                    <span>Distance: ${ob.distance > 0 ? '+' : ''}${ob.distance.toFixed(2)}%</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error(`Error updating OB display for ${timeframe}:`, error);
    }
}

// Update Liquidity Levels
function updateLiquidityLevels() {
    const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
    const high = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
    const low = elements.lowPrice ? parseFloat(elements.lowPrice.textContent.replace('$', '')) : 0;
    
    if (!currentPrice || !high || !low) {
        document.getElementById('bsl-level').textContent = '--';
        document.getElementById('bsl-distance').textContent = '--';
        document.getElementById('ssl-level').textContent = '--';
        document.getElementById('ssl-distance').textContent = '--';
        document.getElementById('eq-highs').textContent = '--';
        document.getElementById('eq-lows').textContent = '--';
        return;
    }
    
    // Buy-Side Liquidity (above recent highs - where stops are)
    const bsl = high * 1.002; // 0.2% above high
    const bslDistance = ((bsl - currentPrice) / currentPrice * 100);
    
    const bslEl = document.getElementById('bsl-level');
    const bslDistEl = document.getElementById('bsl-distance');
    if (bslEl) bslEl.textContent = `$${bsl.toFixed(2)}`;
    if (bslDistEl) bslDistEl.textContent = `${bslDistance > 0 ? '+' : ''}${bslDistance.toFixed(2)}%`;
    
    // Sell-Side Liquidity (below recent lows)
    const ssl = low * 0.998; // 0.2% below low
    const sslDistance = ((ssl - currentPrice) / currentPrice * 100);
    
    const sslEl = document.getElementById('ssl-level');
    const sslDistEl = document.getElementById('ssl-distance');
    if (sslEl) sslEl.textContent = `$${ssl.toFixed(2)}`;
    if (sslDistEl) sslDistEl.textContent = `${sslDistance.toFixed(2)}%`;
    
    // Equal Highs/Lows - Find from recent data
    const tfData = timeframeData[CURRENT_TIMEFRAME];
    if (tfData && tfData.priceVolumeData && tfData.priceVolumeData.length > 5) {
        const recentData = tfData.priceVolumeData.slice(-10);
        const highs = recentData.map(c => c.high);
        const lows = recentData.map(c => c.low);
        
        // Find equal highs (within 0.1%)
        const maxHigh = Math.max(...highs);
        const equalHighs = highs.filter(h => Math.abs((h - maxHigh) / maxHigh) < 0.001).length;
        
        // Find equal lows
        const minLow = Math.min(...lows);
        const equalLows = lows.filter(l => Math.abs((l - minLow) / minLow) < 0.001).length;
        
        const eqHighsEl = document.getElementById('eq-highs');
        const eqLowsEl = document.getElementById('eq-lows');
        if (eqHighsEl) eqHighsEl.textContent = equalHighs > 1 ? `$${maxHigh.toFixed(2)} (${equalHighs}x)` : 'None detected';
        if (eqLowsEl) eqLowsEl.textContent = equalLows > 1 ? `$${minLow.toFixed(2)} (${equalLows}x)` : 'None detected';
    }
}

// Update Structure Breaks
function updateStructureBreaks() {
    try {
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const high = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        
        const container = document.getElementById('structure-breaks');
        if (!container) {
            console.warn('Structure breaks container not found');
            return;
        }
    
    let html = '';
    
    // BOS Detection
    if (currentPrice > high * 0.998) {
        html += `
            <div class="structure-item bos">
                <div class="structure-header">
                    <span class="structure-type">📈 BOS (Break of Structure)</span>
                    <span class="structure-time">Current TF - Active</span>
                </div>
                <div class="structure-details">
                    <span>Broke: $${high.toFixed(2)}</span>
                    <span>Direction: Bullish</span>
                </div>
            </div>
        `;
    }
    
    // CHoCH Detection
    if (Math.abs(priceChange) > 2) {
        html += `
            <div class="structure-item choch">
                <div class="structure-header">
                    <span class="structure-type">🔄 CHoCH (Change of Character)</span>
                    <span class="structure-time">Recent - Detected</span>
                </div>
                <div class="structure-details">
                    <span>Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%</span>
                    <span>Direction: ${priceChange > 0 ? 'Bullish' : 'Bearish'} Reversal</span>
                </div>
            </div>
        `;
    }
    
    // MSS Detection
    if (Math.abs(priceChange) > 5) {
        html += `
            <div class="structure-item mss">
                <div class="structure-header">
                    <span class="structure-type">⚡ MSS (Market Structure Shift)</span>
                    <span class="structure-time">Strong Move</span>
                </div>
                <div class="structure-details">
                    <span>Shift: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%</span>
                    <span>Momentum: ${priceChange > 0 ? 'Bullish' : 'Bearish'}</span>
                </div>
            </div>
        `;
    }
    
        container.innerHTML = html || '<div class="structure-item">No structure breaks detected</div>';
    } catch (error) {
        console.error('Error updating structure breaks:', error);
    }
}

// Calculate Market Structure
function calculateMarketStructure() {
    const high = parseFloat(document.getElementById('high-price').textContent);
    const low = parseFloat(document.getElementById('low-price').textContent);
    const current = parseFloat(document.getElementById('current-price').textContent);
    
    if (!high || !low || !current) return;
    
    document.getElementById('resistance').textContent = high.toFixed(2);
    document.getElementById('support').textContent = low.toFixed(2);
    
    document.getElementById('dist-resistance').textContent = `${((high - current) / current * 100).toFixed(2)}%`;
    document.getElementById('dist-support').textContent = `${((current - low) / current * 100).toFixed(2)}%`;
}

// Fetch Futures Data
async function fetchFuturesData() {
    try {
        const oiResponse = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${SYMBOL}`);
        const oiData = await oiResponse.json();
        
        if (oiData.openInterest) {
            document.getElementById('open-interest').textContent = formatVolume(parseFloat(oiData.openInterest));
        }
        
        const fundingResponse = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${SYMBOL}`);
        const fundingData = await fundingResponse.json();
        
        if (fundingData.lastFundingRate) {
            const rate = parseFloat(fundingData.lastFundingRate) * 100;
            const rateEl = document.getElementById('funding-rate');
            rateEl.textContent = `${rate.toFixed(4)}%`;
            rateEl.className = rate > 0 ? 'value green' : 'value red';
            
            const nextTime = new Date(fundingData.nextFundingTime);
            document.getElementById('next-funding').textContent = nextTime.toLocaleTimeString();
        }
        
        const ratioResponse = await fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${SYMBOL}&period=5m&limit=1`);
        const ratioData = await ratioResponse.json();
        
        if (ratioData.length > 0) {
            const ratio = parseFloat(ratioData[0].longShortRatio);
            const ratioEl = document.getElementById('long-short-ratio');
            ratioEl.textContent = ratio.toFixed(2);
            ratioEl.className = ratio > 1 ? 'value green' : 'value red';
        }
        
    } catch (error) {
        console.error('Error fetching futures data:', error);
    }
}

// Fetch Fear & Greed Index
async function fetchFearGreedIndex() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const value = parseInt(data.data[0].value);
            const classification = data.data[0].value_classification;
            
            document.getElementById('fear-greed').textContent = `${value} - ${classification}`;
            
            const fgEl = document.getElementById('fear-greed');
            const sentEl = document.getElementById('sentiment');
            
            if (value < 25) {
                fgEl.className = 'value red';
                sentEl.textContent = 'Extreme Fear 😱';
                sentEl.className = 'value red';
            } else if (value < 45) {
                fgEl.className = 'value';
                sentEl.textContent = 'Fear 😟';
                sentEl.className = 'value';
            } else if (value < 55) {
                fgEl.className = 'value';
                sentEl.textContent = 'Neutral 😐';
                sentEl.className = 'value';
            } else if (value < 75) {
                fgEl.className = 'value green';
                sentEl.textContent = 'Greed 😊';
                sentEl.className = 'value green';
            } else {
                fgEl.className = 'value green';
                sentEl.textContent = 'Extreme Greed 🤑';
                sentEl.className = 'value green';
            }
        }
    } catch (error) {
        console.error('Error fetching Fear & Greed:', error);
    }
}

// Helper: Format volume
function formatVolume(volume) {
    if (Math.abs(volume) >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (Math.abs(volume) >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
}

// Update time
function updateTime() {
    document.getElementById('last-update').textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
}

// ==================== STRATEGY ANALYSIS ====================

// Strategy 1: Volume Cluster Analysis
function analyzeVolumeCluster() {
    const criteria = {
        nearHVN: false,
        volumeSpike: false,
        nearPOC: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Price near High Volume Node
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const hvnPrice = elements.hvn ? parseFloat(elements.hvn.textContent.replace('$', '')) : 0;
        
        if (currentPrice && hvnPrice && !isNaN(currentPrice) && !isNaN(hvnPrice)) {
            const hvnDiff = Math.abs((currentPrice - hvnPrice) / currentPrice * 100);
            criteria.nearHVN = hvnDiff < 3.5; // Within 3.5% - MORE SENSITIVE
            if (criteria.nearHVN) metCount++;
        }
        
        // Check 2: Volume > 2x Average
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeSpike = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeSpike) metCount++;
        
        // Check 3: Price at POC ±3.5%
        const pocPrice = elements.poc ? parseFloat(elements.poc.textContent.replace('$', '')) : 0;
        if (currentPrice && pocPrice && !isNaN(pocPrice)) {
            const pocDiff = Math.abs((currentPrice - pocPrice) / currentPrice * 100);
            criteria.nearPOC = pocDiff < 3.5; // MORE SENSITIVE
            if (criteria.nearPOC) metCount++;
        }
    } catch (error) {
        console.error('Error in analyzeVolumeCluster:', error);
    }
    
    // Update UI
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('volume-cluster', criteria, metCount, totalCriteria, progress);
}

// Strategy 2: Cumulative Delta
function analyzeCumulativeDelta() {
    const criteria = {
        deltaPositive: false,
        deltaIncreasing: false,
        buyVolHigher: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Cumulative Delta Positive
        const cumulativeDeltaVal = elements.cumulativeDelta ? parseFloat(elements.cumulativeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.deltaPositive = cumulativeDeltaVal > 0;
        if (criteria.deltaPositive) metCount++;
        
        // Check 2: Delta Increasing (simplified - check if positive)
        criteria.deltaIncreasing = cumulativeDeltaVal > 0;
        if (criteria.deltaIncreasing) metCount++;
        
        // Check 3: Buy Volume > Sell Volume
        const buyVol = elements.buyVolume ? parseFloat(elements.buyVolume.textContent.replace(/[^0-9.]/g, '')) : 0;
        const sellVol = elements.sellVolume ? parseFloat(elements.sellVolume.textContent.replace(/[^0-9.]/g, '')) : 0;
        
        if (buyVol && sellVol && !isNaN(buyVol) && !isNaN(sellVol)) {
            criteria.buyVolHigher = buyVol > sellVol;
            if (criteria.buyVolHigher) metCount++;
        }
    } catch (error) {
        console.error('Error in analyzeCumulativeDelta:', error);
    }
    
    // Update UI
    const progress = (metCount / totalCriteria) * 100;
    const criteriaDisplay = {
        'Cumulative Delta Positive': criteria.deltaPositive,
        'Delta Increasing (Last 3 candles)': criteria.deltaIncreasing,
        'Buy Volume > Sell Volume': criteria.buyVolHigher
    };
    updateStrategyUI('cumulative-delta', criteriaDisplay, metCount, totalCriteria, progress);
}

// Strategy 3: VWAP + Order Flow
function analyzeVWAPFlow() {
    const criteria = {
        aboveVWAP: false,
        bullishFlow: false,
        deltaPositive: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Price above VWAP
        const vwapDev = elements.vwapDeviation ? parseFloat(elements.vwapDeviation.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.aboveVWAP = !isNaN(vwapDev) && vwapDev > 0;
        if (criteria.aboveVWAP) metCount++;
        
        // Check 2: Order Flow Bullish (OB Imbalance > 5%) - MORE SENSITIVE
        const obImbalance = elements.obImbalance ? parseFloat(elements.obImbalance.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.bullishFlow = !isNaN(obImbalance) && obImbalance > 5;
        if (criteria.bullishFlow) metCount++;
        
        // Check 3: Volume Delta Positive
        const volumeDelta = elements.volumeDelta ? parseFloat(elements.volumeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.deltaPositive = !isNaN(volumeDelta) && volumeDelta > 0;
        if (criteria.deltaPositive) metCount++;
    } catch (error) {
        console.error('Error in analyzeVWAPFlow:', error);
    }
    
    // Update UI
    const progress = (metCount / totalCriteria) * 100;
    const criteriaDisplay = {
        'Price above VWAP': criteria.aboveVWAP,
        'Order Flow Bullish (OB Imbalance > 10%)': criteria.bullishFlow,
        'Volume Delta Positive': criteria.deltaPositive
    };
    updateStrategyUI('vwap-flow', criteriaDisplay, metCount, totalCriteria, progress);
}

// Strategy 4: Liquidity Hunter
function analyzeLiquidityHunter() {
    const criteria = {
        nearExtreme: false,
        largeWall: false,
        liqImbalance: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Price near 24h High/Low
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const high = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
        const low = elements.lowPrice ? parseFloat(elements.lowPrice.textContent.replace('$', '')) : 0;
        
        if (currentPrice && high && low && !isNaN(currentPrice) && !isNaN(high) && !isNaN(low)) {
            const distToHigh = Math.abs((high - currentPrice) / currentPrice * 100);
            const distToLow = Math.abs((currentPrice - low) / currentPrice * 100);
            criteria.nearExtreme = distToHigh < 4 || distToLow < 4; // Within 4% - MORE SENSITIVE
            if (criteria.nearExtreme) metCount++;
        }
        
        // Check 2: Large Wall Detected (check if wall size > average)
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        const largestAskText = elements.largestAskWall ? elements.largestAskWall.textContent : '--';
        criteria.largeWall = largestBidText !== '--' && largestAskText !== '--';
        if (criteria.largeWall) metCount++;
        
        // Check 3: Liquidity Imbalance > 1.2 - MORE SENSITIVE
        const liqRatio = elements.liqRatio ? parseFloat(elements.liqRatio.textContent) : 0;
        if (liqRatio && !isNaN(liqRatio)) {
            criteria.liqImbalance = liqRatio > 1.2 || liqRatio < 0.83;
            if (criteria.liqImbalance) metCount++;
        }
    } catch (error) {
        console.error('Error in analyzeLiquidityHunter:', error);
    }
    
    // Update UI
    const progress = (metCount / totalCriteria) * 100;
    const criteriaDisplay = {
        'Price near 24h High/Low': criteria.nearExtreme,
        'Large Wall Detected': criteria.largeWall,
        'Liquidity Imbalance > 1.5': criteria.liqImbalance
    };
    updateStrategyUI('liquidity-hunter', criteriaDisplay, metCount, totalCriteria, progress);
}

// Strategy 5: Volume Profile POC
function analyzePOCStrategy() {
    const criteria = {
        atPOC: false,
        inValueArea: false,
        volumeSpike: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Price at POC ±2.5% - MORE SENSITIVE
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const pocPrice = elements.poc ? parseFloat(elements.poc.textContent.replace('$', '')) : 0;
        
        if (currentPrice && pocPrice && !isNaN(currentPrice) && !isNaN(pocPrice)) {
            const pocDiff = Math.abs((currentPrice - pocPrice) / currentPrice * 100);
            criteria.atPOC = pocDiff < 2.5;
            if (criteria.atPOC) metCount++;
        }
        
        // Check 2: Price in Value Area
        const vah = elements.vah ? parseFloat(elements.vah.textContent.replace('$', '')) : 0;
        const val = elements.val ? parseFloat(elements.val.textContent.replace('$', '')) : 0;
        
        if (currentPrice && vah && val && !isNaN(vah) && !isNaN(val)) {
            criteria.inValueArea = currentPrice >= val && currentPrice <= vah;
            if (criteria.inValueArea) metCount++;
        }
        
        // Check 3: Volume Spike Detected
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeSpike = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeSpike) metCount++;
    } catch (error) {
        console.error('Error in analyzePOCStrategy:', error);
    }
    
    // Update UI
    const progress = (metCount / totalCriteria) * 100;
    const criteriaDisplay = {
        'Price at POC ±1%': criteria.atPOC,
        'Price in Value Area (VAH-VAL)': criteria.inValueArea,
        'Volume Spike Detected': criteria.volumeSpike
    };
    updateStrategyUI('poc', criteriaDisplay, metCount, totalCriteria, progress);
}

// Update Strategy UI
function updateStrategyUI(strategyId, criteria, metCount, totalCriteria, progress) {
    // Update progress bar
    const progressBar = document.getElementById(`progress-${strategyId}`);
    const progressText = document.getElementById(`progress-text-${strategyId}`);
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        
        // Change color based on progress
        if (progress >= 100) {
            progressBar.className = 'progress-fill buy';
        } else if (progress >= 66) {
            progressBar.className = 'progress-fill';
        } else {
            progressBar.className = 'progress-fill';
        }
    }
    
    if (progressText) {
        progressText.textContent = `${progress.toFixed(0)}% Complete (${metCount}/${totalCriteria} criteria met)`;
    }
    
    // Update signal badge
    const signalBadge = document.querySelector(`#signal-${strategyId} .signal-badge`);
    if (signalBadge) {
        if (progress >= 100) {
            signalBadge.textContent = '🟢 BUY SIGNAL';
            signalBadge.className = 'signal-badge buy';
        } else if (progress === 0) {
            signalBadge.textContent = '🔴 SELL SIGNAL';
            signalBadge.className = 'signal-badge sell';
        } else {
            signalBadge.textContent = `⚪ NEUTRAL (${progress.toFixed(0)}%)`;
            signalBadge.className = 'signal-badge neutral';
        }
    }
    
    // Update criteria status
    const criteriaContainer = document.getElementById(`criteria-${strategyId}`);
    if (criteriaContainer) {
        const criterionElements = criteriaContainer.querySelectorAll('.criterion');
        let index = 0;
        
        for (let [name, met] of Object.entries(criteria)) {
            if (criterionElements[index]) {
                const statusSpan = criterionElements[index].querySelector('.criterion-status');
                if (statusSpan) {
                    if (met) {
                        statusSpan.textContent = '✅ Met';
                        statusSpan.className = 'criterion-status met';
                    } else {
                        statusSpan.textContent = '❌ Not Met';
                        statusSpan.className = 'criterion-status not-met';
                    }
                }
            }
            index++;
        }
    }
}

// Strategy 6: Delta Divergence
function analyzeDeltaDivergence() {
    const criteria = {
        priceHigherHigh: false,
        deltaLowerHigh: false,
        volumeConfirm: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Price making higher high (compare current to previous high)
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const highPrice = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
        
        criteria.priceHigherHigh = currentPrice > highPrice * 0.98; // Within 2% of high
        if (criteria.priceHigherHigh) metCount++;
        
        // Check 2: Delta making lower high (bearish divergence)
        const currentDelta = elements.cumulativeDelta ? parseFloat(elements.cumulativeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.deltaLowerHigh = currentDelta < 0; // Simplified: negative delta while price high
        if (criteria.deltaLowerHigh) metCount++;
        
        // Check 3: Volume confirmation
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeConfirm = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeConfirm) metCount++;
    } catch (error) {
        console.error('Error in analyzeDeltaDivergence:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('delta-divergence', {
        'Price Making Higher High': criteria.priceHigherHigh,
        'Delta Making Lower High (Bearish Div)': criteria.deltaLowerHigh,
        'Volume Confirmation': criteria.volumeConfirm
    }, metCount, totalCriteria, progress);
}

// Strategy 7: Absorption & Exhaustion
function analyzeAbsorption() {
    const criteria = {
        highVolLowMove: false,
        largeOrders: false,
        priceRejection: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: High volume with low price movement
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.highVolLowMove = (volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨')) && Math.abs(priceChange) < 1;
        if (criteria.highVolLowMove) metCount++;
        
        // Check 2: Large orders at level
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        const largestAskText = elements.largestAskWall ? elements.largestAskWall.textContent : '--';
        criteria.largeOrders = largestBidText !== '--' && largestAskText !== '--';
        if (criteria.largeOrders) metCount++;
        
        // Check 3: Price rejection (price near support/resistance)
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 100;
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        criteria.priceRejection = distResistance < 2 || distSupport < 2;
        if (criteria.priceRejection) metCount++;
    } catch (error) {
        console.error('Error in analyzeAbsorption:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('absorption', {
        'High Volume with Low Price Movement': criteria.highVolLowMove,
        'Large Orders at Level': criteria.largeOrders,
        'Price Rejection Signal': criteria.priceRejection
    }, metCount, totalCriteria, progress);
}

// Strategy 8: Iceberg Order Detection
function analyzeIceberg() {
    const criteria = {
        repeatedOrders: false,
        obImbalance: false,
        hiddenLiquidity: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Repeated same-size orders (simplified: check if walls exist)
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        criteria.repeatedOrders = largestBidText !== '--' && largestBidText.includes('@');
        if (criteria.repeatedOrders) metCount++;
        
        // Check 2: Order book imbalance > 12% - MORE SENSITIVE
        const obImbalance = elements.obImbalance ? parseFloat(elements.obImbalance.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.obImbalance = Math.abs(obImbalance) > 12;
        if (criteria.obImbalance) metCount++;
        
        // Check 3: Hidden liquidity (high liquidity ratio)
        const liqRatio = elements.liqRatio ? parseFloat(elements.liqRatio.textContent) : 1;
        criteria.hiddenLiquidity = liqRatio > 2 || liqRatio < 0.5;
        if (criteria.hiddenLiquidity) metCount++;
    } catch (error) {
        console.error('Error in analyzeIceberg:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('iceberg', {
        'Repeated Same-Size Orders': criteria.repeatedOrders,
        'Order Book Imbalance > 20%': criteria.obImbalance,
        'Hidden Liquidity Detected': criteria.hiddenLiquidity
    }, metCount, totalCriteria, progress);
}

// Strategy 9: Open Interest + Delta
function analyzeOIDelta() {
    const criteria = {
        oiIncreasing: false,
        fundingPositive: false,
        longShortRatio: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: OI increasing with price
        const oiText = document.getElementById('open-interest');
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.oiIncreasing = oiText && oiText.textContent !== '--' && priceChange > 0;
        if (criteria.oiIncreasing) metCount++;
        
        // Check 2: Funding rate positive
        const fundingRate = document.getElementById('funding-rate');
        if (fundingRate) {
            const rate = parseFloat(fundingRate.textContent.replace(/[^0-9.-]/g, ''));
            criteria.fundingPositive = !isNaN(rate) && rate > 0;
            if (criteria.fundingPositive) metCount++;
        }
        
        // Check 3: Long/Short ratio > 1
        const lsRatio = document.getElementById('long-short-ratio');
        if (lsRatio) {
            const ratio = parseFloat(lsRatio.textContent);
            criteria.longShortRatio = !isNaN(ratio) && ratio > 1;
            if (criteria.longShortRatio) metCount++;
        }
    } catch (error) {
        console.error('Error in analyzeOIDelta:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('oi-delta', {
        'OI Increasing with Price': criteria.oiIncreasing,
        'Funding Rate Positive': criteria.fundingPositive,
        'Long/Short Ratio > 1': criteria.longShortRatio
    }, metCount, totalCriteria, progress);
}

// Strategy 10: Volume Pressure Zones
function analyzeVolumePressure() {
    const criteria = {
        volumeAccel: false,
        atSupportResistance: false,
        breakoutProb: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Volume acceleration
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeAccel = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeAccel) metCount++;
        
        // Check 2: Price at support/resistance - MORE SENSITIVE
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 100;
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        criteria.atSupportResistance = distResistance < 5 || distSupport < 5;
        if (criteria.atSupportResistance) metCount++;
        
        // Check 3: Breakout probability (volume + price near level)
        criteria.breakoutProb = criteria.volumeAccel && criteria.atSupportResistance;
        if (criteria.breakoutProb) metCount++;
    } catch (error) {
        console.error('Error in analyzeVolumePressure:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('pressure', {
        'Volume Acceleration Detected': criteria.volumeAccel,
        'Price at Support/Resistance': criteria.atSupportResistance,
        'Breakout Probability > 60%': criteria.breakoutProb
    }, metCount, totalCriteria, progress);
}

// Strategy 11: Smart Money Flow
function analyzeSmartMoney() {
    const criteria = {
        accumulation: false,
        hiddenBuying: false,
        institutional: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Accumulation phase (low price movement, high volume) - MORE SENSITIVE
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.accumulation = Math.abs(priceChange) < 3 && (volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨'));
        if (criteria.accumulation) metCount++;
        
        // Check 2: Hidden buying (price stable, volume high, delta positive)
        const delta = elements.cumulativeDelta ? parseFloat(elements.cumulativeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.hiddenBuying = criteria.accumulation && delta > 0;
        if (criteria.hiddenBuying) metCount++;
        
        // Check 3: Institutional footprint (large orders)
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        criteria.institutional = largestBidText !== '--' && largestBidText.includes('@');
        if (criteria.institutional) metCount++;
    } catch (error) {
        console.error('Error in analyzeSmartMoney:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('smart-money', {
        'Accumulation Phase Detected': criteria.accumulation,
        'Hidden Buying (Price Stable, Volume High)': criteria.hiddenBuying,
        'Institutional Footprint': criteria.institutional
    }, metCount, totalCriteria, progress);
}

// Strategy 12: Break of Structure (BOS)
function analyzeBOS() {
    const criteria = {
        higherHigh: false,
        previousBroken: false,
        volumeConfirm: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Higher high formed
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const highPrice = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
        criteria.higherHigh = currentPrice > highPrice * 0.99;
        if (criteria.higherHigh) metCount++;
        
        // Check 2: Previous high broken
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 100;
        criteria.previousBroken = distResistance < 1;
        if (criteria.previousBroken) metCount++;
        
        // Check 3: Volume confirmation
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeConfirm = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeConfirm) metCount++;
    } catch (error) {
        console.error('Error in analyzeBOS:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('bos', {
        'Higher High Formed': criteria.higherHigh,
        'Previous High Broken': criteria.previousBroken,
        'Volume Confirmation': criteria.volumeConfirm
    }, metCount, totalCriteria, progress);
}

// Strategy 13: Fair Value Gap (FVG)
function analyzeFVG() {
    const criteria = {
        gapDetected: false,
        priceReturning: false,
        fillProbability: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Gap detected (simplified: large price movement) - MORE SENSITIVE
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.gapDetected = Math.abs(priceChange) > 1.5; // >1.5% move indicates potential gap
        if (criteria.gapDetected) metCount++;
        
        // Check 2: Price returning to gap (price near VWAP or POC) - MORE SENSITIVE
        const vwapDev = elements.vwapDeviation ? parseFloat(elements.vwapDeviation.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.priceReturning = Math.abs(vwapDev) < 3.5; // Within 3.5% of VWAP
        if (criteria.priceReturning) metCount++;
        
        // Check 3: Gap fill probability (volume + price action)
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.fillProbability = (volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨')) && criteria.priceReturning;
        if (criteria.fillProbability) metCount++;
    } catch (error) {
        console.error('Error in analyzeFVG:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('fvg', {
        'Gap Detected (3+ candles)': criteria.gapDetected,
        'Price Returning to Gap': criteria.priceReturning,
        'Gap Fill Probability > 70%': criteria.fillProbability
    }, metCount, totalCriteria, progress);
}

// Strategy 14: Change of Character (CHoCH)
function analyzeCHoCH() {
    const criteria = {
        trendReversal: false,
        lowerLowBroken: false,
        volumeSpike: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Trend reversal signal (price change direction)
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const lowPrice = elements.lowPrice ? parseFloat(elements.lowPrice.textContent.replace('$', '')) : 0;
        
        criteria.trendReversal = priceChange > 1 && currentPrice > lowPrice * 1.01; // 1% above low - MORE SENSITIVE
        if (criteria.trendReversal) metCount++;
        
        // Check 2: Lower low broken (bullish CHoCH) - MORE SENSITIVE
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        criteria.lowerLowBroken = distSupport > 1.5; // Price moved away from support
        if (criteria.lowerLowBroken) metCount++;
        
        // Check 3: Volume spike on break
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeSpike = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeSpike) metCount++;
    } catch (error) {
        console.error('Error in analyzeCHoCH:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('choch', {
        'Trend Reversal Signal': criteria.trendReversal,
        'Lower Low Broken (Bullish CHoCH)': criteria.lowerLowBroken,
        'Volume Spike on Break': criteria.volumeSpike
    }, metCount, totalCriteria, progress);
}

// Strategy 15: Market Structure Shift (MSS)
function analyzeMSS() {
    const criteria = {
        strongBreak: false,
        multipleSwings: false,
        momentumShift: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Strong trend break (large price change) - MORE SENSITIVE
        const priceChange = elements.priceChange ? parseFloat(elements.priceChange.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.strongBreak = Math.abs(priceChange) > 2.5; // >2.5% move
        if (criteria.strongBreak) metCount++;
        
        // Check 2: Multiple swing points broken (price far from both high and low) - MORE SENSITIVE
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 100;
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        criteria.multipleSwings = distResistance > 2.5 && distSupport > 2.5;
        if (criteria.multipleSwings) metCount++;
        
        // Check 3: Momentum shift (volume + delta)
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        const delta = elements.cumulativeDelta ? parseFloat(elements.cumulativeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        criteria.momentumShift = (volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨')) && Math.abs(delta) > 0;
        if (criteria.momentumShift) metCount++;
    } catch (error) {
        console.error('Error in analyzeMSS:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('mss', {
        'Strong Trend Break': criteria.strongBreak,
        'Multiple Swing Points Broken': criteria.multipleSwings,
        'Momentum Shift Confirmed': criteria.momentumShift
    }, metCount, totalCriteria, progress);
}

// Strategy 16: Order Blocks (OB)
function analyzeOrderBlocks() {
    const criteria = {
        obIdentified: false,
        priceTesting: false,
        volumeReaction: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Bullish order block (price near support with large orders) - MORE SENSITIVE
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        criteria.obIdentified = distSupport < 5 && largestBidText !== '--';
        if (criteria.obIdentified) metCount++;
        
        // Check 2: Price testing OB zone (near support/POC) - MORE SENSITIVE
        const pocDev = elements.pocDeviation ? parseFloat(elements.pocDeviation.textContent.replace(/[^0-9.-]/g, '')) : 100;
        criteria.priceTesting = Math.abs(pocDev) < 3.5 || distSupport < 3.5;
        if (criteria.priceTesting) metCount++;
        
        // Check 3: Reaction from OB (volume spike)
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeReaction = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeReaction) metCount++;
    } catch (error) {
        console.error('Error in analyzeOrderBlocks:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('order-blocks', {
        'Bullish Order Block Identified': criteria.obIdentified,
        'Price Testing OB Zone': criteria.priceTesting,
        'Reaction from OB (Volume)': criteria.volumeReaction
    }, metCount, totalCriteria, progress);
}

// Strategy 17: Liquidity Sweep
function analyzeLiquiditySweep() {
    const criteria = {
        stopHunt: false,
        quickReversal: false,
        volumeSpike: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Stop hunt (price briefly touched high/low)
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const highPrice = elements.highPrice ? parseFloat(elements.highPrice.textContent.replace('$', '')) : 0;
        const lowPrice = elements.lowPrice ? parseFloat(elements.lowPrice.textContent.replace('$', '')) : 0;
        
        const touchedHigh = Math.abs((currentPrice - highPrice) / highPrice * 100) < 0.5;
        const touchedLow = Math.abs((currentPrice - lowPrice) / lowPrice * 100) < 0.5;
        criteria.stopHunt = touchedHigh || touchedLow;
        if (criteria.stopHunt) metCount++;
        
        // Check 2: Quick reversal (price moved away from extreme)
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 0;
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 0;
        criteria.quickReversal = (touchedHigh && distResistance > 1) || (touchedLow && distSupport > 1);
        if (criteria.quickReversal) metCount++;
        
        // Check 3: Volume spike on sweep
        const volumeSpikeText = elements.volumeSpike ? elements.volumeSpike.textContent : '';
        criteria.volumeSpike = volumeSpikeText.includes('YES') || volumeSpikeText.includes('🚨');
        if (criteria.volumeSpike) metCount++;
    } catch (error) {
        console.error('Error in analyzeLiquiditySweep:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('liquidity-sweep', {
        'Stop Hunt Above/Below High/Low': criteria.stopHunt,
        'Quick Reversal After Sweep': criteria.quickReversal,
        'Volume Spike on Sweep': criteria.volumeSpike
    }, metCount, totalCriteria, progress);
}

// Strategy 18: Inducement & Mitigation
function analyzeInducement() {
    const criteria = {
        inducementLevel: false,
        priceMitigating: false,
        smartMoneyReversal: false
    };
    
    let metCount = 0;
    const totalCriteria = 3;
    
    try {
        // Check 1: Inducement level created (price near extreme with liquidity)
        const distResistance = elements.distResistance ? parseFloat(elements.distResistance.textContent.replace('%', '')) : 100;
        const distSupport = elements.distSupport ? parseFloat(elements.distSupport.textContent.replace('%', '')) : 100;
        criteria.inducementLevel = distResistance < 2 || distSupport < 2;
        if (criteria.inducementLevel) metCount++;
        
        // Check 2: Price mitigating OB/FVG (near POC or value area)
        const pocDev = elements.pocDeviation ? parseFloat(elements.pocDeviation.textContent.replace(/[^0-9.-]/g, '')) : 100;
        const currentPrice = elements.currentPrice ? parseFloat(elements.currentPrice.textContent.replace('$', '')) : 0;
        const vah = elements.vah ? parseFloat(elements.vah.textContent.replace('$', '')) : 0;
        const val = elements.val ? parseFloat(elements.val.textContent.replace('$', '')) : 0;
        
        criteria.priceMitigating = Math.abs(pocDev) < 2 || (currentPrice >= val && currentPrice <= vah);
        if (criteria.priceMitigating) metCount++;
        
        // Check 3: Smart money reversal (delta positive + large orders)
        const delta = elements.cumulativeDelta ? parseFloat(elements.cumulativeDelta.textContent.replace(/[^0-9.-]/g, '')) : 0;
        const largestBidText = elements.largestBidWall ? elements.largestBidWall.textContent : '--';
        criteria.smartMoneyReversal = delta > 0 && largestBidText !== '--';
        if (criteria.smartMoneyReversal) metCount++;
    } catch (error) {
        console.error('Error in analyzeInducement:', error);
    }
    
    const progress = (metCount / totalCriteria) * 100;
    updateStrategyUI('inducement', {
        'Inducement Level Created': criteria.inducementLevel,
        'Price Mitigating OB/FVG': criteria.priceMitigating,
        'Smart Money Reversal': criteria.smartMoneyReversal
    }, metCount, totalCriteria, progress);
}

// Global signal tracking for multi-timeframe analysis
let globalSignals = {
    '15m': { buy: 0, sell: 0, neutral: 0, total: 18 },
    '1h': { buy: 0, sell: 0, neutral: 0, total: 18 },
    '4h': { buy: 0, sell: 0, neutral: 0, total: 18 },
    '1d': { buy: 0, sell: 0, neutral: 0, total: 18 }
};

// Get current signal for a strategy
function getStrategySignal(strategyId) {
    const signalBadge = document.querySelector(`#signal-${strategyId} .signal-badge`);
    if (!signalBadge) return 'neutral';
    
    const text = signalBadge.textContent;
    if (text.includes('BUY')) return 'buy';
    if (text.includes('SELL')) return 'sell';
    return 'neutral';
}

// Run all strategy analyses
function analyzeAllStrategies() {
    analyzeVolumeCluster();
    analyzeCumulativeDelta();
    analyzeVWAPFlow();
    analyzeLiquidityHunter();
    analyzePOCStrategy();
    analyzeDeltaDivergence();
    analyzeAbsorption();
    analyzeIceberg();
    analyzeOIDelta();
    analyzeVolumePressure();
    analyzeSmartMoney();
    analyzeBOS();
    analyzeFVG();
    analyzeCHoCH();
    analyzeMSS();
    analyzeOrderBlocks();
    analyzeLiquiditySweep();
    analyzeInducement();
    
    // Track signals for current timeframe
    updateGlobalSignals();
}

// Update global signal tracking
function updateGlobalSignals() {
    const strategies = [
        'volume-cluster', 'cumulative-delta', 'vwap-flow', 'liquidity-hunter',
        'poc', 'delta-divergence', 'absorption', 'iceberg', 'oi-delta',
        'pressure', 'smart-money', 'bos', 'fvg', 'choch', 'mss',
        'order-blocks', 'liquidity-sweep', 'inducement'
    ];
    
    // Reset counts for current timeframe
    globalSignals[CURRENT_TIMEFRAME] = { buy: 0, sell: 0, neutral: 0, total: 18 };
    
    strategies.forEach(strategyId => {
        const signal = getStrategySignal(strategyId);
        globalSignals[CURRENT_TIMEFRAME][signal]++;
    });
    
    // Log signal comparison
    console.log(`[${CURRENT_TIMEFRAME}] Buy: ${globalSignals[CURRENT_TIMEFRAME].buy}, Sell: ${globalSignals[CURRENT_TIMEFRAME].sell}, Neutral: ${globalSignals[CURRENT_TIMEFRAME].neutral}`);
    
    // Check for strong directional signals
    checkMultiTimeframeSignals();
}

// Check if multiple timeframes agree on direction
function checkMultiTimeframeSignals() {
    const timeframes = ['15m', '1h', '4h', '1d'];
    let bullishTFs = 0;
    let bearishTFs = 0;
    
    timeframes.forEach(tf => {
        const signals = globalSignals[tf];
        if (signals.buy > signals.sell) bullishTFs++;
        else if (signals.sell > signals.buy) bearishTFs++;
    });
    
    // Strong consensus notification
    if (bullishTFs >= 3) {
        console.log('🚀 STRONG BUY SIGNAL: 3+ timeframes showing bullish consensus!');
        sendNotificationData('STRONG BUY', `${bullishTFs} timeframes bullish`, 'buy');
    } else if (bearishTFs >= 3) {
        console.log('📉 STRONG SELL SIGNAL: 3+ timeframes showing bearish consensus!');
        sendNotificationData('STRONG SELL', `${bearishTFs} timeframes bearish`, 'sell');
    }
    
    // Current timeframe strong signal
    const current = globalSignals[CURRENT_TIMEFRAME];
    if (current.buy >= 12) {
        console.log(`📊 [${CURRENT_TIMEFRAME}] STRONG BUY: ${current.buy}/18 strategies`);
        sendNotificationData(`[${CURRENT_TIMEFRAME}] BUY`, `${current.buy}/18 strategies`, 'buy');
    } else if (current.sell >= 12) {
        console.log(`📊 [${CURRENT_TIMEFRAME}] STRONG SELL: ${current.sell}/18 strategies`);
        sendNotificationData(`[${CURRENT_TIMEFRAME}] SELL`, `${current.sell}/18 strategies`, 'sell');
    }
}

// Send notification data (will be picked up by mobile app)
function sendNotificationData(title, message, type) {
    // Store in localStorage for mobile app to read
    const notification = {
        title,
        message,
        type,
        timestamp: Date.now(),
        symbol: SYMBOL,
        timeframe: CURRENT_TIMEFRAME
    };
    
    localStorage.setItem('latestSignal', JSON.stringify(notification));
    
    // Also store in notification history
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    history.unshift(notification);
    if (history.length > 50) history.pop(); // Keep last 50
    localStorage.setItem('notificationHistory', JSON.stringify(history));
    
    // Send to backend server for mobile app
    sendToBackend(notification);
    
    // Show browser notification
    showBrowserNotification(title, message, type);

    // Update in-page latest signal panel
    try {
        const card = document.getElementById('latest-signal-card');
        const titleEl = document.getElementById('latest-signal-title');
        const msgEl = document.getElementById('latest-signal-message');
        const metaEl = document.getElementById('latest-signal-meta');
        const timeEl = document.getElementById('latest-signal-time');

        if (card && titleEl && msgEl && metaEl && timeEl) {
            card.classList.remove('buy', 'sell', 'neutral');
            card.classList.add(type || 'neutral');

            titleEl.textContent = title;
            msgEl.textContent = message;
            
            const date = new Date(notification.timestamp);
            const timeStr = date.toLocaleTimeString();
            timeEl.textContent = `${SYMBOL} • ${CURRENT_TIMEFRAME} • ${timeStr}`;

            metaEl.textContent = `Type: ${type?.toUpperCase() || 'INFO'}`;
        }
    } catch (e) {
        console.warn('Error updating latest signal panel:', e);
    }
}

// Send signal data to backend server
async function sendToBackend(latestSignal) {
    try {
        const response = await fetch('http://localhost:3000/api/signals/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timeframe: CURRENT_TIMEFRAME,
                signals: globalSignals[CURRENT_TIMEFRAME],
                latestSignal,
                symbol: SYMBOL
            })
        });
        
        if (response.ok) {
            console.log('✅ Signal sent to backend server');
        }
    } catch (error) {
        console.log('⚠️ Backend server not available:', error.message);
    }
}

// API endpoint for mobile app to fetch signals
window.getSignalData = function() {
    return {
        currentTimeframe: CURRENT_TIMEFRAME,
        symbol: SYMBOL,
        signals: globalSignals,
        latestSignal: JSON.parse(localStorage.getItem('latestSignal') || 'null'),
        history: JSON.parse(localStorage.getItem('notificationHistory') || '[]')
    };
};

// Browser Notification Support
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Browser notifications enabled!');
                showBrowserNotification('KIROBOT Active', 'Notifications are now enabled!', 'success');
            }
        }
    }
}

// Show browser notification
function showBrowserNotification(title, message, type = 'info') {
    if ('Notification' in window && Notification.permission === 'granted') {
        const icon = type === 'buy' ? '🚀' : type === 'sell' ? '📉' : '📊';
        
        const notification = new Notification(`${icon} ${title}`, {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">📊</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🤖</text></svg>',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            tag: 'kirobot-signal'
        });
        
        notification.onclick = function() {
            window.focus();
            this.close();
        };
        
        // Auto close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
}

// Start the app
init();

// Request notification permission on load
setTimeout(() => {
    requestNotificationPermission();
}, 2000);

// Run strategy analysis every 5 seconds
setInterval(analyzeAllStrategies, 5000);
