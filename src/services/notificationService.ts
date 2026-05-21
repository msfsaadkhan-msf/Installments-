import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getNotificationSettings } from './storage';

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // Add these for newer notification behavior types
  } as any),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  return finalStatus === 'granted';
}

export async function sendImmediatePaymentNotification(clientName: string, amount: string) {
  const settings = await getNotificationSettings();
  if (!settings.realTime) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Payment Received! 💰",
      body: `Successfully collected ${amount} from ${clientName}.`,
      data: { type: 'payment' },
    },
    trigger: null, // Send immediately
  });
}

export async function scheduleOverdueCheckNotification(count: number) {
  const settings = await getNotificationSettings();
  if (!settings.dailyOverdue || count === 0) return;

  // Clear existing overdue notifications to avoid duplicates
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'overdue') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Overdue Installments Alert ⚠️",
      body: `You have ${count} installments currently overdue. Please check and follow up.`,
      data: { type: 'overdue' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2, 
    },
  });
}
