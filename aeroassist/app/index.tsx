import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, TouchableOpacity, Alert, Linking, StatusBar, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

// Extend dayjs with required plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.tz.setDefault('Asia/Kolkata'); // Set default to IST

// Define prompt types for better type safety
type PromptIcon = 'timer-sand' | 'airplane-off' | 'gate' | 'alarm' | 'walk' | 'car' | 'home-lock' | 'airplane-takeoff';

interface ContextPrompt {
  text: string;
  icon: PromptIcon;
  color: string;
  action: string;
}

interface FlightInfo {
  departureTime: string;
  gate: string;
  terminal: string;
  status: 'On Time' | 'Delayed' | 'Boarding' | 'Departed' | 'Cancelled';
  destinationWeather: string;
  seat: string;
  boardingTime: string;
  airline: string;
  flightNumber: string;
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
}

const JourneyHomeScreen = () => {
  const [countdown, setCountdown] = useState('00h 00m 00s');
  const [contextPrompt, setContextPrompt] = useState<ContextPrompt>({
    text: 'Calculating your journey...',
    icon: 'timer-sand',
    color: '#f5f5f5',
    action: 'calculating'
  });
  
  // Mock flight data - would come from API in real app
  const [flightInfo] = useState<FlightInfo>({
    departureTime: '2025-04-12T21:45:00+05:30', // ISO with IST offset
    gate: 'A12',
    terminal: 'T1C',
    status: 'On Time',
    destinationWeather: '30°C',
    seat: '23A',
    boardingTime: '2025-04-12T21:15:00+05:30',
    airline: 'Air India',
    flightNumber: 'AI-864',
    from: 'Mumbai',
    fromCode: 'BOM',
    to: 'Delhi',
    toCode: 'DEL'
  });

  useEffect(() => {
    const calculateJourney = () => {
      // Get current time with timezone consideration
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

      const countdownStr = isDeparted 
        ? `Departed ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ago`
        : `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
      
      setCountdown(countdownStr);

      // Context logic for travelers
      let newPrompt: ContextPrompt = { 
        text: 'Calculating your journey...', 
        icon: 'timer-sand',
        color: '#f5f5f5',
        action: 'default'
      };

      if (isDeparted) {
        newPrompt = {
          text: 'Flight has departed',
          icon: 'airplane-takeoff',
          color: '#e8e8e8',
          action: 'completed'
        };
      } else {
        const minsToDeparture = Math.floor(totalMs / 60000);
        const minsToBoarding = boarding.diff(now, 'minute');

        if (minsToBoarding <= 0) {
          // Boarding has started
          if (minsToDeparture <= 15) {
            newPrompt = {
              text: `Final boarding call! ${minsToDeparture}m left`,
              icon: 'alarm',
              color: '#ffebee',
              action: 'urgent-boarding'
            };
          } else {
            newPrompt = { 
              text: `Boarding now at Gate ${flightInfo.gate}`,
              icon: 'gate',
              color: '#e3f2fd',
              action: 'gate-directions'
            };
          }
        } else {
          // Indian airports recommended 3-hour buffer for security
          const airportTime = departure.subtract(3, 'hour'); 
          // Add travel time to airport from home (45 mins)
          const leaveHomeTime = airportTime.subtract(45, 'minute');

          if (now.isAfter(airportTime)) {
            // At or should be at airport
            newPrompt = {
              text: `Proceed to Security (Gate ${flightInfo.gate})`,
              icon: 'walk',
              color: '#e8f5e9',
              action: 'terminal-navigation'
            };
          } else if (now.isAfter(leaveHomeTime)) {
            // Time to leave for airport
            newPrompt = {
              text: `🚗 Book Ola/Uber to reach by ${airportTime.format('h:mm A')}`,
              icon: 'car',
              color: '#fff3e0',
              action: 'book-cab'
            };
          } else {
            // Still have time at home
            const leaveIn = leaveHomeTime.diff(now, 'minute');
            if (leaveIn > 60) {
              newPrompt = {
                text: `Leave in ${Math.floor(leaveIn/60)}h ${leaveIn%60}m`,
                icon: 'home-lock',
                color: '#f5f5f5',
                action: 'set-reminder'
              }; 
            } else {
              newPrompt = {
                text: `Prepare to leave in ${leaveIn}m`,
                icon: 'home-lock',
                color: '#f5f5f5',
                action: 'set-reminder'
              };
            }
          }
        }
      }

      setContextPrompt(newPrompt);
    };

    // Initial calculation
    calculateJourney();
    
    // Update every second
    const interval = setInterval(calculateJourney, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [flightInfo]);

  // Status color mapping
  const getStatusColor = (status: FlightInfo['status']) => {
    switch(status) {
      case 'On Time': return '#4CAF50';
      case 'Boarding': return '#2196F3';
      case 'Delayed': return '#FF9800';
      case 'Cancelled': return '#F44336';
      case 'Departed': return '#9E9E9E';
      default: return '#4CAF50';
    }
  };

  const handlePromptAction = () => {
    switch(contextPrompt.action) {
      case 'book-cab':
        Alert.alert('Book Cab', 'Open ride app?', [
          { text: 'Ola', onPress: () => Linking.openURL('ola://') },
          { text: 'Uber', onPress: () => Linking.openURL('uber://') },
          { text: 'Cancel', style: 'cancel' }
        ]);
        break;
      case 'gate-directions':
        Alert.alert(
          'Boarding Information', 
          `Please proceed to Gate ${flightInfo.gate} in Terminal ${flightInfo.terminal}.\n\nBoarding is in progress.`
        );
        break;
      case 'urgent-boarding':
        Alert.alert(
          'Urgent Boarding', 
          'Final boarding call! Please proceed to gate immediately to avoid missing your flight.',
          [{ text: 'OK', style: 'destructive' }]
        );
        break;
      case 'terminal-navigation':
        Alert.alert(
          'Security Check', 
          `Please proceed through security in Terminal ${flightInfo.terminal} to reach Gate ${flightInfo.gate}.\n\nHave your ID and boarding pass ready.`
        );
        break;
      case 'set-reminder':
        Alert.alert('Set Reminder', 'Would you like to set a reminder to leave for the airport?', [
          { 
            text: 'Yes', 
            onPress: () => Alert.alert('Reminder Set', 'We will notify you when it\'s time to leave.') 
          },
          { text: 'No', style: 'cancel' }
        ]);
        break;
      case 'completed':
        Alert.alert(
          'Flight Departed', 
          `Flight ${flightInfo.flightNumber} to ${flightInfo.to} has departed.\n\nNext updates will be available at arrival.`
        );
        break;
      default:
        Alert.alert('Flight Information', contextPrompt.text);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <View style={styles.routeContainer}>
          <Text style={styles.cityText}>{flightInfo.from}</Text>
          <MaterialCommunityIcons name="airplane" size={20} color="#555" style={styles.planeIcon} />
          <Text style={styles.cityText}>{flightInfo.to}</Text>
        </View>
        
        <Text style={styles.flightNumberText}>
          {flightInfo.airline} {flightInfo.flightNumber}
        </Text>
        
        <Text style={styles.dateText}>
          {dayjs.tz(flightInfo.departureTime).format('ddd, D MMM • h:mm A')}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.promptCard, { backgroundColor: contextPrompt.color }]}
        onPress={handlePromptAction}
        activeOpacity={0.8}
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
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(flightInfo.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(flightInfo.status) }]}>
            {flightInfo.status}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="gate" size={22} color="#555" />
            <Text style={styles.cardLabel}>Gate</Text>
          </View>
          <Text style={styles.cardValue}>{flightInfo.gate}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="seat-passenger" size={22} color="#555" />
            <Text style={styles.cardLabel}>Seat</Text>
          </View>
          <Text style={styles.cardValue}>{flightInfo.seat}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={22} color="#555" />
            <Text style={styles.cardLabel}>Weather at Destination</Text>
          </View>
          <Text style={styles.cardValue}>{flightInfo.destinationWeather}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#555" />
            <Text style={styles.cardLabel}>Boarding Time</Text>
          </View>
          <Text style={styles.cardValue}>
            {dayjs.tz(flightInfo.boardingTime).format('h:mm A')}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.assistantButton}
        onPress={() => Alert.alert('Travel Assistant', 'How can I help with your journey?')}
      >
        <MaterialCommunityIcons name="headset" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const CARD_GUTTER = 16;
const CARD_WIDTH = (width - (CARD_GUTTER * 3) - 32) / 2; // 32 for container padding

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  planeIcon: {
    marginHorizontal: 8,
    transform: [{ rotate: '90deg' }],
  },
  flightNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#777',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
    borderColor: '#eee',
  },
  promptIcon: {
    marginRight: 12,
  },
  promptText: {
    flex: 1,
    fontSize: 16,
    color: '#2d2d2d',
    fontWeight: '500',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#2d2d2d',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
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
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLabel: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  cardValue: {
    color: '#2d2d2d',
    fontSize: 18,
    fontWeight: '600',
  },
  assistantButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#0a84ff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default JourneyHomeScreen;