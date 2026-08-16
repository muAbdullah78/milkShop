# MilkBook — Setup Guide

From an empty machine to an app on Google Play. Roughly 45 minutes, most of it waiting for builds.

You need: a Google account, a computer with Node 20+, and about $25 for the one-time Google Play developer fee.

---

## 1. Install the tools

```bash
npm install -g eas-cli
git clone <this-repo>
cd milkShop
npm install
```

---

## 2. Create the Firebase project (this is the important one)

MilkBook keeps every shop's data in **your** Firebase project. It is free for the
volumes a milk shop produces — a shop with 200 customers writes roughly 6,000
documents a month, well inside the Spark (free) tier.

1. Go to <https://console.firebase.google.com> → **Add project** → name it `milkbook` → create.
2. In the project, click the **Android** icon to add an Android app.
   - **Android package name:** `com.milkbook.app` — this must match exactly.
   - Nickname and SHA-1 can be left blank for now (you add SHA-1 in step 4).
   - Download **`google-services.json`** and put it in the root of this repo,
     next to `package.json`. It is gitignored on purpose — never commit it.
3. **Build → Firestore Database → Create database.**
   - Start in **production mode**.
   - Pick the location closest to Pakistan: `asia-south1` (Mumbai).
4. **Build → Authentication → Get started.** Enable two providers:
   - **Email/Password** — just toggle on and save.
   - **Google** — toggle on, pick a support email, save.
     Enabling Google is what creates the *web client ID* the app needs; the app
     reads it out of `google-services.json` automatically, so there is nothing
     to copy anywhere.

### Publish the security rules

The repo ships rules that stop one shop reading another's khata. Deploy them:

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # pick the project you just made
firebase deploy --only firestore:rules
```

If you skip this, Firestore's default production rules block everything and the
app will show empty screens.

---

## 3. Point EAS at your own Expo account

```bash
eas login
eas init          # creates the project and writes its id
```

---

## 4. Register the app's signing key with Firebase

Google Sign-In only works if Firebase knows the fingerprint of the key your APK
is signed with. Let EAS create the key first:

```bash
eas credentials -p android
```

Choose **Build credentials → Set up a new keystore** (accept the defaults), then
pick **Download credentials / Show fingerprint** and copy the **SHA-1**.

Then in Firebase Console → **Project settings → Your apps → Android app → Add
fingerprint**, paste the SHA-1, save, and **re-download `google-services.json`**
(it changes) into the repo root.

> Do this once for the production keystore, and again for the debug keystore if
> you want Google Sign-In to work in development builds.

---

## 5. Build

**A test APK you can install on your own phone:**

```bash
npm run build:preview
```

EAS gives you a download link when it finishes. Send that link to a shopkeeper to
try the app before you publish.

**A development build (hot reload while you edit code):**

```bash
eas build -p android --profile development
# install the APK, then:
npx expo start --dev-client
```

You cannot use Expo Go — MilkBook uses the native Firebase SDK so that the whole
milk round works with no internet.

**The Play Store bundle:**

```bash
npm run build:play
```

---

## 6. Publish to Google Play

1. Create a developer account at <https://play.google.com/console> ($25, once).
2. **Create app** → name `MilkBook` → Free → App.
3. Upload the `.aab` from step 5 under **Production → Create new release**.
4. Fill in the store listing. Suggested copy:
   - **Short description:** Milk shop khata, customers, bills and expenses — in English and Urdu.
   - **Full description:** mention daily milk round, monthly WhatsApp bills, eggs
     and other items, expenses, and that it works without internet.
   - You need: an app icon (512×512), a feature graphic (1024×500), and at least
     two phone screenshots.
5. Complete the **Data safety** form. MilkBook collects: name, email (for login),
   and the shop's own business records. Nothing is shared with third parties.
6. Submit for review. First review usually takes 2–7 days.

---

## Local development without Firebase

`npx expo start` runs, but every screen that needs data shows the "Firebase is
not set up" notice until `google-services.json` exists. That is intentional — it
tells you exactly what is missing instead of failing silently.

---

## Troubleshooting

**"Google login is not set up yet"**
The web OAuth client is missing from `google-services.json`. Enable the Google
provider in Firebase Authentication, then re-download the file and rebuild.

**Google sign-in opens then immediately closes**
The SHA-1 fingerprint of your build is not registered in Firebase. Redo step 4
for the keystore that signed that build.

**Screens are empty and nothing saves**
Firestore rules are not deployed, or the database was created in a different
project than `google-services.json` points at.

**"WhatsApp is not installed on this phone"**
Expected on an emulator. Test bills on a real phone.

**Urdu text looks like boxes in the PDF bill**
The embedded Nastaliq font failed to load. The on-screen bill and the WhatsApp
text message still work; re-run the build to re-bundle the font assets.
