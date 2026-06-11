import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

const MAIN_FOLDER = 'IMS by MSF';

/**
 * Initializes the storage system by requesting permissions and 
 * creating the root folder structure.
 */
export async function initializeStorage() {
  try {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    // Try requesting media library permissions, but catch errors if manifest is incomplete
    let mediaStatus = 'denied';
    try {
      const response = await MediaLibrary.requestPermissionsAsync();
      mediaStatus = response.status;
    } catch (err) {
      console.warn('Failed to request MediaLibrary permissions (likely missing manifest entries):', err);
    }
    
    if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
      console.warn('Storage or Camera permissions not fully granted. Basic functionality may still work.');
    }

    const baseDir = `${FileSystem.documentDirectory}${MAIN_FOLDER}/`;
    const info = await FileSystem.getInfoAsync(baseDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      console.log('IMS Folder structure initialized at:', baseDir);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    return false;
  }
}

async function ensureDirectoryExists(clientName: string, subDir: 'Client' | 'Guarantors') {
  const sanitizedName = clientName.replace(/[^a-z0-9]/gi, '_').trim();
  const baseDir = `${FileSystem.documentDirectory}${MAIN_FOLDER}/`;
  const clientDir = `${baseDir}${sanitizedName}/`;
  const targetDir = `${clientDir}${subDir}/`;

  try {
    const info = await FileSystem.getInfoAsync(baseDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
    }

    const clientInfo = await FileSystem.getInfoAsync(clientDir);
    if (!clientInfo.exists) {
      await FileSystem.makeDirectoryAsync(clientDir, { intermediates: true });
    }

    const targetInfo = await FileSystem.getInfoAsync(targetDir);
    if (!targetInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    return targetDir;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
}

/**
 * Shows an alert to choose between Camera and Library
 */
export async function pickOrCaptureImage(type: 'profile' | 'document'): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image Source',
      'Choose how you want to add the image',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera access is required to take photos');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: type === 'profile',
              aspect: type === 'profile' ? [1, 1] : undefined,
              quality: 0.7,
            });
            if (!result.canceled) resolve(result.assets[0].uri);
            else resolve(null);
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Gallery access is required to pick photos');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: type === 'profile',
              aspect: type === 'profile' ? [1, 1] : undefined,
              quality: 0.7,
            });
            if (!result.canceled) resolve(result.assets[0].uri);
            else resolve(null);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null)
        }
      ]
    );
  });
}

/**
 * Saves a temporary image URI to the organized folder
 */
export async function saveOrganizedImage(
  tempUri: string, 
  clientName: string, 
  subDir: 'Client' | 'Guarantors',
  fileName: string
): Promise<string> {
  try {
    const targetDir = await ensureDirectoryExists(clientName, subDir);
    const extension = tempUri.split('.').pop() || 'jpg';
    const finalPath = `${targetDir}${fileName}_${Date.now()}.${extension}`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: finalPath,
    });

    return finalPath;
  } catch (error) {
    console.error('Error saving organized image:', error);
    throw error;
  }
}
