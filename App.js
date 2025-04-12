import { SafeAreaView, StyleSheet } from 'react-native';

// You can import supported modules from npm
import JourneyHomeScreen from "./aeroassist/app/index"


export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <JourneyHomeScreen/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
    padding: 8,
  },
});
