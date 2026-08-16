import { Link } from 'react-router-dom';

import { PageHead } from '../components/Layout';
import { site } from '../site.config';

/**
 * The privacy policy Google Play links to from the store listing.
 *
 * Kept in English only and deliberately specific: it names the exact data the
 * app stores, the one processor it uses, and where deletion happens. A vague
 * boilerplate policy is one of the most common Play review rejections, and it
 * has to match the Data safety form answers exactly.
 */
export default function Privacy() {
  return (
    <>
      <PageHead
        title="Privacy Policy"
        sub={`How ${site.appName} handles your information. Last updated ${site.legalUpdated}.`}
      />

      <article className="prose-legal mx-auto max-w-3xl px-5 py-14">
        <p>
          <strong>{site.appName}</strong> (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is
          published by {site.publisher}. This policy explains what the app stores, why, who can see
          it, and how to get rid of it. It applies to the Android app{' '}
          <span className="num">{site.androidPackage}</span> and to this website.
        </p>
        <p>
          The short version: we store the business records you enter so that they are available on
          your phone and are not lost if the phone is. We do not sell your data, we do not show
          advertising, and we do not share your records with other shops or with any third party for
          marketing.
        </p>

        <h2>1. Information we collect</h2>

        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account details.</strong> Your email address, and your name and profile photo if
            you sign in with Google. This identifies your account and nothing else.
          </li>
          <li>
            <strong>Your shop.</strong> Shop name, and optionally your own name, shop phone number
            and shop address. The name, phone and address you enter here are printed on the bills
            you send to your own customers.
          </li>
          <li>
            <strong>Your business records.</strong> The customers you add (their name, and
            optionally phone number, address and area), your items and prices, daily milk
            deliveries, khaata entries, sales, payments received, expenses, suppliers, purchases and
            the bills you generate.
          </li>
          <li>
            <strong>Support messages.</strong> If you email us or send a support request, we keep
            the message and your email address so we can reply.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Authentication data.</strong> Firebase Authentication records sign-in times and
            an anonymous account identifier so the app can keep you signed in.
          </li>
          <li>
            <strong>Nothing else.</strong> The app contains no analytics SDK, no advertising SDK, no
            crash-reporting SDK and no tracking of any kind. It does not collect your location, your
            contacts, your photos, your device identifiers for advertising, or your usage patterns.
          </li>
        </ul>

        <h3>About your customers&rsquo; information</h3>
        <p>
          When you add a customer, you are entering another person&rsquo;s details into a record you
          control. <strong>You are responsible for that information.</strong> Only enter what you
          need to run your shop, and tell your customers you keep a record of what they take, as you
          would with a paper khaata. We process this information solely to provide the app to you —
          we never contact your customers, and we never use their details for any purpose of our
          own.
        </p>

        <h2>2. Why we store it</h2>
        <ul>
          <li>To show you your own records on whichever phone you sign in to.</li>
          <li>To keep your data safe if your phone is lost, stolen or replaced.</li>
          <li>To generate the bills and statements you choose to send.</li>
          <li>To answer you when you contact support.</li>
        </ul>
        <p>
          Our legal basis, where a basis is required, is the performance of our agreement with you —
          you asked us to keep these records, so we keep them.
        </p>

        <h2>3. Who can see it</h2>
        <ul>
          <li>
            <strong>You.</strong> Your shop is locked to your account. No other user of the app can
            read it. This is enforced by server-side security rules, not just by the app.
          </li>
          <li>
            <strong>Google (Firebase).</strong> The app uses Firebase Authentication and Cloud
            Firestore, operated by Google, to sign you in and to store your records. Google acts as
            our data processor. See{' '}
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">
              Firebase Privacy and Security
            </a>
            .
          </li>
          <li>
            <strong>Our support staff.</strong> A small number of administrators can look up a shop
            in order to answer a support request or to investigate abuse. They can read but{' '}
            <strong>cannot alter your khaata</strong>, and every administrator action is logged.
          </li>
          <li>
            <strong>Nobody else.</strong> We do not sell, rent or trade your information. We do not
            share it for advertising. We would disclose information only if we were legally required
            to, and only the minimum required.
          </li>
        </ul>

        <h3>WhatsApp</h3>
        <p>
          When you send a bill or a khaata record, the app opens WhatsApp on your phone with the
          message prepared. <strong>We do not send anything ourselves</strong> and we have no server
          in that path — you press send, and from that point WhatsApp&rsquo;s own privacy policy
          applies.
        </p>

        <h2>4. Where it is stored, and for how long</h2>
        <p>
          Records are stored in Google Cloud Firestore. A copy is also cached on your phone so the
          app keeps working without a signal. We keep your data for as long as your account exists.
          When you delete your account, it is removed as described below.
        </p>

        <h2>5. Deleting your data</h2>
        <p>
          <strong>In the app:</strong> Settings → My Account → Delete My Account. You type{' '}
          <span className="num">DELETE</span> to confirm and sign in once more to prove it is you.
          This permanently erases your login, your shop, and every customer, khaata line, delivery,
          sale, payment, expense, supplier and bill. It is immediate and it cannot be undone. Save a
          backup first if you want to keep anything.
        </p>
        <p>
          <strong>From this website:</strong> use the{' '}
          <Link to="/delete-account">account deletion request</Link> page, or email{' '}
          <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>. We will verify that the
          request comes from the account owner and complete the deletion within 30 days.
        </p>
        <p>
          After deletion, residual copies may persist in encrypted infrastructure backups for a
          short period before being overwritten. Nothing is retained in a form we can read or
          restore.
        </p>

        <h2>6. Your rights</h2>
        <p>You may at any time:</p>
        <ul>
          <li>See everything we hold — it is all visible in the app.</li>
          <li>Export it — Settings → Backup &amp; Restore produces a complete file.</li>
          <li>Correct it — every record in the app is editable.</li>
          <li>Delete it — as described above.</li>
          <li>
            Complain — write to <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>, or
            to your local data protection authority if you are in a jurisdiction that has one.
          </li>
        </ul>

        <h2>7. Security</h2>
        <p>
          Data travels over encrypted connections and is encrypted at rest by Google Cloud. Access
          is restricted by server-side security rules tied to your account. You can additionally set
          a 4-digit PIN in the app so that someone picking your phone up off the counter cannot read
          your khaata.
        </p>
        <p>
          No system is perfectly secure. If we ever become aware of a breach affecting your data, we
          will tell you and the relevant authority without undue delay.
        </p>

        <h2>8. Children</h2>
        <p>
          {site.appName} is a tool for running a business and is not directed at children. We do not
          knowingly collect information from anyone under 13. If you believe a child has created an
          account, email us and we will remove it.
        </p>

        <h2>9. Permissions the app asks for</h2>
        <ul>
          <li>
            <strong>Internet</strong> — to sync your records.
          </li>
          <li>
            <strong>Notifications</strong> — only for the reminders you switch on yourself. You can
            refuse this and the app works normally.
          </li>
          <li>
            <strong>Vibration</strong> — button feedback.
          </li>
        </ul>
        <p>
          The app does <strong>not</strong> request access to your camera, microphone, location,
          contacts or photo gallery.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          If we change this policy we will update the date at the top and, for anything significant,
          tell you inside the app. Continuing to use {site.appName} after a change means you accept
          it.
        </p>

        <h2>11. Contact</h2>
        <p>
          {site.publisher}
          <br />
          Privacy: <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>
          <br />
          Support: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
        </p>
      </article>
    </>
  );
}
