import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import RoleScreen from './src/screens/RoleScreen';
import DoctorConsultScreen from './src/screens/DoctorConsultScreen';
import PatientScreen from './src/screens/PatientScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import { colors } from './src/lib/theme';
import type { PatientSummary } from './src/lib/api';

// ── Route param types ─────────────────────────────────────────────────────────
export type RootStackParamList = {
  Role: undefined;
  Doctor: undefined;
  Patient: undefined;
  Summary: { summary?: PatientSummary };
};

const RootStack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <RootStack.Navigator
            initialRouteName="Role"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.paper },
            }}
          >
            <RootStack.Screen name="Role" component={RoleScreen} />
            <RootStack.Screen name="Doctor" component={DoctorConsultScreen} />
            <RootStack.Screen name="Patient" component={PatientScreen} />
            <RootStack.Screen name="Summary" component={SummaryScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
