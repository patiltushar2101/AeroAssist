// JourneyHomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Alert, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.tz.setDefault('Asia/Kolkata'); // Set default to IST

const JourneyHomeScreen = () => {
  const [countdown, setCountdown] = useState('00h 00m 00s');
  const [contextPrompt, setContextPrompt] = useState<{
    text: string;
    icon: "timer-sand" | "airplane-off" | "gate" | "alarm" | "walk" | "car" | "home-lock";
    color: string;
    action: string;
  }>({
    text: 'Calculating your journey...',
    icon: 'timer-sand',
    color: '#f5f5f5',
    action: 'calculating'
  });
  
  const [flightInfo] = useState<{
    departureTime: string;
    gate: string;
    terminal: string;
    status: string;
    destinationWeather: string;
    seat: string;
    boardingTime: string;
    airline: string;
    flightNumber: string;
  }>({
    departureTime: '2025-04-12T21:45:00+05:30', // ISO with IST offset
    gate: 'A12',
    terminal: 'T1C',
    status: 'On Time',
    destinationWeather: '30°C',
    seat: '23A',
    boardingTime: '2025-04-12T21:15:00+05:30',
    airline: 'Air India',
    flightNumber: 'AI-864'
  });

  useEffect(() => {
    const calculateJourney = () => {
      const now = dayjs().tz();
      const departure = dayjs.tz(flightInfo.departureTime);
      const boarding = dayjs.tz(flightInfo.boardingTime);
      
      // Time calculations
      const totalMs = departure.diff(now);
      const isDeparted = totalMs < 0;

      // Format countdown
      const absMs = Math.abs(totalMs);
      const hours = Math.floor(absMs / 3600000);
      const minutes = Math.floor((absMs % 3600000) / 60000);
      const seconds = Math.floor((absMs % 60000) / 1000);

      setCountdown(
        `${String(hours).padStart(2, '0')}h ` +
        `${String(minutes).padStart(2, '0')}m ` +
        `${String(seconds).padStart(2, '0')}s`
      );

      // Context logic for Indian travelers
      let newPrompt: {
        text: string;
        icon: "timer-sand" | "airplane-off" | "gate" | "alarm" | "walk" | "car" | "home-lock";
        color: string;
        action: string;
      } = { 
        text: 'Calculating...', 
        icon: 'timer-sand',
        color: '#f5f5f5',
        action: 'default'
      };

      if (isDeparted) {
        newPrompt = {
          text: 'Flight has departed',
          icon: 'airplane-off',
          color: '#eeeeee',
          action: 'completed'
        };
      } else {
        const minsToDeparture = Math.floor(totalMs / 60000);
        const minsToBoarding = boarding.diff(now, 'minute');

        if (minsToBoarding <= 0) {
          newPrompt = minsToDeparture > 15 ? { 
            text: `Boarding at Gate ${flightInfo.gate}`,
            icon: 'gate',
            color: '#e3f2fd',
            action: 'gate-directions'
          } : {
            text: `Final boarding! ${minsToDeparture}m left`,
            icon: 'alarm',
            color: '#ffebee',
            action: 'urgent-boarding'
          };
        } else {
          const airportTime = departure.subtract(3, 'hour'); // Indian airport security recommendation
          const leaveHomeTime = airportTime.subtract(45, 'minute');

          if (now.isAfter(airportTime)) {
            newPrompt = {
              text: `Proceed to Security (Gate ${flightInfo.gate})`,
              icon: 'walk',
              color: '#e8f5e9',
              action: 'terminal-navigation'
            };
          } else if (now.isAfter(leaveHomeTime)) {
            newPrompt = {
              text: `🚗 Book Ola/Uber (Reach by ${airportTime.format('h:mm A')})`,
              icon: 'car',
              color: '#fff3e0',
              action: 'book-cab'
            };
          } else {
            const leaveIn = leaveHomeTime.diff(now, 'minute');
            newPrompt = leaveIn > 60 ? {
              text: `Leave in ${Math.floor(leaveIn/60)}h ${leaveIn%60}m`,
              icon: 'home-lock',
              color: '#f5f5f5',
              action: 'set-reminder'
            } : {
              text: `Prep to leave in ${leaveIn}m`,
              icon: 'home-lock',
              color: '#f5f5f5',
              action: 'set-reminder'
            };
          }
        }
      }

      setContextPrompt(newPrompt);
    };

    const interval = setInterval(calculateJourney, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePromptAction = () => {
    if(contextPrompt.action === 'book-cab') {
      Alert.alert('Book Cab', 'Open Ola/Uber?', [
        { text: 'Ola', onPress: () => Linking.openURL('ola://') },
        { text: 'Uber', onPress: () => Linking.openURL('uber://') },
        { text: 'Cancel' }
      ]);
    } else {
      Alert.alert('Travel Assistant', contextPrompt.text);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{flightInfo.airline} {flightInfo.flightNumber}</Text>
        <Text style={styles.title}>Mumbai (BOM) → Delhi (DEL)</Text>
        <Text style={styles.subtitle}>
          {dayjs.tz(flightInfo.departureTime).format('ddd, D MMM • h:mm A')}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.promptCard, { backgroundColor: contextPrompt.color }]}
        onPress={handlePromptAction}
      >
        <MaterialCommunityIcons
          name={contextPrompt.icon}
          size={24}
          color="#2d2d2d"
          style={styles.promptIcon}
        />
        <Text style={styles.promptText}>{contextPrompt.text}</Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color="#2d2d2d"
        />
      </TouchableOpacity>

      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>{countdown}</Text>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons name="circle" size={12} color="#4CAF50" />
          <Text style={styles.statusText}>{flightInfo.status}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="gate" size={22} color="#2d2d2d" />
          <Text style={styles.cardLabel}>Gate</Text>
          <Text style={styles.cardValue}>{flightInfo.gate}</Text>
        </View>

        <View style={styles.card}>
          <MaterialCommunityIcons name="seat" size={22} color="#2d2d2d" />
          <Text style={styles.cardLabel}>Seat</Text>
          <Text style={styles.cardValue}>{flightInfo.seat}</Text>
        </View>

        <View style={styles.card}>
          <MaterialCommunityIcons name="weather-cloudy" size={22} color="#2d2d2d" />
          <Text style={styles.cardLabel}>Weather</Text>
          <Text style={styles.cardValue}>{flightInfo.destinationWeather}</Text>
        </View>

        <View style={styles.card}>
          <MaterialCommunityIcons name="clock" size={22} color="#2d2d2d" />
          <Text style={styles.cardLabel}>Boarding</Text>
          <Text style={styles.cardValue}>
            {dayjs.tz(flightInfo.boardingTime).format('h:mm A')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const CARD_GUTTER = 16;
const CARD_WIDTH = (width - CARD_GUTTER * 3) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: CARD_GUTTER,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2d2d2d',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
  },
  promptIcon: {
    marginRight: 12,
  },
  promptText: {
    flex: 1,
    fontSize: 15,
    color: '#2d2d2d',
    fontWeight: '500',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  countdownText: {
    fontSize: 40,
    fontWeight: '300',
    color: '#2d2d2d',
    fontFamily: 'space-mono',
    letterSpacing: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 12,
  },
  statusText: {
    color: '#4CAF50',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: CARD_GUTTER,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
  cardValue: {
    color: '#2d2d2d',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default JourneyHomeScreen;