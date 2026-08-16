import { PageHead } from '../components/Layout';
import { useI18n } from '../i18n';
import { site } from '../site.config';

export default function About() {
  const { lang } = useI18n();
  const ur = lang === 'ur';

  return (
    <>
      <PageHead
        title={ur ? 'ہمارے بارے میں' : 'About'}
        sub={ur ? site.taglineUr : site.tagline}
      />

      <article className="prose-legal mx-auto max-w-3xl px-5 py-14">
        {ur ? (
          <>
            <p>
              پاکستان کی زیادہ تر دودھ کی دکانیں آج بھی ایک کاپی پر چلتی ہیں — کس نے کتنے لیٹر لیے،
              کس نے پیسے دیے، اور کس پر کتنا باقی ہے۔ یہ طریقہ کام کرتا ہے، مگر کاپی گم ہو جاتی ہے،
              بھیگ جاتی ہے، اور مہینے کے آخر پر بحث ہو جاتی ہے۔
            </p>
            <p>
              <strong>{site.appNameUr}</strong> اسی کاپی کی جگہ لینے کے لیے بنایا گیا ہے — بالکل اسی
              طرح جیسے دکاندار سوچتا ہے، نہ کہ جیسے اکاؤنٹنٹ سوچتا ہے۔ ایک بٹن سے پورا دودھ راؤنڈ،
              ہر گاہک کا کھاتہ وقت کے ساتھ، اور مہینے کے آخر پر واٹس ایپ سے بل۔
            </p>
            <h2>ہمارے اصول</h2>
            <ul>
              <li><strong>پڑھنا نہ آنا رکاوٹ نہیں۔</strong> بڑے بٹن، رنگ اور تصویریں معنی رکھتی ہیں، اور آسان زبان۔</li>
              <li><strong>اردو اصل ہے۔</strong> صرف ترجمہ نہیں — پوری ترتیب دائیں سے بائیں، نستعلیق سرخیوں کے ساتھ۔</li>
              <li><strong>سگنل کے بغیر بھی چلے۔</strong> گلی میں نیٹ ورک نہ ہو تو بھی پورا راؤنڈ ہو جائے۔</li>
              <li><strong>حساب کبھی غلط نہ ہو۔</strong> شک ہو تو ہر لائن دوبارہ جوڑی جا سکتی ہے۔</li>
              <li><strong>مفت رہے۔</strong> کوئی اشتہار نہیں، کوئی سبسکرپشن نہیں، ڈیٹا نہیں بیچا جاتا۔</li>
            </ul>
          </>
        ) : (
          <>
            <p>
              Most milk shops in Pakistan still run on a notebook — who took how many litres, who
              paid, and who still owes. It works, right up until the notebook goes missing, gets
              wet, or the numbers are argued over at the end of the month.
            </p>
            <p>
              <strong>{site.appName}</strong> exists to replace that notebook, and to do it the way a
              shopkeeper thinks rather than the way an accountant thinks. One button for the whole
              milk round. A khaata per customer with the time on every line. Bills on WhatsApp at
              month end.
            </p>
            <h2>What we hold to</h2>
            <ul>
              <li>
                <strong>Not reading well should not be a barrier.</strong> Big buttons, colour and
                icons that carry meaning, and plain language.
              </li>
              <li>
                <strong>Urdu is a first language here.</strong> Not a translation layer — the whole
                layout flips, with Nastaliq headings and legible Naskh for dense text.
              </li>
              <li>
                <strong>It has to work with no signal.</strong> A street with no network should not
                stop the round.
              </li>
              <li>
                <strong>The arithmetic must never be wrong.</strong> Every khaata can be recounted
                from its own lines whenever you doubt it.
              </li>
              <li>
                <strong>It stays free.</strong> No ads, no subscription, no selling data.
              </li>
            </ul>
            <h2>Contact</h2>
            <p>
              {site.publisher} — <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
            </p>
          </>
        )}
      </article>
    </>
  );
}
