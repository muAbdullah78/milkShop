import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  FooterBar,
  NumberField,
  Screen,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { spacing } from '@/theme';

export default function ShopSettings() {
  const router = useRouter();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { shop, updateShop } = useShop();

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rate, setRate] = useState(0);
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !shop) return;
    setName(shop.name);
    setOwnerName(shop.ownerName ?? '');
    setPhone(shop.phone ?? '');
    setAddress(shop.address ?? '');
    setRate(shop.defaultMilkRate);
    setQty(shop.defaultMilkQty || 1);
    setHydrated(true);
  }, [shop, hydrated]);

  const save = async () => {
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await updateShop({
        name: name.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        defaultMilkRate: rate,
        defaultMilkQty: qty,
      });
      toast.success(t('ok.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('set.shop')} subtitle={t('set.shopSub')} back />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={t('onb.shopName')}
              value={name}
              onChangeText={setName}
              placeholder={t('onb.shopNameHint')}
              icon="storefront-outline"
              autoCapitalize="words"
              required
            />
            <TextField
              label={t('onb.ownerName')}
              value={ownerName}
              onChangeText={setOwnerName}
              icon="account-outline"
              autoCapitalize="words"
            />
            <TextField
              label={t('onb.shopPhone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('cust.phoneHint')}
              keyboardType="phone-pad"
              icon="whatsapp"
              hint={t('set.shopSub')}
            />
            <TextField
              label={t('onb.shopAddress')}
              value={address}
              onChangeText={setAddress}
              icon="map-marker-outline"
              multiline
            />
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <Txt variant="subtitle" weight="700">
              {t('set.defaults')}
            </Txt>
            <NumberField
              label={t('set.defaultRate')}
              value={rate}
              onChangeValue={setRate}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              icon="cash"
            />
            <NumberField
              label={t('set.defaultQty')}
              value={qty}
              onChangeValue={setQty}
              suffix={t('unit.litre')}
              icon="beaker-outline"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.saveChanges')}
          icon="check"
          size="lg"
          full
          disabled={name.trim().length < 2}
          loading={saving}
          onPress={save}
        />
      </FooterBar>
    </Screen>
  );
}
