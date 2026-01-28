// app/_layout.tsx
import { useEffect, useState, useRef } from 'react';
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
import { supabase, isSupabaseReady } from '../src/lib/supabase';

// Prevent native splash screen from auto-hiding
NativeSplashScreen.preventAutoHideAsync();

// Track if splash has been shown in this app session (persists across re-renders)
let splashShownInSession = false;

export default function RootLayout() {
  const [showCustomSplash, setShowCustomSplash] = useState(!splashShownInSession);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasCheckedAuth = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_600SemiBold,
    Fraunces_600SemiBold,
  });

  // Check if user is already authenticated - skip splash for returning users
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkExistingSession = async () => {
      try {
        if (isSupabaseReady() && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // User is already logged in - skip splash
            console.log('[Layout] Existing session found, skipping splash');
            splashShownInSession = true;
            setShowCustomSplash(false);
          }
        }
      } catch (error) {
        console.log('[Layout] Error checking session:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !checkingAuth) {
      // Hide native splash once fonts are loaded and auth is checked
      NativeSplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, checkingAuth]);

  // Show loading while fonts load or checking auth
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

  // Still checking auth - show brief loading
  if (checkingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Show custom splash with tagline (only for fresh app opens, not returning users)
  if (showCustomSplash) {
    return (
      <SplashScreen onFinish={() => {
        splashShownInSession = true;
        setShowCustomSplash(false);
      }} />
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
            <Stack.Screen name="insurance-detail" options={{ presentation: 'card' }} />
            <Stack.Screen name="family-members" options={{ presentation: 'card' }} />
          </Stack>
          <Toast config={toastConfig} />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
