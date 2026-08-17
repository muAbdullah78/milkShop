import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_ID_KEY = 'milkbook.notif.daily';
const MONTHLY_ID_KEY = 'milkbook.notif.monthly';
const RENEWAL_IDS_KEY = 'milkbook.notif.renewal';

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

/**
 * Renewal nudges before the subscription lapses.
 *
 * Scheduled locally, at fixed points in time rather than on a repeat, because
 * each one says something different ("7 days left", "renews tomorrow"). The
 * previous set is always cleared first, so an early renewal does not leave
 * yesterday's "1 day left" sitting in the queue ready to alarm someone who
 * has already paid.
 *
 * Silently does nothing if notification permission was refused. A missing
 * reminder is a small annoyance; a permission prompt fired at a shopkeeper
 * mid-delivery is worse.
 */
export async function scheduleRenewalReminders(
  points: { at: number; daysLeft: number }[],
  copy?: { title: (daysLeft: number) => string; body: (daysLeft: number) => string }
): Promise<boolean> {
  await cancelRenewalReminders();
  if (points.length === 0) return true;

  const granted = await Notifications.getPermissionsAsync();
  if (!granted.granted) return false;
  await setupChannel();

  const title = copy?.title ?? ((d: number) => (d === 0 ? 'Subscription ended' : 'MilkBook'));
  const body =
    copy?.body ??
    ((d: number) =>
      d === 0
        ? 'Your subscription has ended. Renew to keep using the app.'
        : `${d} day${d === 1 ? '' : 's'} left on your subscription.`);

  const ids: string[] = [];
  for (const p of points) {
    // eslint-disable-next-line no-await-in-loop
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: title(p.daysLeft), body: body(p.daysLeft), sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(p.at),
        channelId: 'reminders',
      },
    }).catch(() => null);
    if (id) ids.push(id);
  }

  await AsyncStorage.setItem(RENEWAL_IDS_KEY, JSON.stringify(ids));
  return true;
}

export async function cancelRenewalReminders() {
  const raw = await AsyncStorage.getItem(RENEWAL_IDS_KEY);
  if (!raw) return;
  try {
    const ids = JSON.parse(raw) as string[];
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  } catch {
    /* nothing to undo */
  }
  await AsyncStorage.removeItem(RENEWAL_IDS_KEY);
}

export async function reminderState() {
  const [daily, monthly] = await Promise.all([
    AsyncStorage.getItem(DAILY_ID_KEY),
    AsyncStorage.getItem(MONTHLY_ID_KEY),
  ]);
  return { daily: Boolean(daily), monthly: Boolean(monthly) };
}
