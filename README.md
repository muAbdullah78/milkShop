# MilkBook · دودھ کھاتہ

A complete shop-management app for Pakistani milk shops (*doodh walas*), built for
Android and Google Play.

Most milk shops still run on a paper khata: a notebook of who took how many litres,
who paid, and who still owes. MilkBook replaces that notebook — in **English and
Urdu**, designed so that someone who does not read comfortably can still run their
whole business from it.

---

## What it does

**Daily milk round**
Every customer has a usual quantity. One big button marks the entire round
delivered; you only touch the exceptions. Filter by *mohalla*, tap a name to change
the litres, long-press to undo. Works with no internet.

**Customers**
Name, phone, area, rate, daily litres, and delivery days (every day / alternate /
chosen weekdays). Each customer is billed either **by the litre** or on a **fixed
monthly** amount — set per customer. Opening balances carry old udhaar across from
the paper book.

**Monthly bills on WhatsApp**
The feature the shops actually want. For any month, MilkBook builds each customer's
bill — milk, other items, old balance, payments received — and sends it:

- as a **formatted WhatsApp text message** (works on 2G, no attachment),
- as a **printable PDF** with the shop's name and a day-by-day breakdown,
- as a **picture** the customer can read instantly in the chat,
- or from a **send-to-all screen** that walks through every customer one tap each.

**Everything else the shop sells**
Shopkeepers create their own categories — Eggs, Yogurt, Bakery, whatever they
stock — with their own icon and colour, then add items under them with a selling
price, a cost price and optional stock counting with low-stock warnings.

**Counter sales**
A quick point-of-sale: tap items, adjust quantities, take cash / Easypaisa /
JazzCash / bank, or put it on the customer's khata so it lands on their monthly bill.

**Money**
Expenses by type (feed, fuel, rent, salary, electricity…), suppliers and milk
purchases with what you still owe them, payments in, and a reports screen with real
profit — money in minus money out.

**Reports**
Month-by-month profit, milk sold, day-by-day trend, what sold best, where the money
went, best customers, and who still owes.

---

## Built for low literacy

- **Simple English.** "Money In", not "Revenue". "People Owe You", not "Receivables".
- **Icons and colour carry meaning** everywhere — green means money in, red means
  money out, amber means owed. Consistently, on every screen.
- **Big touch targets** (52–76 px) because this app is used standing up, in a hurry,
  with wet hands.
- **Numbers are large and tabular** so columns line up and amounts are unmistakable.
- **The one-tap milk round** removes the most repetitive daily task entirely.

## Built for Urdu, properly

Urdu is not an afterthought bolted onto an English layout:

- **True RTL.** Switching to Urdu flips the whole layout — navigation, lists, chevrons,
  alignment — via `I18nManager`, not with per-component hacks.
- **The right font for the job.** Nastaliq (`Noto Nastaliq Urdu`) for headings, buttons
  and bill titles, where the traditional look matters; Naskh (`Noto Naskh Arabic`) for
  lists, tables and small labels, where Nastaliq becomes unreadable on a cheap phone.
- **Room to breathe.** Urdu text gets a taller line box automatically, so nothing is
  ever clipped or cramped.
- **Urdu numerals are optional** (۰۱۲۳). Off by default, because most shopkeepers read
  Latin digits faster on prices.
- **Urdu bills.** The generated PDF embeds the Nastaliq font, so a bill looks the same
  on the customer's phone as it does on yours.

---

## Tech

| | |
|---|---|
| Framework | Expo SDK 57 · React Native 0.86 · expo-router |
| Language | TypeScript, strict |
| Data | Cloud Firestore via `@react-native-firebase` — full **offline persistence**, so the entire milk round works with no signal and syncs later |
| Auth | Google one-tap + email/password |
| Charts | Custom `react-native-svg` — no chart library |
| Bills | `expo-print` (PDF) · `react-native-view-shot` (image) · WhatsApp deep links |
| Target | Android only, Google Play |

### Why the native Firebase SDK

The Firebase JS SDK cannot persist Firestore's offline cache on React Native. A
shopkeeper doing their round through a street with no signal would lose the lot.
The native SDK caches to disk and replays writes when the connection returns, which
is the difference between a usable app and a demo.

### Project layout

```
app/                     expo-router screens
  (auth)/                sign in / sign up
  (tabs)/                home · milk round · customers · shop · more
  customer/ bill/ sale/ payment/ expenses/ products/ suppliers/ purchases/
  reports/ settings/
src/
  theme/                 palette, spacing, typography, font selection
  i18n/                  en.ts · ur.ts · RTL provider
  components/ui/         the component library
  components/charts/     SVG charts
  data/                  Firestore refs, live-query hooks, repositories
  features/              billing engine, WhatsApp, PDF/image export, stats, backup
  lib/                   dates, number formatting, security, notifications
```

### The money model

`customer.balance` is the single source of truth for what someone owes right now.
It moves on delivery, on credit sale, on payment, and on the fixed monthly charge —
which is posted exactly once per month, guarded by the invoice document, so a bill
previewed twice never double-charges. A bill then explains that number rather than
recomputing it:

```
total = previousBalance + monthCharges − paidInMonth
```

Deliveries use deterministic ids (`{date}__{customerId}`), so marking the same
customer twice offline is a no-op instead of a duplicate.

---

## Getting it running

See **[SETUP.md](./SETUP.md)** — Firebase project, security rules, EAS build, and
Play Store submission, step by step.

Short version:

```bash
npm install
# drop google-services.json in the repo root (SETUP.md step 2)
npm run build:preview      # installable test APK
npm run build:play         # Play Store bundle
```

Expo Go will not work; MilkBook needs a development build because of the native
Firebase SDK.

---

## Cost

Free to run for a normal shop. Firestore's free tier covers 50k reads and 20k writes
a day; a 200-customer shop uses a small fraction of that. There is no server to
maintain — Firebase is the whole backend.
