import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, Card, Screen, SwitchRow, Txt, useToast } from '@/components/ui';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  cancelDailyReminder,
  cancelMonthlyReminder,
  reminderState,
  scheduleDailyReminder,
  scheduleMonthlyReminder,
} from '@/lib/notifications';
import { radius, spacing, useColors } from '@/theme';

export default function ReminderSettings() {
  const c = useColors();
  const toast = useToast();
  const { t, lang, digits } = useI18n();
  const { shop } = useShop();

  const [daily, setDaily] = useState(false);
  const [monthly, setMonthly] = useState(false);
  const [hour, setHour] = useState(DEFAULT_REMINDER_HOUR);
  const [minute, setMinute] = useState(DEFAULT_REMINDER_MINUTE);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    reminderState()
      .then((s) => {
        setDaily(s.daily);
        setMonthly(s.monthly);
      })
      .catch(() => undefined);
  }, []);

  const copy = {
    dailyTitle: lang === 'ur' ? 'دودھ راؤنڈ' : 'Milk round',
    dailyBody:
      lang === 'ur'
        ? `${shop?.name ?? 'ملک بک'} — آج کا دودھ لکھنا نہ بھولیں۔`
        : `${shop?.name ?? 'MilkBook'} — don't forget to mark today's milk.`,
    monthlyTitle: lang === 'ur' ? 'بل بھیجنے کا وقت' : 'Time to send bills',
    monthlyBody:
      lang === 'ur'
        ? 'پچھلے مہینے کے بل واٹس ایپ پر بھیج دیں۔'
        : "Send last month's bills on WhatsApp.",
  };

  const toggleDaily = async (on: boolean, h = hour, m = minute) => {
    if (!on) {
      await cancelDailyReminder();
      setDaily(false);
      return;
    }
    const ok = await scheduleDailyReminder(h, m, copy);
    if (!ok) {
      toast.error(t('err.permission'));
      return;
    }
    setDaily(true);
    toast.success(t('ok.saved'));
  };

  const toggleMonthly = async (on: boolean) => {
    if (!on) {
      await cancelMonthlyReminder();
      setMonthly(false);
      return;
    }
    const ok = await scheduleMonthlyReminder(copy);
    if (!ok) {
      toast.error(t('err.permission'));
      return;
    }
    setMonthly(true);
    toast.success(t('ok.saved'));
  };

  const timeLabel = `${digits(String(hour).padStart(2, '0'))}:${digits(String(minute).padStart(2, '0'))}`;

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.reminders')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={{ gap: spacing.md }}>
          <SwitchRow
            label={t('set.reminderDaily')}
            sublabel={t('set.reminderDailySub')}
            value={daily}
            onValueChange={(v) => toggleDaily(v)}
            icon="bell-ring-outline"
            iconColor={c.primary}
          />
          {daily ? (
            <Pressable
              onPress={() => setPicking(true)}
              style={[styles.timeRow, { backgroundColor: c.cardAlt, borderColor: c.border }]}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Txt variant="micro" muted>
                  {t('set.reminderTime')}
                </Txt>
                <Txt variant="amount" weight="700" role="numeric">
                  {timeLabel}
                </Txt>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={c.textFaint} />
            </Pressable>
          ) : null}
        </Card>

        <Card>
          <SwitchRow
            label={t('set.reminderMonthly')}
            sublabel={t('set.reminderMonthlySub')}
            value={monthly}
            onValueChange={toggleMonthly}
            icon="calendar-clock"
            iconColor="#7C3AED"
          />
        </Card>

        <View style={[styles.note, { backgroundColor: c.infoSoft }]}>
          <MaterialCommunityIcons name="information-outline" size={19} color={c.info} />
          <Txt variant="caption" color={c.info} style={{ flex: 1 }}>
            {lang === 'ur'
              ? 'یاد دہانیاں آپ کے فون پر ہی چلتی ہیں — انٹرنیٹ کی ضرورت نہیں۔'
              : 'Reminders run on your phone — no internet needed.'}
          </Txt>
        </View>
      </ScrollView>

      {picking ? (
        <DateTimePicker
          value={new Date(2020, 0, 1, hour, minute)}
          mode="time"
          is24Hour={false}
          onChange={(event, date) => {
            setPicking(false);
            if (event.type === 'set' && date) {
              setHour(date.getHours());
              setMinute(date.getMinutes());
              toggleDaily(true, date.getHours(), date.getMinutes());
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  note: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
});
