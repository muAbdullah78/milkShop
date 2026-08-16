import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader, Card, Screen, SwitchRow, Txt } from '@/components/ui';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import type { Lang } from '@/theme/fonts';

export default function LanguageSettings() {
  const c = useColors();
  const { t, lang, setLang, urduDigits, setUrduDigits, money, qty } = useI18n();

  const options: { value: Lang; title: string; sub: string; sample: string }[] = [
    {
      value: 'en',
      title: 'English',
      sub: 'Simple, easy English',
      sample: 'Ahmad Ali — 2 L milk today',
    },
    {
      value: 'ur',
      title: 'اردو',
      sub: 'نستعلیق سرخیاں، صاف نسخ متن',
      sample: 'احمد علی — آج 2 لیٹر دودھ',
    },
  ];

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.language')} subtitle={t('set.languageSub')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {options.map((o) => {
          const active = lang === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setLang(o.value)}
              style={[
                styles.card,
                { backgroundColor: active ? c.primarySoft : c.card, borderColor: active ? c.primary : c.border },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle" weight="700" role={o.value === 'ur' ? 'heading' : 'ui'}>
                    {o.title}
                  </Txt>
                  <Txt variant="caption" muted>
                    {o.sub}
                  </Txt>
                </View>
                <MaterialCommunityIcons
                  name={active ? 'check-circle' : 'circle-outline'}
                  size={26}
                  color={active ? c.primary : c.borderStrong}
                />
              </View>
              <View style={[styles.sample, { backgroundColor: c.cardAlt }]}>
                <Txt variant="body" weight="600" role={o.value === 'ur' ? 'heading' : 'ui'}>
                  {o.sample}
                </Txt>
              </View>
            </Pressable>
          );
        })}

        {lang === 'ur' ? (
          <Card>
            <SwitchRow
              label={t('set.urduNumerals')}
              sublabel={t('set.urduNumeralsSub')}
              value={urduDigits}
              onValueChange={setUrduDigits}
              icon="numeric"
              iconColor={c.accent}
            />
            <View style={[styles.sample, { backgroundColor: c.cardAlt, marginTop: spacing.sm }]}>
              <Txt variant="amount" weight="700" role="numeric">
                {money(1250)} · {qty(2.5)} {t('unit.litre.short')}
              </Txt>
            </View>
          </Card>
        ) : null}

        <View style={[styles.note, { backgroundColor: c.infoSoft }]}>
          <MaterialCommunityIcons name="information-outline" size={19} color={c.info} />
          <Txt variant="caption" color={c.info} style={{ flex: 1 }}>
            {lang === 'ur'
              ? 'زبان بدلنے پر ایپ خود کو دوبارہ ترتیب دے گی تاکہ صفحہ دائیں سے بائیں درست دکھے۔'
              : 'Switching language reloads the app once so the layout flips correctly.'}
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 2, gap: spacing.md },
  sample: { padding: spacing.md, borderRadius: radius.md },
  note: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.md },
});
