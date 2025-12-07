import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [signalData, setSignalData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    // Fetch signal data every 10 seconds
    fetchSignalData();
    const interval = setInterval(fetchSignalData, 10000);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
      clearInterval(interval);
    };
  }, []);

  const fetchSignalData = async () => {
    try {
      // In production, this would fetch from your backend API
      // For now, it reads from localStorage or makes API call
      const response = await fetch('http://localhost:3000/api/signals');
      const data = await response.json();
      setSignalData(data);
      
      // Check for strong signals and send notification
      checkAndNotify(data);
    } catch (error) {
      console.log('Error fetching signal data:', error);
      // Use mock data for demo
      setSignalData(getMockData());
    }
  };

  const checkAndNotify = (data) => {
    if (!data || !data.signals) return;

    const timeframes = ['15m', '1h', '4h', '1d'];
    let bullishCount = 0;
    let bearishCount = 0;

    // Count timeframes showing buy/sell bias
    timeframes.forEach(tf => {
      const signals = data.signals[tf];
      if (signals.buy > signals.sell) bullishCount++;
      else if (signals.sell > signals.buy) bearishCount++;
    });

    // Send notification for strong signals
    if (bullishCount >= 3) {
      schedulePushNotification(
        '🚀 STRONG BUY SIGNAL',
        `${bullishCount} timeframes showing bullish trend! Market is upward.`,
        { type: 'buy' }
      );
    } else if (bearishCount >= 3) {
      schedulePushNotification(
        '📉 STRONG SELL SIGNAL',
        `${bearishCount} timeframes showing bearish trend! Market is downward.`,
        { type: 'sell' }
      );
    }

    // Check current timeframe
    const current = data.signals[data.currentTimeframe];
    if (current && current.buy >= 12) {
      schedulePushNotification(
        `[${data.currentTimeframe}] BUY SIGNAL`,
        `${current.buy}/18 strategies indicating BUY`,
        { type: 'buy', timeframe: data.currentTimeframe }
      );
    } else if (current && current.sell >= 12) {
      schedulePushNotification(
        `[${data.currentTimeframe}] SELL SIGNAL`,
        `${current.sell}/18 strategies indicating SELL`,
        { type: 'sell', timeframe: data.currentTimeframe }
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSignalData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KIROBOT Trading Signals</Text>
        <Text style={styles.headerSubtitle}>Multi-Timeframe Analysis</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />
        }
      >
        {signalData ? (
          <>
            <View style={styles.currentSignal}>
              <Text style={styles.sectionTitle}>Current Symbol: {signalData.symbol}</Text>
              <Text style={styles.sectionSubtitle}>Timeframe: {signalData.currentTimeframe}</Text>
            </View>

            <View style={styles.signalGrid}>
              {['15m', '1h', '4h', '1d'].map(tf => {
                const signals = signalData.signals[tf];
                const dominant = signals.buy > signals.sell ? 'BUY' : signals.sell > signals.buy ? 'SELL' : 'NEUTRAL';
                const color = dominant === 'BUY' ? '#00ff88' : dominant === 'SELL' ? '#ff3860' : '#888';
                
                return (
                  <View key={tf} style={[styles.timeframeCard, { borderColor: color }]}>
                    <Text style={styles.timeframeLabel}>{tf.toUpperCase()}</Text>
                    <Text style={[styles.dominantSignal, { color }]}>{dominant}</Text>
                    <View style={styles.signalBreakdown}>
                      <Text style={styles.buyCount}>🟢 {signals.buy}</Text>
                      <Text style={styles.sellCount}>🔴 {signals.sell}</Text>
                      <Text style={styles.neutralCount}>⚪ {signals.neutral}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${(signals.buy / 18) * 100}%`,
                            backgroundColor: '#00ff88'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.consensusCard}>
              <Text style={styles.consensusTitle}>Multi-Timeframe Consensus</Text>
              {getConsensusMessage(signalData.signals)}
            </View>

            {signalData.latestSignal && (
              <View style={styles.latestSignalCard}>
                <Text style={styles.latestSignalTitle}>Latest Signal</Text>
                <View style={[
                  styles.signalBadge, 
                  { backgroundColor: signalData.latestSignal.type === 'buy' ? '#00ff88' : '#ff3860' }
                ]}>
                  <Text style={styles.signalBadgeText}>{signalData.latestSignal.title}</Text>
                </View>
                <Text style={styles.signalMessage}>{signalData.latestSignal.message}</Text>
                <Text style={styles.signalTime}>
                  {new Date(signalData.latestSignal.timestamp).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.strategyList}>
              <Text style={styles.sectionTitle}>Strategy Breakdown</Text>
              <Text style={styles.strategyInfo}>
                All 18 strategies are analyzed across multiple timeframes:
              </Text>
              <View style={styles.strategyGrid}>
                {getStrategyList().map((strategy, index) => (
                  <View key={index} style={styles.strategyItem}>
                    <Text style={styles.strategyNumber}>{index + 1}</Text>
                    <Text style={styles.strategyName}>{strategy}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading signal data...</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={onRefresh}
      >
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

function getConsensusMessage(signals) {
  const timeframes = ['15m', '1h', '4h', '1d'];
  let bullishCount = 0;
  let bearishCount = 0;

  timeframes.forEach(tf => {
    const sig = signals[tf];
    if (sig.buy > sig.sell) bullishCount++;
    else if (sig.sell > sig.buy) bearishCount++;
  });

  if (bullishCount >= 3) {
    return (
      <Text style={[styles.consensusText, { color: '#00ff88' }]}>
        🚀 STRONG BULLISH CONSENSUS: {bullishCount}/4 timeframes showing upward trend
      </Text>
    );
  } else if (bearishCount >= 3) {
    return (
      <Text style={[styles.consensusText, { color: '#ff3860' }]}>
        📉 STRONG BEARISH CONSENSUS: {bearishCount}/4 timeframes showing downward trend
      </Text>
    );
  } else {
    return (
      <Text style={[styles.consensusText, { color: '#888' }]}>
        ⚪ MIXED SIGNALS: No clear multi-timeframe consensus
      </Text>
    );
  }
}

function getStrategyList() {
  return [
    'Volume Cluster Analysis',
    'Cumulative Delta',
    'VWAP + Order Flow',
    'Liquidity Hunter',
    'Volume Profile POC',
    'Delta Divergence',
    'Absorption & Exhaustion',
    'Iceberg Order Detection',
    'Open Interest + Delta',
    'Volume Pressure Zones',
    'Smart Money Flow',
    'Break of Structure (BOS)',
    'Fair Value Gap (FVG)',
    'Change of Character (CHoCH)',
    'Market Structure Shift (MSS)',
    'Order Blocks (OB)',
    'Liquidity Sweep',
    'Inducement & Mitigation'
  ];
}

function getMockData() {
  return {
    currentTimeframe: '15m',
    symbol: 'BTCUSDT',
    signals: {
      '15m': { buy: 14, sell: 2, neutral: 2, total: 18 },
      '1h': { buy: 12, sell: 4, neutral: 2, total: 18 },
      '4h': { buy: 13, sell: 3, neutral: 2, total: 18 },
      '1d': { buy: 11, sell: 5, neutral: 2, total: 18 }
    },
    latestSignal: {
      title: 'STRONG BUY',
      message: '3 timeframes bullish',
      type: 'buy',
      timestamp: Date.now(),
      symbol: 'BTCUSDT',
      timeframe: '15m'
    }
  };
}

async function schedulePushNotification(title, body, data) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: 'high',
    },
    trigger: { seconds: 1 },
  });
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00ff88',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    backgroundColor: '#1a1f2e',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#00ff88',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  currentSignal: {
    backgroundColor: '#1a1f2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  timeframeCard: {
    width: '48%',
    backgroundColor: '#1a1f2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
  },
  timeframeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  dominantSignal: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  signalBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  buyCount: {
    color: '#00ff88',
    fontSize: 12,
  },
  sellCount: {
    color: '#ff3860',
    fontSize: 12,
  },
  neutralCount: {
    color: '#888',
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2f3e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  consensusCard: {
    backgroundColor: '#1a1f2e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#00ff88',
  },
  consensusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  consensusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  latestSignalCard: {
    backgroundColor: '#1a1f2e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  latestSignalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  signalBadge: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  signalBadgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  signalMessage: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  signalTime: {
    color: '#888',
    fontSize: 12,
  },
  strategyList: {
    backgroundColor: '#1a1f2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  strategyInfo: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
  },
  strategyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  strategyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f3e',
  },
  strategyNumber: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 14,
    width: 30,
  },
  strategyName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: '#00ff88',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
