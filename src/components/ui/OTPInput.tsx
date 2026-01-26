// src/components/ui/OTPInput.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
  Keyboard,
} from 'react-native';
import { Colors, Typography, BorderRadius } from '../../constants/theme';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
  };

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const digits = value.split('');

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.boxContainer}>
        {Array.from({ length }).map((_, index) => {
          const isCurrentIndex = index === value.length;
          const isFilled = index < value.length;

          return (
            <View
              key={index}
              style={[
                styles.box,
                isFilled ? styles.boxFilled : null,
                isCurrentIndex && isFocused ? styles.boxFocused : null,
                error ? styles.boxError : null,
              ]}
            >
              <Text style={styles.digit}>{digits[index] || ''}</Text>
              {isCurrentIndex && isFocused ? (
                <View style={styles.cursor} />
              ) : null}
            </View>
          );
        })}
      </Pressable>

      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  boxContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(136, 160, 150, 0.1)',
  },
  boxFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  boxError: {
    borderColor: Colors.danger,
  },
  digit: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: Colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  error: {
    ...Typography.bodySm,
    color: Colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
});
