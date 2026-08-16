import { PageHead } from '../components/Layout';
import { useI18n } from '../i18n';
import { site } from '../site.config';

export default function Support() {
  const { t, lang } = useI18n();
  const ur = lang === 'ur';

  const topics = ur
    ? [
        ['میں لاگ اِن نہیں کر پا رہا', 'وہی گوگل اکاؤنٹ یا ای میل استعمال کریں جس سے دکان بنائی تھی۔ پاس ورڈ بھول گئے ہیں تو لاگ اِن صفحے پر "پاس ورڈ بھول گئے؟" پر ٹچ کریں۔'],
        ['واٹس ایپ نہیں کھلتا', 'یقینی بنائیں کہ فون میں واٹس ایپ لگا ہوا ہے اور گاہک کا نمبر محفوظ ہے۔ ایمولیٹر پر یہ کام نہیں کرتا۔'],
        ['حساب غلط لگ رہا ہے', 'اُس گاہک کا کھاتہ کھولیں اور نیچے "حساب جانچیں اور درست کریں" پر ٹچ کریں۔ یہ ہر لائن دوبارہ جوڑتا ہے۔'],
        ['میں نے فون بدل لیا', 'نئے فون پر اسی اکاؤنٹ سے داخل ہوں۔ پوری دکان خود آ جائے گی۔'],
      ]
    : [
        ['I cannot log in', 'Use the same Google account or email you created the shop with. If you forgot the password, tap "Forgot password?" on the login screen.'],
        ['WhatsApp does not open', 'Check that WhatsApp is installed and that the customer has a phone number saved. It will not work on an emulator.'],
        ['A balance looks wrong', 'Open that customer’s khaata and tap "Check & Fix Total" at the bottom. It re-adds every line and repairs the total.'],
        ['I changed my phone', 'Sign in on the new phone with the same account. Your whole shop appears automatically.'],
      ];

  return (
    <>
      <PageHead
        title={t('nav.support')}
        sub={ur ? 'ہم عام طور پر ایک یا دو کاروباری دن میں جواب دیتے ہیں۔' : 'We usually reply within one or two working days.'}
      />

      <div className="mx-auto max-w-3xl px-5 py-14">
        <a
          href={`mailto:${site.supportEmail}`}
          className="block rounded-2xl border-2 border-primary bg-white p-7 transition hover:shadow-md"
        >
          <p className="text-sm font-bold uppercase tracking-wider text-ink-faint">
            {ur ? 'ہمیں ای میل کریں' : 'Email us'}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{site.supportEmail}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {ur
              ? 'اپنی دکان کا نام اور مسئلہ لکھیں۔ ہو سکے تو اسکرین شاٹ بھیجیں۔'
              : 'Tell us your shop name and what happened. A screenshot helps a lot.'}
          </p>
        </a>

        <h2 className="mt-12 text-xl font-extrabold text-ink">
          {ur ? 'عام مسائل' : 'Common problems'}
        </h2>
        <div className="mt-4 space-y-3">
          {topics.map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-line bg-white p-5">
              <h3 className="font-bold text-ink">{q}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-muted">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
