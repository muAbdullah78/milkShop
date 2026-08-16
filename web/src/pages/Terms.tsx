import { Link } from 'react-router-dom';

import { PageHead } from '../components/Layout';
import { site } from '../site.config';

export default function Terms() {
  return (
    <>
      <PageHead
        title="Terms of Use"
        sub={`The agreement between you and ${site.publisher}. Last updated ${site.legalUpdated}.`}
      />

      <article className="prose-legal mx-auto max-w-3xl px-5 py-14">
        <p>
          By installing or using <strong>{site.appName}</strong> you agree to these terms. If you do
          not agree, please do not use the app.
        </p>

        <h2>1. What the app is</h2>
        <p>
          {site.appName} is a record-keeping tool for small shops. It helps you write down what you
          delivered, what customers took on credit, what they paid and what you spent. It is a
          notebook that adds up — <strong>it is not an accounting service, a banking service, or a
          payment processor.</strong> No money moves through the app.
        </p>

        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 18, or old enough to run a business where you live.</li>
          <li>Keep your login details to yourself. Anything done with your account is your responsibility.</li>
          <li>Give us an email address that works — it is how you recover access.</li>
          <li>One account is meant for one shop. You may run more than one shop with separate accounts.</li>
        </ul>

        <h2>3. Your records are yours</h2>
        <p>
          You own everything you enter. We claim no rights over it. We store and display it so the
          app can work, and for nothing else. You can export it or delete it at any time.
        </p>

        <h2>4. Your responsibilities</h2>
        <ul>
          <li>
            <strong>Accuracy.</strong> The app adds up exactly what you type. If you enter the wrong
            amount, the bill will be wrong. Check before you send.
          </li>
          <li>
            <strong>Other people&rsquo;s information.</strong> When you record a customer&rsquo;s
            name and phone number you take on responsibility for that information. Only record what
            you need, and follow any law that applies to you.
          </li>
          <li>
            <strong>Messages you send.</strong> Bills and reminders go out from your own WhatsApp,
            under your own name. What you send, and how often, is your decision and your
            responsibility.
          </li>
          <li>
            <strong>Lawful use.</strong> Do not use {site.appName} for anything illegal, and do not
            attempt to break into other shops&rsquo; data or disrupt the service.
          </li>
        </ul>

        <h2>5. What we provide, and what we do not promise</h2>
        <p>
          {site.appName} is provided <strong>free of charge and &ldquo;as is&rdquo;</strong>. We work
          hard to make it correct and reliable, but we cannot promise it will never be unavailable,
          never contain a bug, or never lose data. Specifically we do not guarantee uninterrupted
          service, and we do not warrant that the app is fit for any particular purpose.
        </p>
        <p>
          <strong>Keep your own backups.</strong> The app can save a complete backup file — use it.
          A backup you control is the only protection against every possible failure, including
          ours.
        </p>

        <h2>6. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, {site.publisher} is not liable for lost profits, lost
          business, lost or corrupted data, or any indirect or consequential loss arising from your
          use of {site.appName}. Because the app is free, our total liability to you for any claim is
          limited to the amount you have paid us, which is zero.
        </p>
        <p>
          Nothing in these terms excludes liability that cannot lawfully be excluded, including
          liability for death or personal injury caused by negligence, or for fraud.
        </p>

        <h2>7. Suspension</h2>
        <p>
          We may suspend or close an account that is being used to break these terms, to harm other
          users, or to attack the service. Where we reasonably can, we will tell you why and give
          you a chance to export your data first.
        </p>

        <h2>8. Ending the agreement</h2>
        <p>
          You may stop at any time by deleting your account — Settings → My Account → Delete My
          Account, or via the <Link to="/delete-account">website request form</Link>. Deletion is
          permanent. We may discontinue the service, and if we do we will give reasonable notice so
          you can export your records.
        </p>

        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms. The date at the top shows the current version, and significant
          changes will be announced in the app. Continuing to use {site.appName} after a change means
          you accept the new terms.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of {site.jurisdiction}, and the courts of{' '}
          {site.jurisdiction} have jurisdiction over any dispute — without affecting any consumer
          protection you have where you live.
        </p>

        <h2>11. Contact</h2>
        <p>
          {site.publisher}
          <br />
          <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
        </p>
      </article>
    </>
  );
}
