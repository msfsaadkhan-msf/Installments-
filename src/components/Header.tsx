import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightPress?: () => void;
}

export default function Header({ title, showBack = false, rightIcon, onRightPress }: HeaderProps) {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => (showBack ? navigation.goBack() : navigation.openDrawer())}
        >
          <MaterialCommunityIcons
            name={showBack ? 'arrow-left' : 'menu'}
            size={24}
            color={Colors.accent}
          />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.iconButton}>
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress}>
              <MaterialCommunityIcons name={rightIcon} size={24} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)', // Soft gold border
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
