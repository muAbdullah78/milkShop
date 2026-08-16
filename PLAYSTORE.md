# Publishing MilkBook to Google Play

This is the whole road from "the code is written" to "the app is live", in order.

It is split into two lists, exactly as asked:

- **[Part A — the manual work you have to do](#part-a--the-manual-work-you-have-to-do)** (before you
  ever open Play Console). 18 steps.
- **[Part B — uploading to Play Console](#part-b--uploading-to-play-console)**, click by click.

Read [Part 0](#part-0--what-is-already-done) first — it tells you what you do **not** have to do,
so you don't redo work.

> **Time and money, honestly.**
> Money: **$25 once** for the Play developer account. Everything else — Firebase, Firebase
> Hosting, EAS free tier — is $0 at your size. A domain is optional (~$10/year).
> Time: about **a day** of setup work, then **14 days of waiting** that you cannot skip
> (Google requires a 14-day closed test for new personal developer accounts), then 1–7 days
> of review.

---

## Part 0 — what is already done

Written into the code, so it is not on your list:

| Play requirement | Where it lives |
| --- | --- |
| Privacy policy reachable **inside the app** | Settings → Legal & Privacy → Privacy Policy |
| Privacy policy on a **public web page** | `web/src/pages/Privacy.tsx` → `/privacy` |
| Terms of use | `web/src/pages/Terms.tsx` → `/terms` |
| **In-app account deletion** (mandatory since 2024) | Settings → Account → Delete account |
| **Public web deletion request page**, no login | `web/src/pages/DeleteAccount.tsx` → `/delete-account` |
| A support channel inside the app | Settings → Get help (writes to your admin inbox) |
| Target API 36, min SDK 24 | `app.config.ts` → `expo-build-properties` |
| No unnecessary permissions | Only `INTERNET`, `VIBRATE`, `POST_NOTIFICATIONS`. Camera, mic and gallery are explicitly **blocked** in `app.config.ts` |
| Android 11+ package visibility for WhatsApp | `plugins/withWhatsAppQueries.js` |
| Data isolation between shops | `firestore.rules` — a shop is only readable by its `memberUids` |
| Remote kill switch / forced update | `platform/config` document, driven from the admin console |
| Marketing website, all pages | `web/` |
| Super admin console | `web/src/admin/` → `/admin` |

What is **not** done, and only you can do: everything in Part A.

---

# Part A — the manual work you have to do

Do these in order. Steps A1–A11 have to be finished before you can build a working app at all.

---

### A1. Choose your real names, and change them in three files

Right now the app calls itself **MilkBook** with package id `com.milkbook.app`. Both are
placeholders. The package id **can never be changed after your first upload**, so decide now.

The package id must be globally unique and is conventionally a domain you control, reversed:
`com.yourname.milkbook`, `pk.yourshop.milkbook`.

Change it in:

1. `app.config.ts` → `name`, `slug`, `android.package`
2. `src/config/brand.ts` → every field
3. `web/src/site.config.ts` → every field (keep it identical to `brand.ts`)

Also check the app name is not already taken on Play, and is not confusingly similar to another
app — a copycat name is a common rejection.

---

### A2. Get a web address

Google requires a **publicly reachable privacy policy URL**. It must load without a login, and it
must actually describe *this* app. A Google Doc link or a placeholder page is a rejection.

Two options:

- **Free:** use the Firebase Hosting domain you get in A3 — `your-project.web.app`. Completely
  acceptable to Google.
- **Better:** buy a domain (~$10/year) and connect it in Firebase Hosting → Add custom domain.

Whichever you choose, write it into `brand.siteUrl` and `site.url` (no trailing slash).

---

### A3. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project**. Name it whatever you like.
   Google Analytics is **not** needed — leave it off (it also keeps the Data safety form simpler,
   see B4).
2. Inside the project → **Add app** → **Android**.
   - Android package name: exactly what you set in A1. One character off and nothing works.
   - App nickname: anything.
   - **Debug signing certificate SHA-1:** leave blank for now — A11 covers it.
3. Download **`google-services.json`** and put it in the project root, next to `app.config.ts`.
   - It is already in `.gitignore`. **Do not commit it.**
4. Project settings → **Your apps** → **Add app** → **Web** (the `</>` icon). This is for the
   website and admin console. Copy the config values it shows — you need them in A7.

---

### A4. Turn on sign-in

Firebase Console → **Authentication** → **Get started** → **Sign-in method**:

- Enable **Email/Password**.
- Enable **Google**. Set a support email when it asks (your own is fine).

Enabling Google is what creates the *web OAuth client* inside `google-services.json`.
`app.config.ts` pulls that value out automatically, so you never copy it by hand — but if you
enabled Google **after** downloading the file, **download `google-services.json` again**.

---

### A5. Create the database and deploy the rules

1. Firebase Console → **Firestore Database** → **Create database**.
   - **Production mode.**
   - Location: **`asia-south1` (Mumbai)** is the closest region to Pakistan — lowest latency for
     your shopkeepers. The location can **never** be changed later.
2. Install the CLI and deploy the rules and indexes from this repo:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project, alias it "default"
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   Do not skip this. The default production rules deny everything, and without
   `firestore.indexes.json` several screens will fail on their first query.

---

### A6. Fill in your real contact details

Open `src/config/brand.ts` and `web/src/site.config.ts` and replace every placeholder:

| Field | What Google does with it |
| --- | --- |
| `publisher` | Shown on your legal pages. Your own full name is fine for a personal account. |
| `supportEmail` | **Must be a mailbox you actually read.** It appears on your Play listing and Google emails it. A dead address gets you suspended. |
| `siteUrl` / `url` | Must resolve publicly. Checked by the reviewer. |
| `jurisdiction` | Which country's law governs the terms. `Pakistan` unless you have a reason. |
| `legalUpdated` | The date on the privacy policy and terms. Update it whenever you edit them. |

Then **read `web/src/pages/Privacy.tsx` end to end.** It describes exactly what the app collects.
If you change what the app does, this page and your Data safety answers (B4) must change with it —
they have to match, and Google does check.

---

### A7. Configure the website's Firebase connection

```bash
cd web
cp .env.example .env
```

Fill `.env` from the **web app** config in A3.4. These values are public by design — they identify
the project, they do not grant access; the Firestore rules are what protect the data.

---

### A8. Build and deploy the website

```bash
cd web
npm install
npm run build      # typechecks, then builds into web/dist
cd ..
firebase deploy --only hosting
```

Then **open these four URLs in a private browser window** — signed out, on your phone — and
confirm each one loads:

- `https://your-site/` — the home page
- `https://your-site/privacy` — **this URL goes into Play Console**
- `https://your-site/terms`
- `https://your-site/delete-account` — **this URL also goes into Play Console**

A privacy policy URL that 404s is one of the most common rejections there is.

> If Firebase Hosting was never initialised in your project, run `firebase init hosting` once and
> accept the settings already in `firebase.json` — public directory `web/dist`, single-page app
> rewrite. Do **not** let it overwrite `firebase.json` or `web/dist/index.html`.

---

### A9. Make yourself the super admin

The Firestore rules only let an existing owner create admins, so the very first one is created by
hand — once.

1. Open `https://your-site/admin` and sign in (Google, or an email/password account you create in
   Firebase Console → Authentication → Add user).
2. The console will say *"You do not have admin access"* and show you your **user ID**. Copy it.
3. Firebase Console → Firestore → **Start collection** → collection id `admins`
   → document id = **your user ID** → add field:

   | Field | Type | Value |
   | --- | --- | --- |
   | `role` | string | `owner` |

4. Reload `/admin`. You are in. Everyone after this you add from the **Admins** page.

---

### A10. Create the platform config document

Firestore → **Start collection** → collection id `platform` → document id `config`. Add:

| Field | Type | Value |
| --- | --- | --- |
| `minVersionCode` | number | `0` |
| `maintenance` | boolean | `false` |

That is all it needs — the admin console writes the rest. Creating it now means the app is never
querying a document that doesn't exist.

---

### A11. Set up EAS and your signing key

```bash
npm install -g eas-cli
eas login              # create a free Expo account if you don't have one
eas init               # links this repo to an EAS project
```

When you run your first build, EAS asks whether to generate an Android **keystore**. Say **yes**
and let EAS keep it.

> **This keystore is the single most irreplaceable thing in this whole process.** Lose it and you
> can never update your app again — you would have to publish a brand-new listing and lose every
> install and review. Right after your first build, run `eas credentials` → Android → download a
> backup, and keep it somewhere you will still have in five years. Not only on this laptop.

Then, the step everybody misses:

> **Google Sign-In and SHA-1 fingerprints.**
> Firebase only accepts a Google sign-in from an app signed with a certificate it knows. There are
> up to **three** certificates in play, and you need all of them in Firebase:
>
> 1. **EAS debug** — for `eas build --profile development`.
> 2. **EAS upload key** — what signs the `.aab` you upload.
> 3. **Google Play App Signing key** — what Google re-signs your app with before serving it to
>    users. **This one only exists after your first upload** (see B2).
>
> Get 1 and 2 with `eas credentials` → Android → *Keystore: view*.
> Get 3 from Play Console → your app → **Test and release → Setup → App signing** → copy the
> **SHA-1 certificate fingerprint** under *App signing key certificate*.
>
> Add each one in Firebase Console → Project settings → Your apps → Android app → **Add
> fingerprint**. Then **re-download `google-services.json`** and rebuild.
>
> Symptom if you skip #3: sign-in works perfectly in your test build, and every single person who
> installs from Play gets "sign-in failed". Come back and do this after B2.

---

### A12. Build the release bundle

```bash
eas build --platform android --profile production
```

This produces an **`.aab`** (Android App Bundle) — the format Play requires. It takes 15–25
minutes. Download it when it finishes.

Before every future upload: **increase `android.versionCode` in `app.config.ts` by 1.** Play
rejects a re-used versionCode. `eas.json` is set to `appVersionSource: "local"` on purpose, so the
number in that file is exactly what the app reports at runtime — which is what the admin console's
"minimum version" gate compares against.

---

### A13. Test on a real Android phone before you upload

```bash
eas build --platform android --profile preview   # installable APK
```

Install it and walk the whole app. A reviewer will:

- [ ] Sign up with email, sign out, sign back in
- [ ] Sign in with Google
- [ ] Complete onboarding, create a shop
- [ ] Add a customer with a phone number
- [ ] Record today's delivery for that customer
- [ ] Open the customer's khaata, add a credit line, take a part payment, check the running total
- [ ] Send a WhatsApp bill (a real WhatsApp chat must open, prefilled)
- [ ] Add an expense and a category of your own
- [ ] Switch the language to Urdu and go through every screen again — check nothing overflows and
      the Nastaliq renders
- [ ] Turn the phone to aeroplane mode, record a delivery, turn it back on, confirm it syncs
- [ ] **Settings → Account → Delete account** — on a throwaway account. Confirm it actually
      deletes, and that you cannot sign back in.

That last one is not optional. Reviewers test in-app deletion, and a button that doesn't work is a
policy violation, not a bug.

---

### A14. Create the Google Play developer account

<https://play.google.com/console/signup> — **$25, once, non-refundable.**

- **Personal** account (an individual): you will be asked for government photo ID and an address.
  Verification takes anywhere from a few hours to a few days.
- **Organisation** account (a registered company): you additionally need a **D-U-N-S number**,
  which is free but can take up to 30 days to obtain. Only choose this if you have a registered
  business.

Also relevant: personal accounts created after November 2023 must run a **closed test with at
least 12 testers who stay opted in for 14 continuous days** before Google will let you apply for
production access. Start recruiting those 12 people now — real Gmail addresses, they must actually
install the app. Twelve shopkeepers, friends and family all count.

---

### A15. Make the store listing graphics

All required. Play rejects the listing if any are missing.

| Asset | Exact spec | Notes |
| --- | --- | --- |
| **App icon** | 512 × 512 PNG, 32-bit, **no transparency**, under 1 MB | Not the same file as the in-app icon. Flat square — Play rounds the corners for you. |
| **Feature graphic** | 1024 × 500 PNG or JPG, no transparency | Shown at the top of your listing. Keep text large and in the middle third — the edges get cropped on some layouts. |
| **Phone screenshots** | **at least 2**, up to 8. 16:9 or 9:16, each side between 320 px and 3840 px | Take these from a real device. |
| Tablet screenshots | optional | Skip unless you want tablet placement. |

Screenshots worth taking, in this order: the dashboard, the customer list, a customer's khaata with
a running balance, the milk round screen, the WhatsApp bill. **Take one of them with the app in
Urdu** — it is your differentiator and reviewers notice.

`web/public/og.svg` in this repo is the right style to copy for the feature graphic.

---

### A16. Write the listing text

Ready to paste. Edit the names to match A1.

**App name** (max 30 characters):

```
MilkBook — Milk Shop Khaata
```

**Short description** (max 80 characters):

```
Khaata, daily milk round and monthly bills for your shop. English and Urdu.
```

**Full description** (max 4000 characters):

```
MilkBook is a simple record book for milk shops in Pakistan. It replaces the paper register with
something you can carry in your pocket — and it works in both English and Urdu.

WHAT IT DOES

• Khaata (کھاتہ) — keep every customer's credit account. Add what they took, record part payments
  or the full amount, and the balance is always correct. Every line is dated, so you can show a
  customer their own history and settle any argument in seconds.

• Daily milk round — mark today's deliveries in one screen. Skip a day, change the quantity, add
  an extra. Works with no internet and syncs when you get signal.

• Monthly bills over WhatsApp — at the end of the month, send each customer their bill as a
  WhatsApp message, a PDF or a picture. One tap per customer.

• Not just milk — make your own categories for eggs, butter, yoghurt, bread, anything you sell,
  and record those sales in the same place.

• Expenses — feed, fuel, rent, labour. See what you spent this month and what you actually earned.

• Customers — names, phone numbers, their daily quantity and rate, all in one list. Tap to open
  WhatsApp, tap to call.

• Suppliers — what you owe the dairy or the farm, and what you have paid.

BUILT FOR HOW YOU ACTUALLY WORK

• Full Urdu, properly typeset — not a rough translation. Switch language any time.
• Plain, simple words. Big buttons. Nothing hidden in menus.
• Works offline. Do your round with no signal and everything saves.
• PIN lock so nobody else can open your accounts.
• Backup your whole shop to a file whenever you want.

FREE

MilkBook is free. No ads, no subscription, no charge per customer.

YOUR DATA IS YOURS

Your customer list and your khaata belong to you. We do not sell data, we show no ads, and there
is no advertising or tracking code in this app. You can delete your account and everything in it
from inside the app at any time — Settings, Account, Delete account.
```

**App category:** Business. **Tags:** Finance, Productivity.

---

### A17. Prepare your Data safety answers

You will type these into Play Console in B4. Getting this form wrong — saying you collect nothing
when the app writes a phone number to a server — is one of the fastest ways to get pulled from the
store. The answers below match what MilkBook actually does; verify them against
`web/src/pages/Privacy.tsx` before you submit.

**Does your app collect or share any of the required user data types?** → **Yes**

| Data type | Collected | Shared | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Personal info → **Name** | Yes | No | App functionality, Account management | Required |
| Personal info → **Email address** | Yes | No | App functionality, Account management | Required |
| Personal info → **Phone number** | Yes | No | App functionality | Optional |
| Personal info → **Other info** (customer names and phone numbers the shopkeeper enters) | Yes | No | App functionality | Optional |
| Financial info → **Other financial info** (amounts owed and paid in the khaata) | Yes | No | App functionality | Optional |
| App activity → *nothing* | No | — | — | — |
| Location, Contacts, Photos, Files, Messages, Health, Calendar | **No** | — | — | — |

Then:

- **Is all user data encrypted in transit?** → **Yes** (Firebase uses HTTPS/TLS throughout.)
- **Do you provide a way for users to request that their data be deleted?** → **Yes**, and give
  your `/delete-account` URL.
- **Has your app been independently validated against a global security standard?** → No.
- **Is any of this data collected from children?** → No.

Two things people get wrong here, so, plainly:

- **"Shared" means sent to a third party.** Firebase is your *processor*, not a third party you
  share with. Answer **No** to shared for everything.
- The app **does not** access the phone's contact list. It stores customer names and numbers that
  the shopkeeper types in. That is "Other info", not "Contacts".

---

### A18. Line up your 12 testers

If your developer account is new and personal, you cannot reach production without this. Collect
**12 Gmail addresses** of people who will install the app and leave it installed for 14 days.

Put them in a plain list, one per line — you paste them into Play Console in B6.

---

# Part B — uploading to Play Console

<https://play.google.com/console>

---

### B1. Create the app

**All apps → Create app.**

| Field | Answer |
| --- | --- |
| App name | From A16 (you can change this later) |
| Default language | English (United States) — or Urdu if you prefer; you can add the other after |
| App or game | **App** |
| Free or paid | **Free** — ⚠️ this can never be changed to paid later |
| Declarations | Tick both: developer programme policies, and US export laws |

---

### B2. Upload the bundle first, then fix the signing key

Do this **before** the questionnaires, because it is what generates the Play App Signing key you
need for A11.

1. **Test and release → Testing → Internal testing → Create new release.**
2. Play offers **Play App Signing** — **accept it.** Google holds the real signing key; you keep
   an upload key. This is what lets you recover if you ever lose your keystore.
3. Upload the `.aab` from A12.
4. Release name: `1.0.0 (1)`. Release notes: `First release.`
5. Save. You do not have to roll it out yet.
6. Now go to **Test and release → Setup → App signing**, copy the **SHA-1** under *App signing key
   certificate*, and **go do A11's third fingerprint**. Add it in Firebase, re-download
   `google-services.json`, rebuild with `eas build`, and upload that new build.

Skipping step 6 means Google Sign-In fails for every real user while working perfectly for you.

---

### B3. Work through "App content"

**Test and release → App content.** Every item must be green before you can publish.

| Item | Answer for MilkBook |
| --- | --- |
| **Privacy policy** | Your `https://your-site/privacy` URL |
| **App access** | *All functionality is available without special access* — **unless** you want the reviewer to skip signup; if so choose *All or some functionality is restricted* and give them a test email + password you created in Firebase Auth. **Recommended:** provide test credentials. It removes a whole class of "we couldn't get in" rejections. |
| **Ads** | **No**, this app contains no ads |
| **Content rating** | See B5 |
| **Target audience** | Age **18 and over**. Answer **No** to "appeals to children" |
| **News app** | **No** |
| **COVID-19 contact tracing** | **No** |
| **Data safety** | See B4 |
| **Government apps** | **No** |
| **Financial features** | **"My app doesn't provide any financial features."** ⚠️ Read the note below |
| **Health apps** | **No** |
| **Advertising ID** | **No**, the app does not use an advertising ID |

> **The "financial features" question, because khaata makes people hesitate.**
> That declaration is for apps that *provide* lending, banking, crypto or payments — where money
> actually moves. MilkBook records a debt that already exists between two people and never touches
> a rupee. It is a bookkeeping app, in the same family as a spreadsheet. Declare **no financial
> features**. Do not tick "personal loan app" — that opens a licensing requirement that does not
> apply to you and will stall your review for weeks.

---

### B4. Data safety

**App content → Data safety → Start.** Enter the answers you prepared in A17.

The form is long but shallow: it asks, for each data type, *collected / shared / purpose /
required or optional*. Work down the table from A17 and leave everything not listed as **No**.

At the end it generates a preview of the "Data safety" section your users will see. **Read that
preview.** If it says something that isn't true of your app, go back — this is the exact text
Google compares against your app's real behaviour.

---

### B5. Content rating

**App content → Content rating → Start questionnaire.**

| Question | Answer |
| --- | --- |
| Email address | Yours |
| Category | **Utility, Productivity, Communication or Other** |
| Violence, sexuality, profanity, drugs, gambling, horror | **No** to all |
| Does the app allow users to interact or exchange content? | **No** — the app does not have chat; opening WhatsApp is a hand-off to another app |
| Does the app share the user's location? | **No** |
| Does the app allow purchase of digital goods? | **No** |

You will get **PEGI 3 / Everyone**. Submit.

---

### B6. Store listing and graphics

**Grow users → Store presence → Main store listing.**

Paste the text from A16 and upload the graphics from A15. Then add a second language:

**Store presence → Store listing → Manage translations → Add your own translation → Urdu (اردو)**,
and paste an Urdu version of the short and full description. Your users search in Urdu. This is
worth the twenty minutes.

Also fill **Store settings** → app category **Business**, and your contact details — the support
email from A6, and optionally a phone and website.

---

### B7. The 14-day closed test (new personal accounts)

**Test and release → Testing → Closed testing → Create track.**

1. **Testers → Create email list** → paste your 12 addresses from A18.
2. Create a release on this track with your `.aab` and roll it out.
3. Copy the **opt-in URL** and send it to all 12. Every one of them must open the link, accept, and
   **install the app**.
4. Now wait. Google requires **12 testers opted in continuously for 14 days.** Nobody may opt out.
   If someone drops off, the clock restarts.
5. Use the fortnight properly: you have 12 real shopkeepers using the app. Watch the **Requests**
   page in your admin console, fix what they hit, and push new builds to the same track.

After 14 days, Play Console shows an **Apply for production access** button. Fill in the short
form — what the app does, who it is for, what you learned from testing. Honest and specific gets
approved; vague gets sent back.

> Already have an established developer account, or an organisation account? This whole step may
> not apply to you. Play Console tells you plainly on the **Production** page if it does.

---

### B8. Production release

**Test and release → Production → Create new release.**

1. Add the same `.aab` (or a newer one with a bumped `versionCode`).
2. Release name `1.0.0 (1)`, and real release notes.
3. **Countries / regions → Add countries** → at minimum **Pakistan**. Nothing ships anywhere you
   don't tick.
4. **Rollout percentage:** start at **20%**. If something is badly wrong you can halt it before it
   reaches everyone. Raise to 100% after a few days of quiet.
5. **Save → Review release → Start rollout to Production.**

Review typically takes **1–7 days** for a first submission.

---

### B9. The day it goes live

1. Open your real Play listing and check the screenshots and description look right on a phone.
2. Install it **from Play** on a phone that has never had the test build, and **sign in with
   Google**. This is the moment the A11 fingerprint problem shows up if you missed it.
3. Set `brand.androidPackage` (already correct) — the `Get it on Google Play` link on your website
   now resolves.
4. Leave `minVersionCode` at `0` in the admin console. Only raise it once a newer build is
   **live on Play**, never while one is in review — raising it early locks every shopkeeper out of
   a working app with nothing to update to.

---

## Shipping an update, later

1. Change the code.
2. **Bump `android.versionCode` by 1** in `app.config.ts` (and `version` if it's a real release).
3. `eas build --platform android --profile production`
4. Play Console → Production → Create new release → upload → roll out.
5. If the update fixes something important, raise **minimum app version** in the admin console
   *after* the new build is live, so old installs are prompted to update.
6. If the website changed too: `cd web && npm run build && cd .. && firebase deploy --only hosting`.

---

## The rejections that actually happen

| What Google says | What it means | Fix |
| --- | --- | --- |
| "Privacy policy not found" | The URL 404s, redirects, or needs a login | Open it signed-out on a phone (A8) |
| "Data safety section is inaccurate" | Your form and your app disagree | Redo A17 against `Privacy.tsx` |
| "Account deletion requirement" | No in-app deletion, or the web URL is missing | Both exist — make sure you entered the URL in B3 |
| "Broken functionality" | The reviewer couldn't get past sign-in | Give test credentials in **App access** (B3) |
| "Deceptive behaviour" | Screenshots show features that aren't there | Only screenshot real screens |
| Sign-in fails for everyone but you | Missing Play App Signing SHA-1 | A11, fingerprint #3 |
| "Target API level" | You built against an old SDK | Already 36 in `app.config.ts` — don't lower it |

---

## Running the app once it is live

Your admin console at `https://your-site/admin`:

- **Overview** — how many shops, how many are active this week, growth per month.
- **Shops** — search any shop, see its record counts, leave an internal note, suspend or restore
  it. Admins can *read* a shop for support but the Firestore rules stop them *writing* to its
  khaata. That is deliberate: support must never be able to change what a customer owes.
- **Platform** — the dashboard banner every shopkeeper sees, maintenance mode, minimum app
  version, and the feature switches. Owner-only.
- **Requests** — messages sent from inside the app, and deletion requests from the website.
- **Admins** — who else can get in, and at what level.
- **Audit log** — every admin action, append-only. It cannot be edited or deleted, by anyone.
