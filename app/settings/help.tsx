import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDoc, collection, serverTimestamp } from '@react-native-firebase/firestore';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  AppHeader,
  Button,
  Card,
  ListCard,
  ListRow,
  Screen,
  TextField,
  Txt,
  useToast,
} from '@/components/ui';
import { brand, brandUrls } from '@/config/brand';
import { useAuth } from '@/data/AuthProvider';
import { useShop } from '@/data/ShopProvider';
import { useI18n } from '@/i18n';
import { db } from '@/lib/firebase';
import { spacing, useColors } from '@/theme';

/**
 * In-app support.
 *
 * Most shopkeepers here have never set up email on their phone, so a mailto:
 * link is not a real support channel for them. This writes straight into the
 * admin console's inbox and only needs them to type.
 *
 * The ticket carries the shop id and phone so support can find the shop and
 * reply on WhatsApp. It carries no khaata data.
 */
export default function HelpScreen() {
  const c = useColors();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { shop, shopId } = useShop();
  const { user } = useAuth();

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t('legal.openFailed'));
    }
  };

  const send = async () => {
    const body = message.trim();
    if (body.length < 5) {
      toast.error(t('help.tooShort'));
      return;
    }
    if (!user) {
      toast.error(t('err.somethingWrong'));
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db(), 'supportTickets'), {
        // The rules require this to equal the caller's uid.
        uid: user.uid,
        shopId: shopId ?? '',
        shopName: shop?.name ?? '',
        phone: shop?.phone ?? '',
        message: body,
        lang,
        appVersion: '1.0.0',
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setMessage('');
      setSent(true);
      toast.success(t('help.sent'));
    } catch {
      toast.error(t('help.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen padded={false} edges={['top']}>
      <AppHeader title={t('help.title')} back />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <MaterialCommunityIcons name="message-text-outline" size={22} color={c.primary} />
            <Txt variant="subtitle" weight="700" style={{ flex: 1 }}>
              {t('help.writeTitle')}
            </Txt>
          </View>
          <Txt variant="caption" muted>
            {t('help.writeSub')}
          </Txt>

          <TextField
            value={message}
            onChangeText={(v) => {
              setMessage(v);
              setSent(false);
            }}
            placeholder={t('help.placeholder')}
            multiline
            maxLength={1000}
          />

          <Button
            label={sending ? t('help.sending') : t('help.send')}
            icon="send"
            onPress={send}
            loading={sending}
            disabled={message.trim().length < 5}
            full
          />

          {sent ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <MaterialCommunityIcons name="check-circle" size={18} color={c.success} />
              <Txt variant="caption" style={{ color: c.success, flex: 1 }}>
                {t('help.sentLong')}
              </Txt>
            </View>
          ) : null}
        </Card>

        <ListCard>
          <ListRow
            title={t('help.faq')}
            subtitle={t('help.faqSub')}
            icon="help-circle-outline"
            iconColor={c.info}
            onPress={() => open(brandUrls.faq)}
          />
          <ListRow
            title={t('help.email')}
            subtitle={brand.supportEmail}
            icon="email-outline"
            iconColor={c.accent}
            onPress={() => open(`mailto:${brand.supportEmail}`)}
          />
        </ListCard>

        <Txt variant="micro" faint align="center">
          {t('help.privacyNote')}
        </Txt>
      </ScrollView>
    </Screen>
  );
}
