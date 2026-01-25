// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Typography } from '../../src/constants/theme';

function TabBarIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      {focused ? <View style={styles.activeIndicator} /> : null}
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>{label}</Text>
    </View>
  );
}

function AddButton() {
  return (
    <View style={styles.addButtonContainer}>
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🔍" label="Vault" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: () => <AddButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            // TODO: Open add modal
          },
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="🤝" label="Loans" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 40,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
  },
  tabLabelActive: {
    color: Colors.text,
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  addButtonText: {
    fontSize: 28,
    color: '#000',
    fontWeight: '300',
  },
});
