import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu/400Regular';
import { NotoNastaliqUrdu_600SemiBold } from '@expo-google-fonts/noto-nastaliq-urdu/600SemiBold';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

/**
 * The print WebView has no access to the app's loaded fonts, so an Urdu PDF
 * would fall back to the system Arabic face and lose the Nastaliq look.
 * We inline the real font as a data URI instead. It costs ~0.9 MB of string
 * once per app run, so the result is cached.
 */
let cached: string | null | undefined;

async function fontToDataUri(mod: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return null;
    const base64 = await new File(uri).base64();
    return `data:font/ttf;base64,${base64}`;
  } catch {
    return null;
  }
}

/** `@font-face` CSS for Urdu bills, or '' if the font could not be read. */
export async function urduFontCss(): Promise<string> {
  if (cached !== undefined) return cached ?? '';

  const [regular, bold] = await Promise.all([
    fontToDataUri(NotoNastaliqUrdu_400Regular),
    fontToDataUri(NotoNastaliqUrdu_600SemiBold),
  ]);

  if (!regular) {
    cached = null;
    return '';
  }

  cached = `
    @font-face {
      font-family: 'MB Nastaliq';
      font-weight: 400;
      src: url('${regular}') format('truetype');
    }
    @font-face {
      font-family: 'MB Nastaliq';
      font-weight: 700;
      src: url('${bold ?? regular}') format('truetype');
    }
  `;
  return cached;
}

export function resetUrduFontCache() {
  cached = undefined;
}
