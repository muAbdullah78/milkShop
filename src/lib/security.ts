import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'milkbook.pin.hash';
const PIN_SALT_KEY = 'milkbook.pin.salt';
const PIN_ENABLED_KEY = 'milkbook.pin.enabled';

/**
 * The PIN protects the khata from someone picking the phone up off the
 * counter — it is not a secret-keeping mechanism, so a salted SHA-256 in the
 * device keystore is the right weight. The data itself is protected by the
 * Firebase account.
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function isPinEnabled(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(PIN_ENABLED_KEY);
  return flag === '1';
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_KEY, hash);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '1');
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, stored] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_KEY),
  ]);
  if (!salt || !stored) return false;
  const hash = await hashPin(pin, salt);
  return hash === stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY).catch(() => undefined);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY).catch(() => undefined);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, '0');
}
