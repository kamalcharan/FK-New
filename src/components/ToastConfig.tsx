// src/components/ToastConfig.tsx
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToast, ToastConfig as ToastConfigType } from 'react-native-toast-message';
import { Colors, BorderRadius, Typography } from '../constants/theme';

// Custom toast components matching our glass morphism theme
export const toastConfig: ToastConfigType = {
  // Success toast
  success: ({ text1, text2 }) => (
    <View style={[styles.container, styles.success]}>
      <Text style={styles.icon}>✓</Text>
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),

  // Error toast
  error: ({ text1, text2 }) => (
    <View style={[styles.container, styles.error]}>
      <Text style={styles.icon}>✕</Text>
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),

  // Info toast
  info: ({ text1, text2 }) => (
    <View style={[styles.container, styles.info]}>
      <Text style={styles.icon}>ℹ</Text>
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),

  // Warning toast
  warning: ({ text1, text2 }) => (
    <View style={[styles.container, styles.warning]}>
      <Text style={styles.icon}>⚠</Text>
      <View style={styles.textContainer}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  ),
};

// Helper functions for showing toasts
export const showSuccessToast = (title: string, message?: string) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
  });
};

export const showErrorToast = (title: string, message?: string) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
  });
};

export const showInfoToast = (title: string, message?: string) => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
  });
};

export const showWarningToast = (title: string, message?: string) => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
  });
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 300,
    maxWidth: '90%',
  },
  success: {
    borderColor: Colors.successBorder,
  },
  error: {
    borderColor: Colors.dangerBorder,
  },
  info: {
    borderColor: Colors.primaryBorder,
  },
  warning: {
    borderColor: Colors.warningBorder,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
    color: Colors.text,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  message: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
