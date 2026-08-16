import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_ID_KEY = 'milkbook.notif.daily';
const MONTHLY_ID_KEY = 'milkbook.notif.monthly';

export const DEFAULT_REMINDER_HOUR = 7;
export const DEFAULT_REMINDER_MINUTE = 30;

export type ReminderCopy = {
  dailyTitle: string;
  dailyBody: string;
  monthlyTitle: string;
  monthlyBody: string;
};

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function setupChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#1B3FCB',
    vibrationPattern: [0, 200, 100, 200],
  });
}

async function cancelStored(key: string) {
  const id = await AsyncStorage.getItem(key);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    await AsyncStorage.removeItem(key);
  }
}

/** Morning nudge to record the milk round. */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  copy: Pick<ReminderCopy, 'dailyTitle' | 'dailyBody'>
): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await setupChannel();
  await cancelStored(DAILY_ID_KEY);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: copy.dailyTitle, body: copy.dailyBody, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reminders',
    },
  });
  await AsyncStorage.setItem(DAILY_ID_KEY, id);
  return true;
}

export async function cancelDailyReminder() {
  await cancelStored(DAILY_ID_KEY);
}

/** First of the month: time to send bills. */
export async function scheduleMonthlyReminder(
  copy: Pick<ReminderCopy, 'monthlyTitle' | 'monthlyBody'>
): Promise<boolean> {
  if (!(await ensurePermission())) return false;
  await setupChannel();
  await cancelStored(MONTHLY_ID_KEY);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: copy.monthlyTitle, body: copy.monthlyBody, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 1,
      hour: 9,
      minute: 0,
      channelId: 'reminders',
    },
  });
  await AsyncStorage.setItem(MONTHLY_ID_KEY, id);
  return true;
}

export async function cancelMonthlyReminder() {
  await cancelStored(MONTHLY_ID_KEY);
}

export async function reminderState() {
  const [daily, monthly] = await Promise.all([
    AsyncStorage.getItem(DAILY_ID_KEY),
    AsyncStorage.getItem(MONTHLY_ID_KEY),
  ]);
  return { daily: Boolean(daily), monthly: Boolean(monthly) };
}
