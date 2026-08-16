import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  ConfirmDialog,
  FooterBar,
  Screen,
  TextField,
  useToast,
} from '@/components/ui';
import { useSuppliers } from '@/data/hooks';
import { supplierRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { spacing, useColors } from '@/theme';

export default function SupplierEdit() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: suppliers } = useSuppliers();
  const existing = suppliers.find((s) => s.id === id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? '');
    setAddress(existing.address ?? '');
    setNotes(existing.notes ?? '');
    setHydrated(true);
  }, [existing, hydrated]);

  const save = async () => {
    if (!shopId || name.trim().length < 2) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (existing) await supplierRepo.update(shopId, existing.id, payload);
      else await supplierRepo.create(shopId, payload);
      toast.success(t('ok.saved'));
      router.back();
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!shopId || !existing) return;
    setSaving(true);
    try {
      await supplierRepo.remove(shopId, existing.id);
      toast.success(t('ok.deleted'));
      router.dismissAll();
      router.replace('/suppliers');
    } catch {
      toast.error(t('err.saveFailed'));
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader
        title={existing ? t('sup.edit') : t('sup.add')}
        back
        actions={
          existing
            ? [{ icon: 'trash-can-outline', onPress: () => setConfirmDelete(true), tint: c.danger }]
            : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={t('sup.name')}
              value={name}
              onChangeText={setName}
              placeholder={t('sup.nameHint')}
              icon="truck-delivery-outline"
              autoCapitalize="words"
              required
              autoFocus={!id}
            />
            <TextField
              label={t('common.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('cust.phoneHint')}
              keyboardType="phone-pad"
              icon="phone-outline"
            />
            <TextField
              label={t('common.address')}
              value={address}
              onChangeText={setAddress}
              icon="map-marker-outline"
            />
            <TextField
              label={t('common.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              icon="note-outline"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.save')}
          icon="check"
          size="lg"
          full
          disabled={name.trim().length < 2}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('sup.deleteQ', { name: existing?.name ?? '' })}
        message={t('common.deleteWarn')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={saving}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}
