import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'ur';

/**
 * The marketing pages are bilingual because the people who install this app
 * read Urdu. The legal pages stay English-only and say so — a translated
 * privacy policy that drifts from the original creates a legal ambiguity that
 * helps nobody, and Google reads the English one.
 */
const strings = {
  'nav.features': ['Features', 'خصوصیات'],
  'nav.how': ['How it works', 'کیسے کام کرتا ہے'],
  'nav.pricing': ['Price', 'قیمت'],
  'nav.faq': ['FAQ', 'سوالات'],
  'nav.support': ['Support', 'مدد'],
  'nav.download': ['Get the app', 'ایپ حاصل کریں'],

  'hero.badge': ['Free · English & Urdu', 'مفت · انگریزی اور اردو'],
  'hero.title': ['Your whole milk shop, in your pocket', 'آپ کی پوری دودھ کی دکان، آپ کی جیب میں'],
  'hero.sub': [
    'Replace the paper khaata. Track the daily milk round, every customer’s udhaar, eggs and other items, and send monthly bills on WhatsApp — with no internet needed while you work.',
    'کاغذی کھاتہ چھوڑ دیں۔ روزانہ کا دودھ راؤنڈ، ہر گاہک کا ادھار، انڈے اور دیگر چیزیں سنبھالیں، اور ماہانہ بل واٹس ایپ پر بھیجیں — کام کے دوران انٹرنیٹ کی ضرورت نہیں۔',
  ],
  'hero.cta': ['Download for Android', 'اینڈرائیڈ کے لیے ڈاؤن لوڈ کریں'],
  'hero.cta2': ['See what it does', 'دیکھیں یہ کیا کرتا ہے'],
  'hero.note': ['Free. No ads. Your data stays yours.', 'مفت۔ کوئی اشتہار نہیں۔ آپ کا ڈیٹا آپ کا ہے۔'],

  'feat.title': ['Everything a milk shop actually needs', 'وہ سب کچھ جو دودھ کی دکان کو واقعی چاہیے'],
  'feat.sub': [
    'Built by watching how these shops really run — not by copying an accounting package.',
    'یہ دیکھ کر بنایا گیا کہ یہ دکانیں اصل میں کیسے چلتی ہیں۔',
  ],

  'feat.khaata.t': ['Khaata (کھاتہ)', 'کھاتہ'],
  'feat.khaata.d': [
    'Open a khaata for a customer, then write down everything they take — with the time. They pay in full or in part, whenever they like, and the balance always adds up.',
    'گاہک کا کھاتہ کھولیں، پھر جو کچھ وہ لیں وقت کے ساتھ لکھتے جائیں۔ وہ پورا یا کچھ حصہ، جب چاہیں ادا کریں — حساب ہمیشہ درست رہتا ہے۔',
  ],
  'feat.round.t': ['One-tap milk round', 'ایک ٹچ میں دودھ راؤنڈ'],
  'feat.round.d': [
    'Every customer has a usual quantity. One big button marks the whole round delivered — you only touch the exceptions.',
    'ہر گاہک کی ایک عام مقدار ہوتی ہے۔ ایک بڑا بٹن پورا راؤنڈ مکمل کر دیتا ہے — صرف استثنا کو ہاتھ لگائیں۔',
  ],
  'feat.bills.t': ['Bills on WhatsApp', 'واٹس ایپ پر بل'],
  'feat.bills.d': [
    'At month end, send each customer their bill as a message, a PDF, or a picture — one tap each. Works on 2G.',
    'مہینے کے آخر میں ہر گاہک کو بل پیغام، پی ڈی ایف یا تصویر کی صورت بھیجیں — ایک ایک ٹچ میں۔ 2G پر بھی چلتا ہے۔',
  ],
  'feat.items.t': ['Eggs and everything else', 'انڈے اور باقی سب کچھ'],
  'feat.items.d': [
    'Make your own categories — eggs, yogurt, butter, bakery — add your items and prices, and count stock if you want.',
    'اپنی قسمیں بنائیں — انڈے، دہی، مکھن، بیکری — اپنی چیزیں اور قیمتیں شامل کریں، اور چاہیں تو اسٹاک بھی گنیں۔',
  ],
  'feat.money.t': ['Real profit, not guesswork', 'اصل منافع، اندازہ نہیں'],
  'feat.money.d': [
    'Log expenses and supplier purchases and the reports show what you actually made — money in minus money out.',
    'اخراجات اور سپلائر سے خریداری لکھیں، رپورٹ بتائے گی آپ نے اصل میں کتنا کمایا — آمدنی منہا خرچہ۔',
  ],
  'feat.offline.t': ['Works with no signal', 'سگنل کے بغیر بھی چلتا ہے'],
  'feat.offline.d': [
    'Do the whole round in a street with no network. Everything saves on the phone and syncs the moment you get signal.',
    'بغیر نیٹ ورک والی گلی میں پورا راؤنڈ کریں۔ سب کچھ فون میں محفوظ ہوتا ہے اور سگنل آتے ہی خود بھیج دیا جاتا ہے۔',
  ],
  'feat.urdu.t': ['Proper Urdu', 'اصل اردو'],
  'feat.urdu.d': [
    'Not a translation bolted on. The whole layout flips right-to-left, with Nastaliq headings and clean Naskh for lists.',
    'صرف ترجمہ نہیں۔ پوری ترتیب دائیں سے بائیں ہو جاتی ہے، نستعلیق سرخیاں اور فہرستوں کے لیے صاف نسخ۔',
  ],
  'feat.safe.t': ['Locked and backed up', 'محفوظ اور بیک اپ شدہ'],
  'feat.safe.d': [
    'A 4-digit PIN keeps the khaata private, and your records live in the cloud so a lost phone is not a lost business.',
    'چار ہندسوں کا پن کھاتے کو نجی رکھتا ہے، اور آپ کا حساب کلاؤڈ میں رہتا ہے — فون گم ہو تو کاروبار نہیں جاتا۔',
  ],

  'how.title': ['Up and running in five minutes', 'پانچ منٹ میں تیار'],
  'how.1.t': ['Install and set up your shop', 'ایپ لگائیں اور دکان بنائیں'],
  'how.1.d': [
    'Pick your language, enter your shop name and your milk rate. Common items are added for you.',
    'اپنی زبان چنیں، دکان کا نام اور دودھ کا ریٹ لکھیں۔ عام چیزیں خود شامل ہو جاتی ہیں۔',
  ],
  'how.2.t': ['Add your customers', 'اپنے گاہک شامل کریں'],
  'how.2.d': [
    'Name, phone, area, daily litres and rate. Old udhaar carries over as an opening balance.',
    'نام، فون، علاقہ، روزانہ لیٹر اور ریٹ۔ پرانا ادھار بطور ابتدائی بقایا شامل ہو جاتا ہے۔',
  ],
  'how.3.t': ['Mark the round each morning', 'ہر صبح راؤنڈ مکمل کریں'],
  'how.3.d': [
    'One button, then fix the exceptions. Takes under a minute for a hundred customers.',
    'ایک بٹن، پھر استثنا درست کریں۔ سو گاہکوں کے لیے ایک منٹ سے بھی کم۔',
  ],
  'how.4.t': ['Send bills at month end', 'مہینے کے آخر پر بل بھیجیں'],
  'how.4.d': [
    'Open Bills, tap through the list, and each customer gets theirs on WhatsApp.',
    'بل کھولیں، فہرست میں سے ٹچ کرتے جائیں، ہر گاہک کو واٹس ایپ پر بل مل جائے گا۔',
  ],

  'price.title': ['Free', 'مفت'],
  'price.sub': [
    'MilkBook costs nothing to use. There are no ads, no subscription, and nothing is locked behind a payment.',
    'ملک بک بالکل مفت ہے۔ کوئی اشتہار نہیں، کوئی سبسکرپشن نہیں، اور کچھ بھی ادائیگی کے پیچھے بند نہیں۔',
  ],
  'price.why': ['Why free?', 'مفت کیوں؟'],
  'price.whyD': [
    'It is a tool for small shops. Running it costs us very little, and a shopkeeper deciding between an app and a notebook should not have to think about the price.',
    'یہ چھوٹی دکانوں کا اوزار ہے۔ اسے چلانے پر ہمارا خرچ بہت کم ہے، اور دکاندار کو ایپ اور کاپی کے درمیان فیصلہ کرتے وقت قیمت نہیں سوچنی چاہیے۔',
  ],

  'faq.title': ['Questions people ask', 'لوگوں کے سوالات'],
  'faq.q1': ['Does it work without internet?', 'کیا یہ انٹرنیٹ کے بغیر چلتا ہے؟'],
  'faq.a1': [
    'Yes. You can do the entire milk round, write in khaatas and record sales with no signal at all. Everything is stored on the phone and uploaded automatically once you are back online.',
    'جی ہاں۔ آپ پورا دودھ راؤنڈ، کھاتے کے اندراج اور فروخت بغیر سگنل کے کر سکتے ہیں۔ سب کچھ فون میں محفوظ رہتا ہے اور آن لائن آتے ہی خود اپ لوڈ ہو جاتا ہے۔',
  ],
  'faq.q2': ['What happens if I lose my phone?', 'اگر میرا فون گم ہو جائے تو؟'],
  'faq.a2': [
    'Nothing is lost. Log in on a new phone with the same account and your whole shop is there. You can also save a backup file at any time.',
    'کچھ نہیں جاتا۔ نئے فون پر اسی اکاؤنٹ سے داخل ہوں، پوری دکان موجود ہو گی۔ آپ جب چاہیں بیک اپ فائل بھی محفوظ کر سکتے ہیں۔',
  ],
  'faq.q3': ['Can my customers see their own khaata?', 'کیا گاہک اپنا کھاتہ خود دیکھ سکتے ہیں؟'],
  'faq.a3': [
    'You can send them the whole record on WhatsApp — every line with its date and time, and the running balance. They check it themselves, which settles most arguments before they start.',
    'آپ انہیں پورا حساب واٹس ایپ پر بھیج سکتے ہیں — ہر لائن تاریخ اور وقت کے ساتھ، اور چلتا ہوا بقایا۔ وہ خود دیکھ لیتے ہیں، جس سے زیادہ تر بحث شروع ہی نہیں ہوتی۔',
  ],
  'faq.q4': ['Do I need to be good with phones?', 'کیا مجھے فون اچھی طرح چلانا آنا چاہیے؟'],
  'faq.a4': [
    'No. The app is built for shopkeepers who do not read comfortably — big buttons, pictures instead of words where possible, and simple language in both English and Urdu.',
    'نہیں۔ یہ ایپ ان دکانداروں کے لیے بنی ہے جنہیں پڑھنے میں دشواری ہو — بڑے بٹن، جہاں ممکن ہو الفاظ کی جگہ تصویریں، اور انگریزی و اردو دونوں میں آسان زبان۔',
  ],
  'faq.q5': ['Is my shop data private?', 'کیا میری دکان کا ڈیٹا نجی ہے؟'],
  'faq.a5': [
    'Yes. Only your account can open your shop. We do not sell data, we do not show ads, and no other shopkeeper can see your customers.',
    'جی ہاں۔ صرف آپ کا اکاؤنٹ آپ کی دکان کھول سکتا ہے۔ ہم ڈیٹا نہیں بیچتے، اشتہار نہیں دکھاتے، اور کوئی دوسرا دکاندار آپ کے گاہک نہیں دیکھ سکتا۔',
  ],
  'faq.q6': ['How do I delete my account?', 'میں اپنا اکاؤنٹ کیسے مٹاؤں؟'],
  'faq.a6': [
    'In the app go to Settings → My Account → Delete My Account. It erases your shop and every record permanently. You can also request deletion from this website.',
    'ایپ میں ترتیبات ← میرا اکاؤنٹ ← میرا اکاؤنٹ مٹا دیں پر جائیں۔ یہ آپ کی دکان اور ہر ریکارڈ ہمیشہ کے لیے مٹا دیتا ہے۔ آپ اس ویب سائٹ سے بھی درخواست کر سکتے ہیں۔',
  ],

  'cta.title': ['Start today. It is free.', 'آج ہی شروع کریں۔ یہ مفت ہے۔'],
  'cta.sub': [
    'Bring your paper khaata across in one evening.',
    'ایک شام میں اپنا کاغذی کھاتہ منتقل کر لیں۔',
  ],

  'foot.product': ['Product', 'پروڈکٹ'],
  'foot.company': ['Company', 'کمپنی'],
  'foot.legal': ['Legal', 'قانونی'],
  'foot.about': ['About', 'ہمارے بارے میں'],
  'foot.privacy': ['Privacy Policy', 'رازداری کی پالیسی'],
  'foot.terms': ['Terms of Use', 'استعمال کی شرائط'],
  'foot.delete': ['Delete your data', 'اپنا ڈیٹا مٹائیں'],
  'foot.rights': ['All rights reserved.', 'جملہ حقوق محفوظ ہیں۔'],
  'foot.built': ['Made for Pakistani milk shops.', 'پاکستانی دودھ کی دکانوں کے لیے بنایا گیا۔'],
} as const;

export type StringKey = keyof typeof strings;

type I18nValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('milkbook.lang');
    if (stored === 'ur' || stored === 'en') return stored;
    return navigator.language?.toLowerCase().startsWith('ur') ? 'ur' : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem('milkbook.lang', next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir: lang === 'ur' ? 'rtl' : 'ltr',
      setLang,
      t: (key: StringKey) => strings[key][lang === 'ur' ? 1 : 0],
    }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
