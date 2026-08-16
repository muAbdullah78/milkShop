import { PageHead } from '../components/Layout';
import { useI18n, type StringKey } from '../i18n';

const GROUPS: { t: StringKey; d: StringKey; points: [string, string][] }[] = [
  {
    t: 'feat.khaata.t',
    d: 'feat.khaata.d',
    points: [
      ['Open a khaata deliberately, with the date recorded', 'کھاتہ سوچ سمجھ کر کھولیں، تاریخ محفوظ رہتی ہے'],
      ['Every line stamped with the date and the time', 'ہر لائن تاریخ اور وقت کے ساتھ'],
      ['Pay in full or in part, whenever they like', 'پورا یا کچھ حصہ، جب چاہیں ادائیگی'],
      ['Send the whole record on WhatsApp so they can check it', 'پورا حساب واٹس ایپ پر بھیجیں تاکہ وہ خود دیکھ لیں'],
      ['Optional trust limit warns before someone goes too deep', 'ادھار کی حد مقرر کریں، زیادہ ہونے پر خبردار کرے'],
      ['Check & Fix Total recounts every line if you ever doubt it', 'شک ہو تو ہر لائن دوبارہ جوڑ کر حساب درست کریں'],
    ],
  },
  {
    t: 'feat.round.t',
    d: 'feat.round.d',
    points: [
      ['One button marks the whole round delivered', 'ایک بٹن پورا راؤنڈ مکمل کر دیتا ہے'],
      ['Filter by mohalla or delivery route', 'محلے یا راستے کے حساب سے چھانٹیں'],
      ['Daily, alternate-day or chosen weekdays per customer', 'ہر گاہک کے لیے روزانہ، ایک دن چھوڑ کر یا چنے ہوئے دن'],
      ['Change quantity or skip a customer in one tap', 'ایک ٹچ میں مقدار بدلیں یا چھٹی کریں'],
      ['Undo the whole day if you marked it by mistake', 'غلطی ہو جائے تو پورا دن واپس کریں'],
    ],
  },
  {
    t: 'feat.bills.t',
    d: 'feat.bills.d',
    points: [
      ['A clean text message that works on 2G', 'صاف پیغام جو 2G پر بھی چلتا ہے'],
      ['A printable PDF with your shop name and a day-by-day breakdown', 'دکان کے نام اور روزانہ تفصیل کے ساتھ پرنٹ ہونے والی پی ڈی ایف'],
      ['A picture the customer can read instantly in the chat', 'تصویر جو گاہک چیٹ میں فوراً پڑھ سکے'],
      ['A send-to-all screen you tap through at month end', 'مہینے کے آخر پر سب کو بھیجنے والی فہرست'],
      ['Bill by the litre or a fixed monthly amount, per customer', 'ہر گاہک کے لیے لیٹر کے حساب سے یا ماہانہ مقررہ رقم'],
    ],
  },
  {
    t: 'feat.items.t',
    d: 'feat.items.d',
    points: [
      ['Create your own categories with an icon and colour', 'اپنی قسمیں بنائیں، تصویر اور رنگ کے ساتھ'],
      ['Selling price and cost price, so profit is real', 'فروخت اور لاگت کی قیمت، تاکہ منافع اصل ہو'],
      ['Optional stock counting with low-stock warnings', 'چاہیں تو اسٹاک گنیں، کم ہونے پر اطلاع'],
      ['Quick counter sale: cash, Easypaisa, JazzCash, bank or khaata', 'فوری کاؤنٹر فروخت: نقد، ایزی پیسہ، جاز کیش، بینک یا کھاتہ'],
    ],
  },
  {
    t: 'feat.money.t',
    d: 'feat.money.d',
    points: [
      ['Expenses by type — feed, fuel, rent, salary, electricity', 'خرچے کی قسم کے حساب سے — چارہ، پٹرول، کرایہ، تنخواہ، بجلی'],
      ['Suppliers and milk purchases, with what you still owe them', 'سپلائر اور دودھ کی خریداری، اور آپ نے کیا دینا ہے'],
      ['Month-by-month profit, milk sold and best customers', 'مہینہ بہ مہینہ منافع، دودھ کی فروخت اور بہترین گاہک'],
      ['Backup to a file, or export your customer list as CSV', 'فائل میں بیک اپ، یا گاہکوں کی فہرست CSV میں'],
    ],
  },
];

export default function Features() {
  const { t, lang } = useI18n();
  const i = lang === 'ur' ? 1 : 0;

  return (
    <>
      <PageHead title={t('feat.title')} sub={t('feat.sub')} />

      <div className="mx-auto max-w-4xl px-5 py-16">
        <div className="space-y-14">
          {GROUPS.map((g) => (
            <section key={g.t}>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t(g.t)}</h2>
              <p className="mt-2 text-lg leading-relaxed text-ink-muted">{t(g.d)}</p>
              <ul className="mt-5 space-y-2.5">
                {g.points.map((p) => (
                  <li key={p[0]} className="flex gap-3">
                    <svg
                      className="mt-1 shrink-0 text-money-in"
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                    <span className="text-ink-muted">{p[i]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
