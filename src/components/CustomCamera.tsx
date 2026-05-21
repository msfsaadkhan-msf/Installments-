import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, Radius } from '../theme';

const { width, height } = Dimensions.get('window');

interface Props {
  overlayType: 'cnic' | 'avatar';
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export default function CustomCamera({ overlayType, onCapture, onClose }: Props) {
  const [facing, setFacing] = useState<'front' | 'back'>(overlayType === 'avatar' ? 'front' : 'back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={30} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: false,
        });
        if (photo) {
          onCapture(photo.uri);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <SafeAreaView style={styles.overlayContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <MaterialCommunityIcons name="close" size={28} color={Colors.surface} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {overlayType === 'cnic' ? 'Capture CNIC' : 'Capture Profile'}
            </Text>
            <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
              <MaterialCommunityIcons name="camera-flip-outline" size={28} color={Colors.surface} />
            </TouchableOpacity>
          </View>

          {/* Overlay UI */}
          <View style={styles.content}>
            {overlayType === 'cnic' ? (
              <View style={styles.cnicOverlay}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <Text style={styles.hintText}>Align CNIC within the corners</Text>
              </View>
            ) : (
              <View style={styles.avatarOverlay}>
                <View style={styles.avatarCircle} />
                <View style={styles.avatarShoulders} />
                <Text style={styles.hintText}>Position face inside the circle</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerTitle: {
    color: Colors.surface,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: Spacing.xl,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.accent,
  },
  hintText: {
    color: Colors.accent,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  // CNIC Specific
  cnicOverlay: {
    width: width * 0.85,
    height: width * 0.85 * 0.63, // ID card aspect ratio
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  // Avatar Specific
  avatarOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    borderWidth: 3,
    borderColor: Colors.accent,
    marginBottom: -20,
  },
  avatarShoulders: {
    width: width * 0.8,
    height: 100,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.accent,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  permissionText: {
    color: Colors.surface,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    marginBottom: Spacing.lg,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  permissionButtonText: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
  }
});
