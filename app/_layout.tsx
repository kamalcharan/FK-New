// app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { Provider } from 'react-redux';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_300Light } from '@expo-google-fonts/inter';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import * as NativeSplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { store } from '../src/store';
import { Colors } from '../src/constants/theme';
import { SplashScreen } from '../src/components/SplashScreen';
import { toastConfig } from '../src/components/ToastConfig';

// Prevent native splash screen from auto-hiding
NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide native splash, show our custom splash with tagline
      NativeSplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show loading while fonts load
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Show error if fonts failed
  if (fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: Colors.danger, fontSize: 16, textAlign: 'center' }}>
          Font loading error: {fontError.message}
        </Text>
      </View>
    );
  }

  // Show custom splash with tagline
  if (showCustomSplash) {
    return (
      <SplashScreen onFinish={() => setShowCustomSplash(false)} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-loan" options={{ presentation: 'modal' }} />
            <Stack.Screen name="add-insurance" options={{ presentation: 'modal' }} />
            <Stack.Screen name="add-renewal" options={{ presentation: 'modal' }} />
          </Stack>
          <Toast config={toastConfig} />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
