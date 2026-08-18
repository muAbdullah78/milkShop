# MilkBook — the complete launch runbook

You have done nothing manually yet. This document assumes that, and takes you from
zero to real shops paying you, then to Google Play, without a single step in between
that you have to guess at.

**Read Part 0 first.** It contains the three decisions that cannot be undone and the one
criticism of your plan that I think will cost you money if you ignore it.

| | |
|---|---|
| [Part 0 — before you touch anything](#part-0--before-you-touch-anything) | The irreversible bits, and where I think you are wrong |
| [Part 1 — Firebase](#part-1--firebase-90-minutes) | 90 min. The backend. |
| [Part 2 — the website](#part-2--the-website-30-minutes) | 30 min. Free hosting, real URLs. |
| [Part 3 — make yourself the boss](#part-3--make-yourself-the-boss-15-minutes) | 15 min. Admin access, free forever account. |
| [Part 4 — build the app](#part-4--build-the-app-45-minutes) | 45 min. Signing key, first APK. |
| [Part 5 — test everything](#part-5--test-everything-2-hours) | 2 hrs. The exact checklist. |
| [Part 6 — Play Console setup](#part-6--play-console-setup-2-hours) | 2 hrs. Internal testing, live in ~1 hour. |
| [Part 7 — the pilot](#part-7--the-pilot-your-first-paying-shops) | Getting real shops paying. |
| [Part 8 — the 14-day closed test](#part-8--the-14-day-closed-test) | Run it *during* the pilot, not after. |
| [Part 9 — Play Billing](#part-9--turning-on-google-play-billing) | The automatic card charging you want. |
| [Part 10 — going public](#part-10--going-public) | Production, and why nobody loses anything. |

> ### On Windows? Read this first.
>
> Every command below works in PowerShell **except** where a line chains commands with
> `&&`. Windows PowerShell 5.1 — the default on Windows — does not understand `&&` and
> fails with *"The token '&&' is not a valid statement separator"*. Every such chain in
> this guide has been split into one command per line for exactly that reason, so run
> them one at a time.
>
> Two other small differences:
>
> - `ls a b c` needs commas in PowerShell: `ls a, b, c`
> - `sudo` does not exist. If a global `npm install -g` is refused, close the terminal and
>   reopen it as Administrator.
>
> Everything else — `cd`, `cp`, `npm`, `firebase`, `eas`, `git` — behaves the same.

---

# Part 0 — before you touch anything

## The three things you cannot undo

1. **Package ID: `com.usconnect.milkbook`.** Already set in the code. From your first
   upload it is permanent. It matches your existing `com.usconnect.ezeebook`.
2. **Firestore region.** You will pick `asia-south1` (Mumbai) in Part 1. Permanent.
   Closest region to Pakistan.
3. **The signing key.** Part 4. Lose it and you can never update the app again — you
   would have to publish a brand new listing and abandon every install.

## Your migration worry: it does not exist

You asked how shops that get the app early will move to the Play Store version without
losing data. Here is the answer, plainly:

**There is nothing to migrate, because there is no separate version.**

Their data does not live in the app. It lives in Firestore, tied to the Google account
they signed in with. The app on the phone is just a window onto it. So:

- Install the app in **February** as an internal tester → their khaata is in Firestore.
- App goes **public in April** → same package, same signing key, so Play treats it as an
  **update**, not a new app. It installs over the top.
- They open it. Same account. Same 200 customers. Same khaata. Same balances.
- Their subscription is a date on their shop record. It does not know or care which Play
  track the app came from.

You could uninstall the app entirely, reinstall it a year later on a different phone,
sign in, and everything would be there. That is the whole point of the architecture.

The one thing that **would** break this is a signing-key mistake, which is exactly why
Part 4 exists and why we are distributing through Play from day one instead of sending
APK files over WhatsApp.

## Where I think you are wrong

You told me to criticise everything. Four things, in order of how much they will cost you.

### 1. The 7-day trial is too short, and I think it will halve your conversion

You chose 7 days. I built 7 days. But I want this on the record.

Your app's single most valuable moment is **month-end WhatsApp billing**. That is the
thing that makes a shopkeeper say "this is worth Rs 850." A shopkeeper who signs up on
the 5th finishes their trial on the 12th — having never once experienced the feature
that justifies the price. They will have used it as a slightly awkward notebook for a
week and then been asked for money.

The trial length is a single number in `src/features/subscription.ts`:

```ts
export const TRIAL_DAYS = 7;   // change to 30 and rebuild
```

**My recommendation:** run the pilot on 7 days as you decided, but track one number —
how many trials convert. If it is below 40%, change it to 30 and watch it move. You can
also just give a shop more days from the admin console any time (`+7d`, `+30d` buttons),
so nothing is locked in.

### 2. Rs 850/month is defensible, but collections will break before pricing does

Rs 850 against a shop clearing maybe Rs 50,000–80,000 a month is 1–2% of profit for
their entire bookkeeping system. That is fine. The price is not your problem.

**Your problem is collecting it.** Chasing 30 shops for Rs 850 by JazzCash each month is
a part-time job. At 100 shops it is a full-time job that produces no product. This is
exactly why you were right to want Play Billing as the primary rail — a card that charges
itself is the difference between a business and a hobby.

So: **push the annual plan hard.** Rs 8,500 once beats twelve collection conversations.
Frame it as "2 months free" (which it genuinely is — Rs 8,500 vs Rs 10,200). One
conversation, one payment, a year of runway, zero chasing.

### 3. Most of your target shopkeepers cannot complete a Play purchase

You said "convince them to add a card." Be ready for how often that fails. Card penetration
among Pakistani neighbourhood shopkeepers is low. Google Play in Pakistan does support
carrier billing on some networks, and that helps, but plan for **more than half** paying
you by JazzCash or cash.

That is why both rails are built. But it means the manual queue in the admin console is
not a fallback you'll rarely touch — it is a core daily workflow. Budget time for it.

### 4. "Fully blocked" needed a limit, and I put one in

You said read-only for 7 days then fully blocked, with export always available. That is
what I built. One thing you should know about what "fully blocked" actually means:

**Reads are never blocked at the database level. Only writes are.**

This is deliberate, and it is the only honest way to build it. You promised the shopkeeper
they can always export their data. Export has to read the data to write the file. So the
security rules keep reads open for ever, and the lock screen is enforced by the app.

What this means concretely: writes are **cryptographically impossible** without a
subscription — a rooted phone running a modified app cannot save a single delivery,
because Google's servers check the date against Google's clock. But a determined,
technical person could read their own already-entered data past the lock. They own that
data anyway, and you promised it to them, so this is not a hole — it is the promise
working correctly.

---

# Part 1 — Firebase (90 minutes)

## 1.1 Should it even be Firebase?

You asked me to pick and criticise. **Stay on Firebase.** Not close.

| | Firebase (Firestore) | Supabase |
|---|---|---|
| Offline on React Native | **Real offline persistence.** The whole milk round works with no signal and syncs later. | No mature offline-first story for RN. Needs PowerSync or WatermelonDB bolted on. |
| Free tier | 50k reads / 20k writes per day, 1 GiB. A 200-customer shop uses a few percent. | Generous — **but free projects pause after 7 days of inactivity.** |
| Security | Rules run on Google's servers. Already written and **tested with 74 assertions**. | RLS in Postgres. Also good, but would need rewriting from scratch. |
| Cost to switch now | — | The entire data layer, 40 screens, all providers. Weeks. |

The offline requirement decides it on its own. A shopkeeper walking a street with no
signal must not lose the round. Firestore does that natively; nothing else in the free
tier does it as well on React Native.

**Firebase's one real weakness** is that Cloud Functions need the Blaze plan (a card on
file). You said no card for now. Fine — Part 9 puts the one server endpoint you need on
**Cloudflare Workers' free tier** instead. No card, and everything still works.

## 1.2 Create the project

1. <https://console.firebase.google.com> → **Add project**
2. Name: `milkbook` (or anything). Project ID will become something like `milkbook-4a2f1`.
3. **Google Analytics: turn it OFF.** You do not need it, and leaving it off means you can
   honestly answer "no analytics" on the Play Data safety form.
4. Wait for it to create.

## 1.3 Add the Android app

1. Project overview → the **Android** icon
2. **Android package name:** `com.usconnect.milkbook` — exactly this. One character wrong
   and nothing works.
3. App nickname: `MilkBook`
4. Debug signing certificate SHA-1: **leave blank.** Part 4 handles it.
5. **Download `google-services.json`.**
6. Put that file in the project root, next to `app.config.ts`.

> ⚠️ **Never commit `google-services.json`.** It is already in `.gitignore`. Leave it there.

## 1.4 Add the web app (for the website and admin console)

1. Project settings → **Your apps** → **Add app** → the **`</>`** web icon
2. Nickname: `MilkBook Web`. **Tick "Also set up Firebase Hosting."**
3. It shows you a config block. **Copy all six values** — you need them in Part 2.

## 1.5 Turn on sign-in

**Authentication** → **Get started** → **Sign-in method**:

- **Email/Password** → Enable
- **Google** → Enable. Set a support email (your own is fine). Save.

> Enabling Google creates the web OAuth client inside `google-services.json`. If you
> enabled it **after** downloading the file, **download the file again** (Project settings →
> Your apps → Android → `google-services.json`). The app extracts the OAuth client id from
> it automatically, so you never copy that value by hand — but only if the file is current.

## 1.6 Create the database

**Firestore Database** → **Create database**

- **Production mode** (not test mode)
- Location: **`asia-south1` (Mumbai)** — permanent, cannot be changed

## 1.7 Deploy the security rules

This is the step that makes the paywall real. Do not skip it.

```bash
npm install -g firebase-tools
firebase login
cd /path/to/milkShop
firebase use --add          # pick your project, alias it "default"
firebase deploy --only firestore:rules,firestore:indexes
```

Verify it worked: Firebase Console → Firestore → **Rules** tab. You should see the
MilkBook rules with the comment block at the top about the subscription gate.

## 1.8 Prove the rules actually work

The repo ships a test suite that attacks its own paywall. Run it:

```bash
npm run test:rules
```

Expected: `✓ security rules clean — 74 assertions, every one an attack or a right`

> **This one needs Java.** The Firestore emulator runs on the JVM. Check with
> `java -version` — if it is missing, install Temurin JDK 21 from
> <https://adoptium.net> (Windows: run the `.msi`, tick "Set JAVA_HOME"), close the
> terminal, reopen it, and try again.
>
> If you would rather not install Java, you can skip this step — the rules are already
> deployed and working. But running it is how you *know* the paywall holds rather than
> hoping, and it takes one minute.

This runs against a local emulator, so it costs nothing and touches no real data. It
proves, among other things, that an expired shop cannot add a customer, that a shopkeeper
cannot push their own expiry date into the future, that a second free trial is refused,
and that a support admin cannot change what a customer owes.

**If this fails, stop and fix it before going further.** Everything else assumes it passes.

Also run the arithmetic tests:

```bash
npm run test:math
```

Expected: ledger `536 passed, 0 failed` and subscription `4938 assertions` clean.

---

# Part 2 — the website (30 minutes)

Google requires a **publicly reachable privacy policy** and a **public account-deletion
page**, both without a login. Free hosting is fine.

## 2.1 Configure it

```bash
cd web
cp .env.example .env
```

Fill `.env` with the six values from step 1.4:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=milkbook-4a2f1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=milkbook-4a2f1
VITE_FIREBASE_STORAGE_BUCKET=milkbook-4a2f1.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> These are public identifiers, not secrets. They identify the project; they grant nothing.
> The Firestore rules are what protect the data.
>
> **Copy them with the copy button, do not retype them.** A single wrong character in the
> API key or app ID fails with an error that never mentions the key.
>
> Note the storage bucket domain: newer projects show `.firebasestorage.app`, older ones
> `.appspot.com`. Use whichever your console shows.

## 2.2 Set your real URL

Your free Firebase domain is `https://<project-id>.web.app`. Put it in **two files** and
keep them identical:

`src/config/brand.ts` (the app):
```ts
siteUrl: 'https://milkbook-4a2f1.web.app',
supportEmail: 'your-real-email@gmail.com',
```

`web/src/site.config.ts` (the website):
```ts
url: 'https://milkbook-4a2f1.web.app',
supportEmail: 'your-real-email@gmail.com',
```

> **The support email must be a mailbox you actually read.** It goes on your Play listing
> and Google emails it. A dead address gets you suspended.

## 2.3 Deploy

```bash
cd web
npm install
npm run build
cd ..
firebase deploy --only hosting
```

## 2.4 Verify (do not skip)

Open each of these **on your phone, signed out, in a private tab**:

- `https://your-project.web.app/` — home page loads
- `https://your-project.web.app/privacy` — **this URL goes in Play Console**
- `https://your-project.web.app/terms`
- `https://your-project.web.app/delete-account` — **this URL also goes in Play Console**
- `https://your-project.web.app/pricing` — shows Rs 850 / 2,250 / 8,500

A privacy policy URL that 404s is one of the most common rejections there is.

---

# Part 3 — make yourself the boss (15 minutes)

## 3.1 Create your admin account

1. Open `https://your-project.web.app/admin`
2. Sign in with Google (the account you want as owner)
3. It says **"You do not have admin access"** and shows your **user ID**. Copy it.

## 3.2 Grant yourself owner

The rules only let an existing owner create admins, so the first one is created by hand,
once:

1. Firebase Console → **Firestore** → **Start collection**
2. Collection ID: `admins`
3. Document ID: **paste your user ID**
4. Add field: `role` (string) = `owner`
5. Add field: `email` (string) = your email
6. Save

Reload `/admin`. You are in, and you will see **Owner** next to the app name.

Everyone after this you add from the **Admins** page — no more console work.

## 3.3 Create the platform config document

Firestore → **Start collection** → `platform` → document ID `config`:

| Field | Type | Value |
|---|---|---|
| `minVersionCode` | number | `0` |
| `maintenance` | boolean | `false` |

Leave `minVersionCode` at 0. Only raise it once a newer build is **live on Play**.

## 3.4 Give yourself a free-forever account

You asked to use the app without paying. Two ways, and you want the second:

**During onboarding** you get an automatic 7-day trial like anyone else. Then:

1. Sign into the app with your own Google account, create your shop
2. Admin console → **Subscriptions** → **All shops** → find your shop → **Manage**
3. Click **Free forever**

That sets `subStatus: 'comp'` and the app never asks you for money again, never shows a
countdown, never locks. Same for any tester or family member you want on it — one click
each, and every one is recorded in the audit log.

## 3.5 Create your first discount codes

Admin console → **Discounts** → **New code**. Two worth making now:

**For the first shops who take a chance on you:**
- Code: `PEHLA10`
- What it does: Rupees off → `200`
- How long: **Every payment, for life**
- Maximum uses: `10`

Rs 650/month instead of Rs 850, for ever, for your first ten shops. It costs you Rs 2,400
a year each and buys you ten people who feel like founders rather than customers.

**For a shop that hesitates:**
- Code: `AZMAISH`
- What it does: Extra free days → `30`
- How long: First payment only

They pay full price and get an extra month. Your revenue figure stays honest — the cost
shows up as runway, not as a discount.

---

# Part 4 — build the app (45 minutes)

## 4.1 Set up EAS

```bash
npm install -g eas-cli
eas login            # create a free Expo account if needed
eas init             # links this repo to an EAS project
```

## 4.2 Generate and back up your signing key

```bash
eas build -p android --profile production
```

When it asks whether to generate an Android keystore, say **yes**.

> ## 🔴 Do this immediately after the build finishes
>
> ```bash
> eas credentials
> # → Android → production → Keystore → Download
> ```
>
> **Save that file in at least two places you will still have in five years.** Google Drive,
> a USB stick, email it to yourself. Also save the passwords it shows you.
>
> **If you lose this file, you can never update MilkBook again.** Not "it's difficult" —
> you cannot. You would publish a new listing with a new package ID and every install,
> review and paying customer would be stranded on a version that can never change.
>
> This is the single most fragile thing in this entire process.

The build takes 15–25 minutes and produces an **`.aab`**. Download it.

## 4.3 Get your SHA-1 fingerprints into Firebase

Google will not accept a Google sign-in from an app signed by a certificate it does not
know. There are **three** certificates, and you need all three in Firebase.

```bash
eas credentials
# → Android → Keystore: view
# Copy the SHA-1 for both development and production
```

Firebase Console → Project settings → Your apps → the Android app → **Add fingerprint**.
Add both. Then **download `google-services.json` again** and replace your local copy.

**The third one only exists after your first Play upload.** Part 6.6 comes back for it.
It is the most commonly missed step in Android development and the symptom is brutal:
sign-in works perfectly on your phone and fails for every single person who installs from
Play.

## 4.4 Build a test APK for your own phone

```bash
eas build -p android --profile preview
```

That gives an installable APK. Install it and go to Part 5.

---

# Part 5 — test everything (2 hours)

Work through this on a real Android phone. Tick each line.

## 5.1 Accounts and onboarding

- [ ] Create an account with email + password
- [ ] Log out, log back in
- [ ] Log in with Google — **if this fails, Part 4.3 is not done**
- [ ] Complete onboarding: shop name, your name, phone, milk rate
- [ ] Dashboard shows **"Free trial — 7 days left"** at the top

## 5.2 The trial cannot be farmed

- [ ] Settings → Account → Delete account (on a throwaway account). Confirm it deletes.
- [ ] Sign up again with the **same** Google account, create a shop
- [ ] **The new shop should NOT get a trial** — it should open locked, asking you to pay

That is the `trialClaims` document doing its job. It is immutable; nobody can delete it,
including you from the app. (An owner admin can clear it from Firebase Console for a
genuine support case.)

## 5.3 The core loop

- [ ] Add a customer with a real WhatsApp number, 2 litres, Rs 200/litre
- [ ] Milk round → **"Everyone got their usual"** → the customer is marked delivered
- [ ] Open the customer → **Start khaata**
- [ ] Add a khaata line: "2 dozen eggs, Rs 700"
- [ ] Take a **part payment** of Rs 300 → balance drops by exactly 300
- [ ] Open the khaata history → every line dated, running balance correct on each row
- [ ] Tap **Check & Fix Total** → it agrees with itself
- [ ] Send the bill on WhatsApp → **a real WhatsApp chat opens, prefilled**
- [ ] Add an expense, add your own category
- [ ] Add a counter sale

## 5.4 Urdu

- [ ] Settings → Language → اردو. The app restarts into right-to-left.
- [ ] Walk **every screen again**. Nothing overflows, nothing is clipped.
- [ ] Nastaliq renders properly on headings — not boxes, not disconnected letters
- [ ] Numbers still line up in columns and are readable
- [ ] Send a WhatsApp bill in Urdu → the message is readable in WhatsApp

## 5.5 Offline

- [ ] Aeroplane mode on
- [ ] Record a delivery, a payment and a khaata line
- [ ] Aeroplane mode off → everything syncs, nothing duplicated, balances correct

## 5.6 The subscription — the important part

Do this with a **test shop**, not your comp'd one. You will drive the clock from the admin
console.

**Trial → paid:**
- [ ] Admin → Subscriptions → All shops → your test shop → **Manage**
- [ ] Plan `Monthly`, method `jazzcash`, **Activate**
- [ ] App shows **Active**, paid until ~30 days out, no warning banner
- [ ] Admin → Subscriptions → the shop shows **Rs 850/mo** under Value

**Warning banner:**
- [ ] In Firebase Console → Firestore → `shops/{yourShopId}` → set `activeUntil` to
      `Date.now() + 3 days` in epoch milliseconds (use <https://currentmillis.com>)
- [ ] Reopen the app → banner reads **"Subscription ends in 3 days"**

**Read-only:**
- [ ] Set `activeUntil` to 2 hours ago. Set `readOnlyUntil` to 6 days from now.
- [ ] Reopen the app. Banner: **"View only — renew to add anything"**
- [ ] Try to record a delivery → **it must fail**
- [ ] Try to add a customer → **it must fail**
- [ ] Open a customer and their khaata → **you can still see everything**
- [ ] Settings → Download my records → **the export works**

**Locked:**
- [ ] Set both `activeUntil` and `readOnlyUntil` to a week ago
- [ ] Reopen the app → full-screen **"Renew to open your shop"**
- [ ] The wall has exactly two buttons: **Renew now** and **Download my records**
- [ ] Tap Download my records → **it still works** (this is the promise; verify it)
- [ ] Back → the wall does not go away

**Renewal restores everything:**
- [ ] Admin → Manage → Activate `Quarterly`
- [ ] Reopen the app → wall gone, all data present, paid ~3 months out
- [ ] Admin → Subscriptions shows **Rs 750/mo**

**Early renewal does not steal days:**
- [ ] Note the current `activeUntil`
- [ ] Activate `Monthly` again right away
- [ ] The new expiry must be **one month after the old expiry**, not one month from today

**A discount code:**
- [ ] App → Settings → My subscription → Renew → enter `PEHLA10` → Apply
- [ ] Monthly shows Rs 650, struck through from Rs 850
- [ ] **Pay another way** → JazzCash → put anything in the reference → Send
- [ ] Admin → Subscriptions → **Payments to confirm** → the claim is there with the code,
      the amount, and the phone number
- [ ] Confirm payment & activate → the app unlocks
- [ ] Admin → Discounts → `PEHLA10` shows **1 use**

## 5.7 The export, in detail

You were specific about Urdu breaking in downloaded files. Verify all three:

- [ ] Switch the app to **Urdu**
- [ ] Settings → Download my records → **Readable file**
- [ ] Open the `.html` in Chrome on the phone. Urdu must render in **proper Nastaliq**,
      connected and right-to-left. Amounts stay in a neat left-aligned column.
- [ ] Each customer has their own khaata block with a running balance
- [ ] Chrome menu → Print → Save as PDF. **The PDF must keep the Urdu correctly.**
- [ ] Download → **Spreadsheet files** → open the `.csv` in Excel or Google Sheets.
      **Urdu names must be readable, not `Ø§Ø±Ø¯Ù`.**
- [ ] Download → **Backup file** → Settings → Backup → restore it into a fresh account and
      confirm the shop comes back

## 5.8 Admin console

- [ ] Overview shows your shops and the record counts
- [ ] Subscriptions shows monthly revenue, trials, expiring, lapsed
- [ ] Requests shows the support message you send from the app (Settings → Get help)
- [ ] Audit log has an entry for **every** activation and discount you just made
- [ ] Try to edit an audit entry in Firebase Console → **it is refused**

---

# Part 6 — Play Console setup (2 hours)

Your developer account exists and is paid for. Good — that is the slowest part already done.

## 6.1 Create the app

**All apps → Create app**

| Field | Value |
|---|---|
| App name | `MilkBook - Doodh Dahi Khata` |
| Default language | English (United States) |
| App or game | **App** |
| Free or paid | **Free** ⚠️ permanent — and correct, since the subscription is in-app |
| Declarations | Tick both |

> **"Free" is right even though you charge money.** In Play's language, "paid" means you
> charge for the download itself. Your app is a free download with a subscription inside.

## 6.2 Upload the first build

**Test and release → Testing → Internal testing → Create new release**

1. When offered **Play App Signing**, **accept it**
2. Upload your `.aab` from Part 4.2
3. Release name: `1.0.0 (1)`. Notes: `First release.`
4. **Save** → **Review release** → **Start rollout to Internal testing**

Internal testing goes live in **minutes to an hour**, not days. No 14-day rule applies.

## 6.3 Add your pilot shops as testers

Still on Internal testing → **Testers** tab:

1. **Create email list** → name it `Pilot shops`
2. Add up to **100** Gmail addresses
3. Save
4. Copy the **opt-in URL** — this is the link you send to shopkeepers

Each shopkeeper opens that link on their phone, taps **Accept**, then **Download it on
Google Play**. From that moment they get **automatic updates**, from the real Play Store,
exactly like a public user.

## 6.4 Get the Play App Signing SHA-1 into Firebase

**Do this now. It is the step that breaks Google sign-in for everyone but you.**

1. **Test and release → Setup → App signing**
2. Under **App signing key certificate**, copy the **SHA-1**
3. Firebase Console → Project settings → Your apps → Android → **Add fingerprint** → paste
4. **Download `google-services.json` again**, replace your local copy
5. Bump `versionCode` to `2` in `app.config.ts`
6. `eas build -p android --profile production`
7. Upload that build to Internal testing

Until you do this, anyone who installs from Play and taps "Continue with Google" gets
"sign-in failed" — while it works perfectly on your own test APK, because your test APK is
signed with your key, not Google's.

## 6.5 Fill in App content

**Test and release → App content.** Everything must go green.

| Item | Answer |
|---|---|
| **Privacy policy** | `https://your-project.web.app/privacy` |
| **App access** | **All or some functionality is restricted.** Add: instruction "Sign in with the test account", email `reviewer@yourdomain.com`, password — create this account in Firebase Auth and **comp it** in the admin console so the reviewer never hits the paywall |
| **Ads** | **No** |
| **Content rating** | See 6.6 |
| **Target audience** | **18 and over.** "Appeals to children" → **No** |
| **News app** | No |
| **Data safety** | See 6.7 |
| **Government apps** | No |
| **Financial features** | **"My app doesn't provide any financial features"** — see the note below |
| **Health** | No |
| **Advertising ID** | **No** |

> ### The reviewer needs an account that never sees the paywall
>
> This matters more than usual for you. A reviewer who signs up, gets a 7-day trial, and
> then hits a Rs 850 wall may well report the app as broken or as having undisclosed costs.
>
> Create a dedicated account, mark it **Free forever** in the admin console, and put those
> credentials in **App access**. Then the reviewer sees the whole app working.

> ### Financial features: answer NO
>
> Your app records a khaata — a debt that already exists between a shopkeeper and their
> neighbour. **No money moves through your app.** That is bookkeeping, in the same family
> as a spreadsheet.
>
> Do **not** tick "personal loan app". It triggers a licensing requirement that does not
> apply to you and will stall your review for weeks while you try to produce a lending
> licence you do not need.

## 6.6 Content rating

**App content → Content rating → Start questionnaire**

| Question | Answer |
|---|---|
| Category | **Utility, Productivity, Communication or Other** |
| Violence / sex / language / drugs / gambling | **No** to all |
| Users interact or exchange content? | **No** — opening WhatsApp is handing off to another app |
| Shares location? | No |
| Purchase of digital goods? | **Yes** — you sell a subscription |

Result: PEGI 3 / Everyone. Submit.

## 6.7 Data safety — the exact answers

**App content → Data safety → Start.** Getting this wrong is a fast route to removal.

**Does your app collect or share any user data?** → **Yes**

| Data type | Collected | Shared | Purpose | Required? |
|---|---|---|---|---|
| Personal info → **Name** | Yes | No | App functionality, Account management | Required |
| Personal info → **Email address** | Yes | No | App functionality, Account management | Required |
| Personal info → **Phone number** | Yes | No | App functionality | Optional |
| Personal info → **Other info** (customer names/numbers the shopkeeper types in) | Yes | No | App functionality | Optional |
| Financial info → **Purchase history** | Yes | No | App functionality | Required |
| Financial info → **Other financial info** (khaata amounts) | Yes | No | App functionality | Optional |
| Location, Contacts, Photos, Files, Messages, Health, Calendar, App activity | **No** | — | — | — |

Then:

- **Encrypted in transit?** → **Yes**
- **Way to request data deletion?** → **Yes**, `https://your-project.web.app/delete-account`
- **Independently security-reviewed?** → No
- **Data from children?** → No

Two traps people fall into:

- **"Shared" means sent to a third party.** Firebase is your processor, not a third party.
  Answer **No** to shared for everything.
- **The app does NOT read the phone's contact list.** It stores names and numbers the
  shopkeeper types. That is "Other info", not "Contacts".

`web/src/pages/Privacy.tsx` was written to match this table field by field. If you change
one, change the other.

## 6.8 Store listing

**Grow users → Store presence → Main store listing**

**App name** (30 char max):
```
MilkBook - Doodh Dahi Khata
```

**Short description** (80 max):
```
Khaata, daily milk round and monthly bills for your shop. English and Urdu.
```

**Full description** — the ready-to-paste text is in [PLAYSTORE.md](./PLAYSTORE.md) §A16,
plus one paragraph you must add because you now charge money:

```
PRICE

7 days free, then choose what suits you:
• Monthly — Rs 850
• 3 months — Rs 2,250 (save Rs 300)
• 1 year — Rs 8,500 (2 months free)

Cancel any time. Your records always stay yours — you can download everything from
inside the app whenever you want, even if you stop paying.
```

> Play requires subscription pricing to be **stated in the listing**. Leaving it out and
> surprising people after install is a policy violation and generates refund requests.

**Graphics** — all required:

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, no transparency, under 1 MB |
| Feature graphic | 1024×500 PNG/JPG, no transparency |
| Phone screenshots | **at least 2**, up to 8. 16:9 or 9:16, 320–3840 px per side |

Take screenshots of: the dashboard, the customer list, a khaata with a running balance,
the milk round, a WhatsApp bill. **Make one of them Urdu** — it is your differentiator.

**Then add Urdu:** Store listing → **Manage translations** → **Add your own translation** →
**Urdu (اردو)**. Your users search in Urdu. Worth the twenty minutes.

---

# Part 7 — the pilot (your first paying shops)

This is the phase you actually asked about. Here is exactly how it works.

## 7.1 What a shopkeeper does

1. You send them the **opt-in URL** from 6.3 over WhatsApp
2. They tap it, tap **Accept**, tap **Download on Google Play**
3. The app installs from the real Play Store
4. They sign in with Google (or email), create their shop
5. **7-day free trial starts automatically.** No payment, no card, nothing to set up.
6. You sit with them for an hour and add their real customers

## 7.2 What happens when the trial ends

Day 1–7: they work normally. A banner counts down.
Day 7: banner says "Free trial ends today".
Day 8–14: **read-only.** They see everything, can export, cannot add. The app is useless
for the day's work — which is the pressure.
Day 15 onwards: **locked.** Full-screen "Renew to open your shop", with Renew and Download
buttons. Nothing is deleted.

## 7.3 Collecting the money

**Try Play Billing first** (once Part 9 is done): they tap **Pay with Google Play**, pick a
plan, and Google charges their card every month automatically. Nothing for you to do, ever.

**When they have no card** — which will be often:

1. They tap **Pay another way** in the app
2. The app shows the amount and asks them to pay by JazzCash / Easypaisa / bank / cash
3. They pay you
4. They tap **I have paid**, pick the method, type the transaction number
5. **You get a claim in Admin → Subscriptions → Payments to confirm** — with the shop
   name, phone, amount, plan, and reference
6. **You check the money actually arrived** in your JazzCash or bank statement
7. Click **Confirm payment & activate**
8. Their app unlocks within seconds

> The console flags a mismatch if the amount they claim does not match the plan price. Do
> not skip that check. A claim proves nothing on its own — it is an inbox, not a door. The
> security rules make it impossible for a claim to arrive pre-approved.

## 7.4 What to watch during the pilot

Admin → Subscriptions, every morning:

- **Payments to confirm** — clear this daily. A shopkeeper with a locked app is losing
  a day's records.
- **Expiring in 7 days** — call them before they lapse, not after. Cheaper than winning
  them back.
- **Lapsed** — each one is a conversation you have not had yet.

Admin → Requests, for messages sent from inside the app.

## 7.5 The number that decides everything

Count: **of the shops whose trial ended, how many paid?**

- Above 50% → your price and product are right. Scale it.
- 30–50% → the product works, the trial is too short. Change `TRIAL_DAYS` to 30.
- Below 30% → stop and find out why before you spend the 14 days. Ask the ones who said no.

**This is the whole reason you wanted a pilot.** Do not skip measuring it.

---

# Part 8 — the 14-day closed test

## 8.1 Run it DURING the pilot, not after

This is the most valuable thing in this document, so read it twice.

You were worried the 14 days is a long wait. **It does not have to be a wait at all.** The
14-day closed test and your pilot can be the same fortnight, with the same people.

Internal testing (Part 6) and closed testing are **separate tracks that run at the same
time**. So:

- **Week 1:** Internal testing. 3–5 shops. Fix whatever breaks.
- **Week 2:** Open a **Closed testing** track with 12+ testers. The clock starts. Your
  pilot shops keep using the app the whole time.
- **Week 4:** 14 days are up. Apply for production access.

You lose nothing. The wait happens while you are already earning.

## 8.2 Set it up

**Test and release → Testing → Closed testing → Create track**

1. Name it `Pilot`
2. **Testers → Create email list** → paste **at least 12** Gmail addresses
3. Create a release, upload the same `.aab`, roll it out
4. Send the closed-testing opt-in URL to all 12
5. **Every one of them must install the app and leave it installed for 14 continuous days**

> If someone opts out or uninstalls, the clock can reset. Recruit **15** so you have slack.
> Family, friends and shopkeepers all count. They do not all have to be real customers.

## 8.3 Apply for production

After 14 days, Play Console shows **Apply for production access**. Fill in the form:
what the app does, who it is for, what you learned. Be specific — vague applications get
sent back.

You will have real answers by then: how many shops, what they said, what you fixed, how
many paid. That is a strong application.

---

# Part 9 — turning on Google Play Billing

Your main rail. Needs one small server, which is free.

## 9.1 Create the subscription product

**Monetise → Products → Subscriptions → Create subscription**

- Product ID: **`milkbook_pro`** (must match `PLAY_SUBSCRIPTION_ID` in
  `src/features/subscription.ts`)
- Name: `MilkBook Pro`

Then add three **base plans**:

| Base plan ID | Billing period | Price (PKR) | Free trial |
|---|---|---|---|
| `monthly` | 1 month | 850 | 7 days |
| `quarterly` | 3 months | 2,250 | 7 days |
| `annual` | 1 year | 8,500 | 7 days |

Set **auto-renewing** for all three. Activate each one.

> ⚠️ **Check you can actually be paid.** Play Console → **Setup → Payments profile**. If
> Pakistan is not an available merchant country for your account, you cannot sell through
> Play at all, and the manual rail becomes your only option. **Check this before building
> anything for Play Billing** — it takes two minutes and it is a business-defining answer.
> Google's list is at <https://support.google.com/googleplay/android-developer/answer/9306917>.

## 9.2 Why you need a server, and where to put it for free

A Play subscription that renews every month has to be verified somewhere the user cannot
reach. Without that:

- You never learn about renewals, cancellations, refunds, or failed payments
- A rooted phone can tell your database "I paid" and it will believe it

That is exactly the loophole you told me not to leave.

Firebase Cloud Functions would be the obvious home, but they need the Blaze plan and a
card. You said no card. So:

**Put it on Cloudflare Workers.** Free tier, no card required, 100,000 requests a day.
You will use maybe 200 a month.

The endpoint does three things:
1. Receives Google's Real-time Developer Notifications (renewals, cancellations, refunds)
2. Verifies the purchase token against the Google Play Developer API
3. Writes `activeUntil` on the shop document via the Firestore REST API, using a service
   account

Everything on the app side is already built and waiting: the entitlement engine handles
`source: 'play'`, the rules already refuse to let a phone write those fields, and the
manage screen already sends Play-billed users to the Play Store to cancel.

**Until that endpoint exists**, the app's **Pay with Google Play** button says "not
available in this build yet — please use another way", and the manual rail carries
everything. That is a deliberate, honest placeholder rather than a half-working purchase
flow that loses somebody's money.

## 9.3 Testing Play Billing without being charged

**Setup → License testing** → add your own Gmail and your testers'. Licence testers get
**free test purchases** that behave exactly like real ones, including renewals (sped up —
a monthly subscription renews every 5 minutes in test mode).

---

# Part 10 — going public

## 10.1 Production release

**Test and release → Production → Create new release**

1. Upload your latest `.aab` (bump `versionCode`)
2. Release notes
3. **Countries → Add countries → Pakistan** at minimum. Nothing ships anywhere you do not tick.
4. **Rollout percentage: start at 20%.** You can halt a bad release before it reaches everyone.
5. Review release → **Start rollout**

Review takes 1–7 days for a first submission.

## 10.2 What happens to your pilot shops

**Nothing. That is the point.**

They are already installing from Play. When you promote to production, their app updates
in place — same package, same signing key, same account, same Firestore data, same
subscription date.

Concretely, for a shop that started in Part 7:
- Their 200 customers: **untouched**
- Their khaata history: **untouched**
- Their balances: **untouched**
- Their subscription: **untouched** — still expires on the same date
- Their app: **updates automatically**, like any other app on their phone

They do not need to be told anything. They do not need to reinstall. They will not notice.

## 10.3 The day it goes live

- [ ] Open your real Play listing on a phone — screenshots and description look right
- [ ] Install **from Play** on a phone that never had a test build
- [ ] **Sign in with Google** — this is where a missed Part 6.4 shows up
- [ ] Subscribe with a real payment, end to end
- [ ] Check the payment appears in Admin → Subscriptions
- [ ] Leave `minVersionCode` at 0

## 10.4 Shipping an update afterwards

```bash
# 1. bump android.versionCode by 1 in app.config.ts
# 2. build
eas build -p android --profile production
# 3. Play Console → Production → Create new release → upload → roll out
# 4. website changes:
cd web
npm run build
cd ..
firebase deploy --only hosting
# 5. before every push, run the tests:
npm test
```

Only raise **minimum app version** in the admin console **after** the new build is live on
Play. Raising it while a build is in review locks every shopkeeper out of a working app
with nothing to update to.

---

# Quick reference

## Commands

```bash
npm test                  # rules + arithmetic. Run before every build.
npm run test:rules        # 74 attacks on the paywall
npm run test:math         # 5,474 arithmetic assertions
npm run typecheck
npm run build:preview     # test APK
npm run build:play        # Play bundle
firebase deploy --only firestore:rules
firebase deploy --only hosting
cd web; npm run build     # website + admin console (then `cd ..`)
```

## Where things live

| What | Where |
|---|---|
| Trial length, prices, plan definitions | `src/features/subscription.ts` |
| App name, package, URLs, support email | `src/config/brand.ts` |
| Website name, URLs | `web/src/site.config.ts` |
| The paywall itself | `firestore.rules` → `canWriteShopData` |
| Admin billing logic | `web/src/admin/billing.ts` |
| Play version code | `app.config.ts` → `android.versionCode` |

## The five things that will bite you

1. **Losing the keystore.** Back it up in two places, today. (Part 4.2)
2. **Missing the Play App Signing SHA-1.** Google sign-in fails for every real user while
   working on your phone. (Part 6.4)
3. **Not checking whether Pakistan is a supported merchant country.** Two minutes to check,
   and it decides whether Play Billing is even possible for you. (Part 9.1)
4. **Ticking "financial features".** Weeks of delay for a licence you do not need. (Part 6.5)
5. **Raising minVersionCode before the build is live.** Locks everyone out. (Part 10.4)
