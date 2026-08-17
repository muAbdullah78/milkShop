import { PageHead } from '../components/Layout';
import { useI18n } from '../i18n';
import { playUrl } from '../site.config';

/**
 * Pricing.
 *
 * Google requires subscription prices to be stated in the store listing, and
 * the listing links here — so these numbers have to match the base plans in
 * Play Console and the `PLANS` table in the app. Three places, one set of
 * numbers; changing one without the others is how a customer ends up charged
 * something the page never showed them.
 */

type Plan = {
  id: string;
  name: [string, string];
  price: number;
  months: number;
  pitch: [string, string];
  badge?: [string, string];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: ['Monthly', 'ماہانہ'],
    price: 850,
    months: 1,
    pitch: ['Pay as you go. Stop any time.', 'جب چاہیں بند کر دیں۔'],
  },
  {
    id: 'quarterly',
    name: ['3 Months', '۳ مہینے'],
    price: 2250,
    months: 3,
    pitch: ['Save Rs 300.', 'روپے ۳۰۰ بچت۔'],
    badge: ['Most popular', 'سب سے زیادہ پسند'],
    highlight: true,
  },
  {
    id: 'annual',
    name: ['1 Year', '۱ سال'],
    price: 8500,
    months: 12,
    pitch: ['2 months free — save Rs 1,700.', '۲ مہینے مفت — روپے ۱۷۰۰ بچت۔'],
    badge: ['Best value', 'سب سے فائدہ مند'],
  },
];

export default function Pricing() {
  const { lang } = useI18n();
  const i = lang === 'ur' ? 1 : 0;
  const rs = (n: number) => `Rs ${n.toLocaleString('en-US')}`;

  const included: [string, string][] = [
    ['Unlimited customers', 'لامحدود گاہک'],
    ['Unlimited khaatas', 'لامحدود کھاتے'],
    ['WhatsApp bills, PDF and picture', 'واٹس ایپ بل، پی ڈی ایف اور تصویر'],
    ['Works without internet', 'انٹرنیٹ کے بغیر بھی چلتا ہے'],
    ['Reports and real profit', 'رپورٹس اور اصل منافع'],
    ['Eggs, yogurt, anything you sell', 'انڈے، دہی، جو کچھ آپ بیچتے ہیں'],
    ['Expenses and suppliers', 'اخراجات اور سپلائر'],
    ['English and Urdu', 'انگریزی اور اردو'],
    ['Download all your records any time', 'اپنا سارا ریکارڈ جب چاہیں ڈاؤن لوڈ کریں'],
    ['Help on WhatsApp', 'واٹس ایپ پر مدد'],
  ];

  const faqs: [string, string][][] = [
    [
      ['Is there really a free trial?', 'کیا واقعی مفت آزمائش ہے؟'],
      [
        'Yes — 7 days, everything included, no card needed. Nothing is charged unless you choose a plan.',
        'جی ہاں — ۷ دن، سب کچھ شامل، کارڈ کی ضرورت نہیں۔ جب تک آپ پلان نہ چنیں کچھ نہیں کٹے گا۔',
      ],
    ],
    [
      ['What if I have no card?', 'اگر میرے پاس کارڈ نہ ہو؟'],
      [
        'You can pay by JazzCash, Easypaisa, bank transfer or cash. Tell us in the app and we switch your shop on the same day.',
        'آپ جاز کیش، ایزی پیسہ، بینک ٹرانسفر یا نقد ادا کر سکتے ہیں۔ ایپ میں بتائیں، ہم اسی دن آپ کی دکان چالو کر دیتے ہیں۔',
      ],
    ],
    [
      ['What happens if I stop paying?', 'اگر میں ادائیگی بند کر دوں تو کیا ہوگا؟'],
      [
        'Nothing is deleted. For a week you can still see everything, and you can download all your records at any time — even later. Pay again and everything comes straight back.',
        'کچھ ختم نہیں ہوتا۔ ایک ہفتے تک آپ سب کچھ دیکھ سکتے ہیں، اور اپنا سارا ریکارڈ کسی بھی وقت ڈاؤن لوڈ کر سکتے ہیں — بعد میں بھی۔ دوبارہ ادائیگی کریں تو سب کچھ واپس آ جاتا ہے۔',
      ],
    ],
    [
      ['Can I cancel?', 'کیا میں بند کر سکتا ہوں؟'],
      [
        'Any time, from inside the app. You keep everything until the end of the period you paid for.',
        'کسی بھی وقت، ایپ کے اندر سے۔ جس مدت کی ادائیگی کی ہے اس کے آخر تک سب کچھ آپ کے پاس رہے گا۔',
      ],
    ],
    [
      ['Is my customer data safe?', 'کیا میرے گاہکوں کا ڈیٹا محفوظ ہے؟'],
      [
        'Your shop is only visible to you. Nobody else — not another shop, not our support team — can change what a customer owes you. We never sell data and there are no ads.',
        'آپ کی دکان صرف آپ کو نظر آتی ہے۔ کوئی اور — نہ کوئی دوسری دکان، نہ ہماری سپورٹ ٹیم — یہ نہیں بدل سکتی کہ گاہک کے آپ پر کتنے پیسے ہیں۔ ہم ڈیٹا نہیں بیچتے اور کوئی اشتہار نہیں۔',
      ],
    ],
  ];

  return (
    <>
      <PageHead
        title={i ? 'قیمت' : 'Pricing'}
        sub={
          i
            ? '۷ دن مفت آزمائیں۔ پھر وہ پلان چنیں جو آپ کو سوٹ کرے۔ کسی بھی وقت بند کر سکتے ہیں۔'
            : 'Try it free for 7 days. Then pick whatever suits you. Stop any time.'
        }
      />

      <div className="mx-auto max-w-5xl px-5 py-16">
        {/* Trial */}
        <div className="mx-auto mb-10 max-w-xl rounded-2xl border-2 border-money-in bg-money-in-soft p-6 text-center">
          <p className="text-2xl font-extrabold text-money-in">
            {i ? '۷ دن مفت' : '7 days free'}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {i
              ? 'سب کچھ شامل۔ کارڈ کی ضرورت نہیں۔'
              : 'Everything included. No card needed.'}
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-3xl bg-white p-7 ${
                p.highlight ? 'border-2 border-primary shadow-lg' : 'border border-line'
              }`}
            >
              {p.badge ? (
                <span
                  className={`absolute -top-3 ${
                    i ? 'right-6' : 'left-6'
                  } rounded-full px-3 py-1 text-[11px] font-bold ${
                    p.highlight ? 'bg-primary text-white' : 'bg-money-in text-white'
                  }`}
                >
                  {p.badge[i]}
                </span>
              ) : null}

              <p className="font-bold text-ink">{p.name[i]}</p>

              <p className="mt-3">
                <span className="num text-4xl font-extrabold tracking-tight text-primary">
                  {rs(p.price)}
                </span>
              </p>
              <p className="num mt-1 text-sm text-ink-muted">
                {rs(Math.round(p.price / p.months))} {i ? 'فی مہینہ' : 'per month'}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{p.pitch[i]}</p>

              <a
                href={playUrl}
                target="_blank"
                rel="noreferrer"
                className={`mt-6 block rounded-2xl px-6 py-3.5 text-center text-sm font-bold transition ${
                  p.highlight
                    ? 'bg-primary text-white hover:bg-brand'
                    : 'border border-line text-ink hover:bg-page'
                }`}
              >
                {i ? 'شروع کریں' : 'Get started'}
              </a>
            </div>
          ))}
        </div>

        {/* What you get */}
        <div className="mt-12 rounded-2xl border border-line bg-white p-7">
          <h2 className="text-lg font-bold text-ink">
            {i ? 'ہر پلان میں شامل' : 'Every plan includes'}
          </h2>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {included.map((f) => (
              <li key={f[0]} className="flex gap-2.5">
                <svg
                  className="mt-1 shrink-0 text-money-in"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
                <span className="text-sm text-ink-muted">{f[i]}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* The bit that matters most to a shopkeeper */}
        <div className="mt-6 rounded-2xl border-2 border-primary/25 bg-primary-soft p-7">
          <h2 className="text-lg font-bold text-ink">
            {i ? 'آپ کا ریکارڈ آپ کا ہے' : 'Your records are yours'}
          </h2>
          <p className="mt-2 leading-relaxed text-ink-muted">
            {i
              ? 'اگر آپ ادائیگی بند کر دیں تو ہم آپ کا ریکارڈ ختم نہیں کرتے اور آپ سے نہیں چھپاتے۔ آپ کسی بھی وقت اپنے تمام گاہک اور پورا کھاتہ ایک فائل میں ڈاؤن لوڈ کر سکتے ہیں — پڑھنے کے لیے، پرنٹ کرنے کے لیے، یا ایکسل میں کھولنے کے لیے۔'
              : 'If you stop paying we do not delete your records and we do not hide them from you. You can download every customer and your whole khaata as a file at any time — to read, to print, or to open in Excel.'}
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-xl font-extrabold text-ink">
            {i ? 'عام سوالات' : 'Common questions'}
          </h2>
          <div className="mt-5 space-y-3">
            {faqs.map(([q, a]) => (
              <details key={q[0]} className="rounded-2xl border border-line bg-white p-5">
                <summary className="cursor-pointer font-bold text-ink">{q[i]}</summary>
                <p className="mt-2 leading-relaxed text-ink-muted">{a[i]}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
