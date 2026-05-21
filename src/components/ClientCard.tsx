import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Client } from '../types';
import { Colors, Fonts, FontSizes, Shadows, Radius, Spacing } from '../theme';

interface ClientCardProps {
  client: Client;
  onPress: (client: Client) => void;
}

export default function ClientCard({ client, onPress }: ClientCardProps) {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={() => onPress(client)}>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          {client.profileImage ? (
            <Image source={{ uri: client.profileImage }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.statusDot} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone" size={12} color={Colors.textMuted} />
            <Text style={styles.detailText}>{client.phone}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>{client.city}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rightAction}>
        <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  detailText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  rightAction: {
    marginLeft: Spacing.sm,
  },
});
