import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import DoctorModeScreen from './src/screens/DoctorModeScreen';
import LiveDoctorScreen from './src/screens/LiveDoctorScreen';
import PatientScreen from './src/screens/PatientScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import DoctorScreen from './src/screens/DoctorScreen';
import FloatingTabBar, { TabBarItem } from './src/components/FloatingTabBar';
import { colors } from './src/lib/theme';
import type { PatientSummary } from './src/lib/api';

// ── Route param types ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Main: undefined;
  LiveDoctor: undefined;
  Demo: undefined;
  Summary: { summary?: PatientSummary };
};

const RootStack = createStackNavigator<RootStackParamList>();

const TAB_ITEMS: TabBarItem[] = [
  {
    key: 'Home',
    label: 'Overview',
    iconFamily: 'ion',
    icon: 'home-outline',
    iconActive: 'home',
  },
  {
    key: 'Doctor',
    label: 'Doctor',
    iconFamily: 'mci',
    icon: 'stethoscope',
    iconActive: 'stethoscope',
  },
  {
    key: 'Patient',
    label: 'Patient',
    iconFamily: 'ion',
    icon: 'person-outline',
    iconActive: 'person',
  },
];

/**
 * Main shell — a hand-rolled tab switcher so we can host a floating glass
 * tab bar overlay above the content without using @react-navigation/bottom-tabs
 * (which forces a flush, system-styled bar).
 */
function MainShell() {
  const [activeKey, setActiveKey] = useState<string>('Home');

  const renderScreen = () => {
    switch (activeKey) {
      case 'Home':
        return <HomeScreen />;
      case 'Doctor':
        return <DoctorModeScreen />;
      case 'Patient':
        return <PatientScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <View style={styles.shell}>
      <View style={styles.screen}>{renderScreen()}</View>
      <FloatingTabBar
        activeKey={activeKey}
        items={TAB_ITEMS}
        onSelect={setActiveKey}
      />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <RootStack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.paper },
              cardStyleInterpolator: ({ current: { progress } }: any) => ({
                cardStyle: { opacity: progress },
              }),
              transitionSpec: {
                open: { animation: 'timing', config: { duration: 280 } },
                close: { animation: 'timing', config: { duration: 220 } },
              },
            }}
          >
            <RootStack.Screen name="Main" component={MainShell} options={{ animation: 'fade' }} />
            <RootStack.Screen
              name="LiveDoctor"
              component={LiveDoctorScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen name="Demo" component={DoctorScreen} />
            <RootStack.Screen name="Summary" component={SummaryScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1, backgroundColor: colors.paper },
  screen: { flex: 1 },
});