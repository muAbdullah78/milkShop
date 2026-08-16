import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DateRow,
  FooterBar,
  NumberField,
  Screen,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { useExpenseCategories, useExpensesForMonth } from '@/data/hooks';
import { expenseRepo } from '@/data/repo';
import { useShopId } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { monthKeyOf, todayKey } from '@/lib/dates';
import { spacing, useColors } from '@/theme';

export default function ExpenseEdit() {
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const shopId = useShopId();
  const { t, lang, money } = useI18n();
  const { id, date: dateParam } = useLocalSearchParams<{ id?: string; date?: string }>();

  // `date` also picks which month we search for the record being edited.
  const [date, setDate] = useState(dateParam || todayKey());
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: categories } = useExpenseCategories();
  // The list passes the record's own date so an expense from an older month
  // is still found here.
  const { data: monthExpenses } = useExpensesForMonth(monthKeyOf(date));
  const existing = useMemo(() => monthExpenses.find((e) => e.id === id), [monthExpenses, id]);

  useEffect(() => {
    if (hydrated) return;
    if (existing) {
      setDate(existing.date);
      setTitle(existing.title);
      setAmount(existing.amount);
      setCategoryId(existing.categoryId);
      setNote(existing.note ?? '');
      setHydrated(true);
    } else if (!id && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [existing, id, categories, categoryId, hydrated]);

  const category = categories.find((x) => x.id === categoryId);

  const save = async () => {
    if (!shopId || amount <= 0 || !category) return;
    setSaving(true);
    try {
      const payload = {
        date,
        categoryId: category.id,
        categoryName: category.name,
        title: title.trim() || category.name,
        amount,
        note: note.trim() || undefined,
      };
      if (existing) await expenseRepo.update(shopId, existing.id, payload);
      else await expenseRepo.create(shopId, payload);
      toast.success(t('exp.saved'));
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
      await expenseRepo.remove(shopId, existing.id);
      toast.success(t('ok.deleted'));
      router.back();
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
        title={existing ? t('exp.edit') : t('exp.add')}
        back
        actions={
          existing
            ? [{ icon: 'trash-can-outline', onPress: () => setConfirmDelete(true), tint: c.danger }]
            : undefined
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ gap: spacing.lg }}>
            <NumberField
              label={t('exp.amount')}
              value={amount}
              onChangeValue={setAmount}
              prefix={lang === 'ur' ? undefined : 'Rs'}
              suffix={lang === 'ur' ? 'روپے' : undefined}
              big
              autoFocus
              icon="cash-minus"
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[200, 500, 1000, 5000].map((v) => (
                <Chip key={v} label={money(v)} active={amount === v} onPress={() => setAmount(v)} />
              ))}
            </View>
          </Card>

          <Card style={{ gap: spacing.md }}>
            <Txt variant="label" weight="600" muted>
              {t('exp.category')}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categories.map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  icon={cat.icon as never}
                  color={cat.color}
                  active={categoryId === cat.id}
                  onPress={() => setCategoryId(cat.id)}
                />
              ))}
            </View>
          </Card>

          <Card style={{ gap: spacing.lg }}>
            <TextField
              label={t('exp.what')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('exp.whatHint')}
              icon="text-short"
            />
            <DateRow label={t('common.date')} value={date} onChange={setDate} />
            <TextField label={t('common.note')} value={note} onChangeText={setNote} multiline icon="note-outline" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Button
          label={t('common.save')}
          icon="check"
          size="lg"
          full
          disabled={amount <= 0 || !category}
          loading={saving}
          onPress={save}
        />
      </FooterBar>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('exp.deleteQ')}
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
