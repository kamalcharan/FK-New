// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Shield, Plus, Handshake, Settings } from 'lucide-react-native';
import { Colors } from '../../src/constants/theme';

type TabIconProps = {
  icon: React.ReactNode;
  iconActive: React.ReactNode;
  label: string;
  focused: boolean;
};

function TabBarIcon({ icon, iconActive, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.activeIndicator} />}
      <View style={styles.iconContainer}>
        {focused ? iconActive : icon}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AddButton() {
  return (
    <View style={styles.addButtonContainer}>
      <View style={styles.addButton}>
        <Plus size={28} color="#000" strokeWidth={1.5} />
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
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              icon={<Home size={22} color={Colors.textMuted} strokeWidth={1.5} />}
              iconActive={<Home size={22} color={Colors.text} strokeWidth={2} />}
              label="Home"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              icon={<Shield size={22} color={Colors.textMuted} strokeWidth={1.5} />}
              iconActive={<Shield size={22} color={Colors.text} strokeWidth={2} />}
              label="Vault"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: () => <AddButton />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              icon={<Handshake size={22} color={Colors.textMuted} strokeWidth={1.5} />}
              iconActive={<Handshake size={22} color={Colors.text} strokeWidth={2} />}
              label="Loans"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              icon={<Settings size={22} color={Colors.textMuted} strokeWidth={1.5} />}
              iconActive={<Settings size={22} color={Colors.text} strokeWidth={2} />}
              label="Settings"
              focused={focused}
            />
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
    left: 20,
    right: 20,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 36,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    paddingHorizontal: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    minWidth: 56,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
    marginTop: 4,
  },
  tabLabelActive: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});