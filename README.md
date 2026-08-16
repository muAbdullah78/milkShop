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

**The khaata (کھاتہ) — the ledger**

The heart of the app, and how these shops actually run. A customer exists in the
customer list; the owner then **opens a khaata** for them, which is the moment
they decide to trust someone, and it is recorded with its date. From then on
everything that person takes lands in one chronological ledger — milk from the
morning round, items taken off the counter, lines the owner writes by hand
("2 dozen eggs, Rs 700") — each stamped with the **date and the time**. They pay
whenever they like, in full or in part, and the running balance moves with it.

Every line shows what changed and what was owed immediately after, so the ledger
reads exactly like the paper book. Tap **Send Full Record** and the customer gets
the whole thing on WhatsApp, line by line, and can check it themselves — that is
what turns the khaata from the owner's word into shared proof.

An optional **trust limit** per customer warns when someone goes too deep. Credit
is blocked until a khaata is actually open. A customer with any history can never
be deleted — only closed — so the record survives a dispute.

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
  (tabs)/                home · milk round · khaata · customers · more
  khaata/ customer/ bill/ sale/ payment/ expenses/ products/ shop/
  suppliers/ purchases/
  reports/ settings/
src/
  theme/                 palette, spacing, typography, font selection
  i18n/                  en.ts · ur.ts · RTL provider
  components/ui/         the component library
  components/charts/     SVG charts
  data/                  Firestore refs, live-query hooks, repositories
  features/              khaata ledger, billing, WhatsApp, PDF/image export,
                         monthly charge posting, reconciliation, stats, backup
  lib/                   dates, number formatting, security, notifications
```

### The money model

Events are the truth; `customer.balance` is a cache of them. Every write moves the
balance with an atomic `increment` in the same batch that writes the event, so the
two can never drift from a half-applied write. Deliveries use deterministic ids
(`{date}__{customerId}`), so marking the same customer twice offline is a no-op
rather than a duplicate.

The khaata ledger merges deliveries, credit sales, hand-written lines, posted
monthly charges and payments into one list ordered by when things happened, then
walks the running balance **backwards from the live balance**. That means a
partial window (the default "recent" view is three months) is still arithmetically
exact — the oldest visible row is anchored by whatever was owed before it.

Fixed-monthly charges post automatically as soon as a month closes, guarded by a
`chargePosted` flag on that month's invoice document and written in the same batch
as the increment, so a charge lands exactly once even if the app is killed
mid-write or the queue replays offline. The posted amount is frozen on the
invoice, so changing a customer's monthly rate later cannot rewrite history.

Because a cache can still be corrupted by things outside the app — a console edit,
two phones marking the same delivery offline — every khaata has a **Check & Fix
Total** button that re-adds every line from scratch and repairs the counter.

The ledger arithmetic is verified by a simulation that replays hundreds of random
events through the same write rules the repositories use, then asserts every row
chains to the next, the last row equals the live balance, an independent recount
agrees, and a windowed view still adds up. It runs clean across randomized shops:
`node scripts/ledger-math-test.mjs`.

---

## Three pieces, one project

| | Where | What it is |
|---|---|---|
| **The app** | `app/`, `src/` | The Android app the shopkeeper uses. |
| **The website** | `web/src/pages/` | Public marketing site, privacy policy, terms, and the account-deletion page Play requires. |
| **The super admin** | `web/src/admin/` | The console you run the platform from. |

### The website

Eleven pages, bilingual, at `/`. It exists partly because it is genuinely useful and
partly because Play will not accept the app without it: Google requires a **publicly
reachable privacy policy** and a **public page where anyone can request account
deletion**, both without a login. Those are `/privacy` and `/delete-account`.

```bash
cd web
cp .env.example .env      # Firebase web config — public identifiers, not secrets
npm install
npm run build
cd .. && firebase deploy --only hosting
```

### The super admin console

At `/admin`, behind Firebase Auth. Who can open it is decided by one thing: whether
a document exists at `admins/{uid}`. That is the same question the Firestore rules
ask, so the interface cannot grant itself anything the rules do not already allow.

- **Overview** — shops, active this week, growth per month, platform-wide record counts
  (server-side `count()` aggregations, so it stays one billed read each however large
  it gets).
- **Shops** — search, per-collection counts, internal notes, suspend and restore.
- **Platform** — the dashboard banner every install sees, maintenance mode, minimum
  app version, and feature switches. Owner-only.
- **Requests** — support messages sent from inside the app, and deletion requests
  from the website.
- **Admins** — the roster, with owner and staff roles.
- **Audit log** — every admin action, append-only.

Two deliberate limits, both enforced in `firestore.rules` rather than in the UI:

**An admin can read a shop but can never write to it.** Support needs to see a khaata
to answer a question about it. Support must never be able to change what a customer
owes — if that were possible, the shopkeeper's ledger would only be as trustworthy as
our access control, and the whole point of the khaata is that it settles arguments.

**Only an owner can touch anything that reaches the app.** Maintenance mode blocks
every shop in the country. That is not a support-desk button.

The remote controls live in one world-readable `platform/config` document holding only
flags and copy — never shop data — which the app subscribes to. It drives the
announcement banner, a forced-update prompt below a minimum `versionCode`, maintenance
mode, and four feature switches. Each switch is wired to something real; a toggle that
silently does nothing is worse than no toggle.

---

## Getting it running

See **[SETUP.md](./SETUP.md)** — Firebase project, security rules, EAS build.

For publishing, **[PLAYSTORE.md](./PLAYSTORE.md)** is the complete route: every manual
step before you open Play Console, then Play Console click by click, including the
Data safety answers, the content rating answers, and the signing-key mistake that
breaks Google Sign-In for every real user while working perfectly on your own phone.

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
