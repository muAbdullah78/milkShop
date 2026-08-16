import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandGradient, Button, NumberField, TextField, Txt, useToast } from '@/components/ui';
import { useAuth } from '@/data/AuthProvider';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { radius, spacing, useColors } from '@/theme';
import { withAlpha } from '@/theme/colors';
import type { Lang } from '@/theme/fonts';

const STEPS = 4;

export default function Onboarding() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const { createShop } = useShop();

  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rate, setRate] = useState(220);
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const next = () => {
    if (step === 1) {
      if (shopName.trim().length < 2) {
        setError(t('err.nameTooShort'));
        return;
      }
      setError(undefined);
    }
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };

  const finish = async () => {
    setSaving(true);
    try {
      await createShop({
        name: shopName.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        defaultMilkRate: rate || 0,
        defaultMilkQty: qty || 1,
      });
      router.replace('/(tabs)');
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl }}>
        <View style={styles.progressRow}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                { backgroundColor: i <= step ? c.primary : c.bgSunken },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.huge }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <StepLanguage lang={lang} onPick={setLang} />
        ) : step === 1 ? (
          <StepShop
            shopName={shopName}
            setShopName={setShopName}
            ownerName={ownerName}
            setOwnerName={setOwnerName}
            phone={phone}
            setPhone={setPhone}
            address={address}
            setAddress={setAddress}
            error={error}
          />
        ) : step === 2 ? (
          <StepRate rate={rate} setRate={setRate} qty={qty} setQty={setQty} />
        ) : (
          <StepReady shopName={shopName} />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: c.bg }]}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {step > 0 ? (
            <Button label={t('common.back')} variant="outline" size="lg" onPress={() => setStep((s) => s - 1)} />
          ) : null}
          <Button
            label={step === STEPS - 1 ? t('onb.start') : t('common.next')}
            size="lg"
            full={step === 0}
            loading={saving}
            onPress={step === STEPS - 1 ? finish : next}
            style={{ flex: 1 }}
            iconRight={step === STEPS - 1 ? 'check' : undefined}
          />
        </View>
        {step === 0 ? (
          <Pressable onPress={() => signOut()} hitSlop={8} style={{ alignSelf: 'center', marginTop: spacing.md }}>
            <Txt variant="caption" muted>
              {t('auth.signOut')}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function StepLanguage({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  const c = useColors();
  const { t } = useI18n();
  const options: { value: Lang; title: string; sub: string; flag: string }[] = [
    { value: 'en', title: 'English', sub: 'Simple, easy English', flag: '🇬🇧' },
    { value: 'ur', title: 'اردو', sub: 'مکمل اردو میں', flag: '🇵🇰' },
  ];
  return (
    <View>
      <Hero icon="translate" title={t('onb.langTitle')} subtitle={t('onb.langSub')} />
      <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
        {options.map((o) => {
          const active = lang === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onPick(o.value)}
              style={[
                styles.langCard,
                {
                  backgroundColor: active ? c.primarySoft : c.card,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Txt variant="display">{o.flag}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle" weight="700" role={o.value === 'ur' ? 'heading' : 'ui'}>
                  {o.title}
                </Txt>
                <Txt variant="caption" muted role={o.value === 'ur' ? 'ui' : 'ui'}>
                  {o.sub}
                </Txt>
              </View>
              <MaterialCommunityIcons
                name={active ? 'check-circle' : 'circle-outline'}
                size={26}
                color={active ? c.primary : c.borderStrong}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepShop(props: {
  shopName: string;
  setShopName: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  error?: string;
}) {
  const { t } = useI18n();
  return (
    <View>
      <Hero icon="storefront-outline" title={t('onb.shopTitle')} subtitle={t('onb.shopSub')} />
      <View style={{ gap: spacing.lg, marginTop: spacing.xxl }}>
        <TextField
          label={t('onb.shopName')}
          value={props.shopName}
          onChangeText={props.setShopName}
          placeholder={t('onb.shopNameHint')}
          icon="storefront-outline"
          autoCapitalize="words"
          required
          error={props.error}
          autoFocus
        />
        <TextField
          label={t('onb.ownerName')}
          value={props.ownerName}
          onChangeText={props.setOwnerName}
          icon="account-outline"
          autoCapitalize="words"
        />
        <TextField
          label={t('onb.shopPhone')}
          value={props.phone}
          onChangeText={props.setPhone}
          placeholder={t('cust.phoneHint')}
          keyboardType="phone-pad"
          icon="whatsapp"
        />
        <TextField
          label={t('onb.shopAddress')}
          value={props.address}
          onChangeText={props.setAddress}
          icon="map-marker-outline"
          multiline
        />
      </View>
    </View>
  );
}

function StepRate({
  rate,
  setRate,
  qty,
  setQty,
}: {
  rate: number;
  setRate: (v: number) => void;
  qty: number;
  setQty: (v: number) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <View>
      <Hero icon="cash-multiple" title={t('onb.rateTitle')} subtitle={t('onb.rateSub')} />
      <View style={{ gap: spacing.lg, marginTop: spacing.xxl }}>
        <NumberField
          label={t('onb.milkRate')}
          value={rate}
          onChangeValue={setRate}
          prefix={lang === 'ur' ? undefined : 'Rs'}
          suffix={lang === 'ur' ? 'روپے' : undefined}
          big
          icon="cup"
        />
        <NumberField
          label={t('set.defaultQty')}
          value={qty}
          onChangeValue={setQty}
          suffix={t('unit.litre')}
          icon="beaker-outline"
        />
      </View>
    </View>
  );
}

function StepReady({ shopName }: { shopName: string }) {
  const c = useColors();
  const { t } = useI18n();
  const bullets = [
    { icon: 'account-group-outline' as const, label: t('nav.customers') },
    { icon: 'truck-delivery-outline' as const, label: t('del.title') },
    { icon: 'shape-outline' as const, label: t('set.categories') },
    { icon: 'receipt' as const, label: t('bill.title') },
    { icon: 'chart-box-outline' as const, label: t('rep.title') },
    { icon: 'cash-minus' as const, label: t('exp.title') },
  ];
  return (
    <View>
      <BrandGradient style={styles.readyHero}>
        <View style={styles.readyIcon}>
          <MaterialCommunityIcons name="party-popper" size={38} color="#FFFFFF" />
        </View>
        <Txt variant="display" weight="800" color="#FFFFFF" align="center" style={{ marginTop: spacing.lg }}>
          {t('onb.readyTitle')}
        </Txt>
        <Txt variant="subtitle" weight="600" color={withAlpha('#FFFFFF', 0.9)} align="center">
          {shopName}
        </Txt>
      </BrandGradient>

      <Txt variant="body" muted align="center" style={{ marginTop: spacing.xl }}>
        {t('onb.readySub')}
      </Txt>

      <View style={styles.bulletGrid}>
        {bullets.map((b) => (
          <View key={b.label} style={[styles.bullet, { backgroundColor: c.card, borderColor: c.border }]}>
            <MaterialCommunityIcons name={b.icon} size={22} color={c.primary} />
            <Txt variant="caption" weight="600" align="center" numberOfLines={2}>
              {b.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

function Hero({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
}) {
  const c = useColors();
  return (
    <View>
      <View style={[styles.heroIcon, { backgroundColor: c.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={30} color={c.primary} />
      </View>
      <Txt variant="display" weight="700" style={{ marginTop: spacing.lg }}>
        {title}
      </Txt>
      <Txt variant="body" muted style={{ marginTop: spacing.xs }}>
        {subtitle}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  heroIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  readyHero: { padding: spacing.xxl, alignItems: 'center' },
  readyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  bullet: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
