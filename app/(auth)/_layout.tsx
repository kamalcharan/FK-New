// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="set-password" />
      <Stack.Screen name="verify-phone" />
      <Stack.Screen name="verify-invite" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="pain-point" />
      <Stack.Screen name="industry-picker" />
      <Stack.Screen name="workspace-setup" />
      <Stack.Screen name="guided-entry" />
      <Stack.Screen name="family-invite" />
    </Stack>
  );
}
