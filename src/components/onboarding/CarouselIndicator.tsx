import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

interface CarouselIndicatorProps {
  total: number;
  currentIndex: number;
}

interface DotProps {
  index: number;
  currentIndex: number;
}

function Dot({ index, currentIndex }: DotProps) {
  const isActive = index === currentIndex;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(isActive ? 24 : 8, { damping: 15, stiffness: 200 }),
      backgroundColor: withSpring(
        isActive ? Colors.primary : 'rgba(255, 255, 255, 0.2)',
        { damping: 15, stiffness: 200 }
      ),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function CarouselIndicator({ total, currentIndex }: CarouselIndicatorProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot key={index} index={index} currentIndex={currentIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 10,
  },
});
