// app/(auth)/onboarding.tsx
import { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import { router } from 'expo-router';
import { EmergencySlide, StorySlide, BrandSlide } from '../../src/components/onboarding';
import { ONBOARDING_SLIDES } from '../../src/constants/onboarding';
import { Colors } from '../../src/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      router.push('/(auth)/sign-in');
    }
  };

  const handleGetStarted = () => {
    router.push('/(auth)/sign-in');
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item, index }: { item: typeof ONBOARDING_SLIDES[0]; index: number }) => {
    if (item.type === 'emergency') {
      return (
        <View style={styles.slide}>
          <EmergencySlide onContinue={handleNext} />
        </View>
      );
    }

    if (item.type === 'story') {
      return (
        <View style={styles.slide}>
          <StorySlide
            badge={item.badge || ''}
            badgeColor={item.badgeColor || Colors.textMuted}
            title={item.title}
            subtitle={item.subtitle}
            buttonText={item.buttonText || 'Next'}
            onNext={handleNext}
          />
        </View>
      );
    }

    if (item.type === 'brand') {
      return (
        <View style={styles.slide}>
          <BrandSlide onGetStarted={handleGetStarted} />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});