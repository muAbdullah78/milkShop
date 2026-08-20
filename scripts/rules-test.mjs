/**
 * Firestore security-rules test suite.
 *
 * This is the only place the paywall is actually proven. Everything else —
 * the app's gate component, the admin console, the entitlement engine — is a
 * user interface. A determined shopkeeper with a rooted phone and a patched
 * APK bypasses all of it in an afternoon. These rules are what they cannot
 * bypass, so these rules are what get tested.
 *
 * Run:  npm run test:rules
 * (starts the Firestore emulator, runs this, shuts it down)
 *
 * Each case states the attack or the legitimate action in plain words, so a
 * failure tells you what is now possible that should not be.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const DAY = 24 * 60 * 60 * 1000;

const OWNER = 'uid_owner';
const OTHER = 'uid_other_shop';
const ADMIN = 'uid_admin_staff';
const SUPERADMIN = 'uid_admin_owner';

const SHOP = 'shop_A';
const SHOP_B = 'shop_B';

let env;
let passed = 0;
const failures = [];

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    process.stdout.write('.');
  } catch (e) {
    failures.push(`${label}\n      ${String(e).split('\n')[0]}`);
    process.stdout.write('✗');
  }
}

/** Seeds documents with rules switched off, so setup can never be blocked. */
async function seed(fn) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

function shopDoc(overrides = {}) {
  const now = Date.now();
  return {
    name: 'Test Dairy',
    ownerUid: OWNER,
    memberUids: [OWNER],
    defaultMilkRate: 200,
    defaultMilkQty: 2,
    currency: 'PKR',
    createdAt: now,
    updatedAt: now,
    subStatus: 'active',
    subPlan: 'monthly',
    subSource: 'manual',
    activeUntil: now + 30 * DAY,
    readOnlyUntil: now + 37 * DAY,
    trialUsed: true,
    trialStartedAt: now,
    ...overrides,
  };
}

async function main() {
  env = await initializeTestEnvironment({
    projectId: 'milkbook-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  const owner = env.authenticatedContext(OWNER).firestore();
  const other = env.authenticatedContext(OTHER).firestore();
  const staff = env.authenticatedContext(ADMIN).firestore();
  const superAdmin = env.authenticatedContext(SUPERADMIN).firestore();
  const anon = env.unauthenticatedContext().firestore();

  await seed(async (db) => {
    await setDoc(doc(db, 'admins', ADMIN), { role: 'staff', email: 'staff@x.com' });
    await setDoc(doc(db, 'admins', SUPERADMIN), { role: 'owner', email: 'boss@x.com' });
    await setDoc(doc(db, 'shops', SHOP), shopDoc());
    await setDoc(doc(db, 'shops', SHOP_B), shopDoc({ ownerUid: OTHER, memberUids: [OTHER] }));
    await setDoc(doc(db, 'shops', SHOP, 'customers', 'c1'), { name: 'Ali', balance: 500 });
    await setDoc(doc(db, 'shops', SHOP_B, 'customers', 'c1'), { name: 'Bilal', balance: 900 });
    await setDoc(doc(db, 'platform', 'config'), { maintenance: false });
    await setDoc(doc(db, 'discounts', 'LAUNCH50'), {
      code: 'LAUNCH50', kind: 'percent', value: 50, scope: 'first', active: true,
    });
  });

  console.log('\n── Tenant isolation ' + '─'.repeat(50));

  await check('another shop cannot read my customers', () =>
    assertFails(getDoc(doc(other, 'shops', SHOP, 'customers', 'c1'))));

  await check('another shop cannot write to my customers', () =>
    assertFails(setDoc(doc(other, 'shops', SHOP, 'customers', 'c2'), { name: 'Hacker' })));

  await check('another shop cannot read my shop document', () =>
    assertFails(getDoc(doc(other, 'shops', SHOP))));

  await check('another shop cannot add itself to my memberUids', () =>
    assertFails(updateDoc(doc(other, 'shops', SHOP), { memberUids: [OWNER, OTHER] })));

  await check('a signed-out visitor cannot read any shop', () =>
    assertFails(getDoc(doc(anon, 'shops', SHOP))));

  await check('my own shop is readable by me', () =>
    assertSucceeds(getDoc(doc(owner, 'shops', SHOP))));

  await check('my own customers are writable by me while subscribed', () =>
    assertSucceeds(setDoc(doc(owner, 'shops', SHOP, 'customers', 'c9'), { name: 'New', balance: 0 })));

  console.log('\n\n── The paywall ' + '─'.repeat(55));

  // Expire the shop: activeUntil well past, beyond the 2-day write grace.
  await seed(async (db) => {
    await updateDoc(doc(db, 'shops', SHOP), {
      subStatus: 'readonly',
      activeUntil: Date.now() - 3 * DAY,
      readOnlyUntil: Date.now() + 4 * DAY,
    });
  });

  await check('EXPIRED: cannot add a customer', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP, 'customers', 'x1'), { name: 'Nope' })));

  await check('EXPIRED: cannot record a delivery', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP, 'deliveries', 'd1'), { qty: 2 })));

  await check('EXPIRED: cannot write a khaata line', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP, 'khaataEntries', 'k1'), { amount: 500 })));

  await check('EXPIRED: cannot take a payment', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP, 'payments', 'p1'), { amount: 500 })));

  await check('EXPIRED: cannot edit an existing customer', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP, 'customers', 'c1'), { balance: 0 })));

  await check('EXPIRED: cannot delete a customer', () =>
    assertFails(deleteDoc(doc(owner, 'shops', SHOP, 'customers', 'c1'))));

  await check('EXPIRED: CAN still read customers (export must work)', () =>
    assertSucceeds(getDoc(doc(owner, 'shops', SHOP, 'customers', 'c1'))));

  await check('EXPIRED: CAN still list the whole collection (export must work)', () =>
    assertSucceeds(getDocs(collection(owner, 'shops', SHOP, 'customers'))));

  console.log('\n\n── Forging your own subscription ' + '─'.repeat(37));

  await check('cannot push my own activeUntil into the future', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { activeUntil: Date.now() + 999 * DAY })));

  await check('cannot make myself comp', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { subStatus: 'comp' })));

  await check('cannot change my own plan', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { subPlan: 'annual' })));

  await check('cannot switch my source to play without paying', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { subSource: 'play' })));

  await check('cannot delete the activeUntil field to become ungated', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP), shopDocWithout('activeUntil'))));

  await check('cannot reset trialUsed to claim another trial', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { trialUsed: false })));

  await check('cannot forge a Play purchase token', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), { playPurchaseToken: 'fake-token' })));

  await check('cannot sneak activeUntil in alongside a legitimate edit', () =>
    assertFails(updateDoc(doc(owner, 'shops', SHOP), {
      name: 'Renamed Dairy',
      activeUntil: Date.now() + 999 * DAY,
    })));

  await check('CAN still rename my shop while expired', () =>
    assertSucceeds(updateDoc(doc(owner, 'shops', SHOP), { name: 'Renamed Dairy' })));

  await check('CAN cancel my own renewal (only ever reduces access)', () =>
    assertSucceeds(updateDoc(doc(owner, 'shops', SHOP), { cancelAtPeriodEnd: true })));

  console.log('\n\n── Write grace for offline work ' + '─'.repeat(38));

  await seed(async (db) => {
    await updateDoc(doc(db, 'shops', SHOP), { activeUntil: Date.now() - 1 * DAY });
  });
  await check('lapsed 1 day ago: queued offline write still lands', () =>
    assertSucceeds(setDoc(doc(owner, 'shops', SHOP, 'deliveries', 'grace1'), { qty: 2 })));

  await seed(async (db) => {
    await updateDoc(doc(db, 'shops', SHOP), { activeUntil: Date.now() - 5 * DAY });
  });
  await check('lapsed 5 days ago: grace is over, write refused', () =>
    assertFails(setDoc(doc(owner, 'shops', SHOP, 'deliveries', 'grace2'), { qty: 2 })));

  console.log('\n\n── Comp accounts ' + '─'.repeat(53));

  await seed(async (db) => {
    await updateDoc(doc(db, 'shops', SHOP), {
      subStatus: 'comp', subSource: 'comp', activeUntil: 0, readOnlyUntil: 0,
    });
  });
  await check('comp shop can write despite activeUntil being 0', () =>
    assertSucceeds(setDoc(doc(owner, 'shops', SHOP, 'sales', 's1'), { total: 100 })));

  console.log('\n\n── Legacy shops (no billing fields) ' + '─'.repeat(34));

  await seed(async (db) => {
    await setDoc(doc(db, 'shops', 'legacy'), {
      name: 'Old Shop', ownerUid: OWNER, memberUids: [OWNER],
      defaultMilkRate: 200, defaultMilkQty: 2, currency: 'PKR',
      createdAt: Date.now(), updatedAt: Date.now(),
    });
  });
  await check('a shop from before subscriptions is not locked out', () =>
    assertSucceeds(setDoc(doc(owner, 'shops', 'legacy', 'customers', 'c1'), { name: 'Old' })));

  console.log('\n\n── Trial abuse ' + '─'.repeat(55));

  const TRIALER = 'uid_trialer';
  const trialer = env.authenticatedContext(TRIALER).firestore();
  // One deadline, stamped on the claim and reused by every shop write below —
  // which is exactly how the app now behaves.
  const trialerEnds = Date.now() + 7 * DAY;

  function newShopFor(uid, overrides = {}, endsAt = trialerEnds) {
    return {
      name: 'Fresh Dairy', ownerUid: uid, memberUids: [uid],
      defaultMilkRate: 200, defaultMilkQty: 2, currency: 'PKR',
      createdAt: Date.now(), updatedAt: Date.now(),
      subStatus: 'trialing', subPlan: null, subSource: 'trial',
      activeUntil: endsAt, readOnlyUntil: endsAt + 7 * DAY,
      trialUsed: true, trialStartedAt: Date.now(),
      ...overrides,
    };
  }

  await check('cannot create a shop with a trial but no claim', () =>
    assertFails(setDoc(doc(trialer, 'shops', 'fresh1'), newShopFor(TRIALER))));

  await check('CAN claim a trial once', () =>
    assertSucceeds(setDoc(doc(trialer, 'trialClaims', TRIALER), {
      shopId: 'fresh1', claimedAt: Date.now(), trialEndsAt: trialerEnds,
    })));

  await check('CAN create the shop the claim names', () =>
    assertSucceeds(setDoc(doc(trialer, 'shops', 'fresh1'), newShopFor(TRIALER))));

  await check('cannot overwrite the claim to point at a second shop', () =>
    assertFails(setDoc(doc(trialer, 'trialClaims', TRIALER), {
      shopId: 'fresh2', claimedAt: Date.now(), trialEndsAt: trialerEnds,
    })));

  await check('cannot delete the claim to start over', () =>
    assertFails(deleteDoc(doc(trialer, 'trialClaims', TRIALER))));

  await check('cannot create a SECOND trial shop', () =>
    assertFails(setDoc(doc(trialer, 'shops', 'fresh2'), newShopFor(TRIALER))));

  await check('cannot claim a 10-year trial', () =>
    assertFails(setDoc(doc(trialer, 'shops', 'fresh3'), newShopFor(TRIALER, {
      activeUntil: Date.now() + 3650 * DAY,
      readOnlyUntil: Date.now() + 3660 * DAY,
    }))));

  await check('cannot create a shop claiming to be already paid', () =>
    assertFails(setDoc(doc(trialer, 'shops', 'fresh4'), newShopFor(TRIALER, {
      subSource: 'manual', subStatus: 'active',
      activeUntil: Date.now() + 365 * DAY,
    }))));

  await check("cannot create a shop owned by somebody else", () =>
    assertFails(setDoc(doc(trialer, 'shops', 'fresh5'), newShopFor(OWNER))));

  const NOTRIAL = 'uid_no_trial';
  const noTrial = env.authenticatedContext(NOTRIAL).firestore();
  await check('CAN create a locked shop with no trial at all', () =>
    assertSucceeds(setDoc(doc(noTrial, 'shops', 'locked1'), newShopFor(NOTRIAL, {
      subStatus: 'none', subSource: 'none', activeUntil: 0, readOnlyUntil: 0, trialUsed: false,
    }))));

  await check('...and that locked shop genuinely cannot write', () =>
    assertFails(setDoc(doc(noTrial, 'shops', 'locked1', 'customers', 'c1'), { name: 'X' })));

  console.log('\n\n── Admin powers and their limits ' + '─'.repeat(37));

  await check('admin can read any shop', () =>
    assertSucceeds(getDoc(doc(staff, 'shops', SHOP_B))));

  await check('admin can read a shop\'s khaata for support', () =>
    assertSucceeds(getDoc(doc(staff, 'shops', SHOP_B, 'customers', 'c1'))));

  await check('ADMIN CANNOT change what a customer owes', () =>
    assertFails(updateDoc(doc(staff, 'shops', SHOP_B, 'customers', 'c1'), { balance: 0 })));

  await check('ADMIN CANNOT add a khaata entry to a shop', () =>
    assertFails(setDoc(doc(staff, 'shops', SHOP_B, 'khaataEntries', 'evil'), { amount: -5000 })));

  await check('ADMIN CANNOT rename a shop', () =>
    assertFails(updateDoc(doc(staff, 'shops', SHOP_B), { name: 'Seized' })));

  await check('admin CAN extend a subscription', () =>
    assertSucceeds(updateDoc(doc(staff, 'shops', SHOP_B), {
      activeUntil: Date.now() + 30 * DAY,
      readOnlyUntil: Date.now() + 37 * DAY,
      subStatus: 'active',
      updatedAt: Date.now(),
    })));

  await check('admin CAN suspend a shop', () =>
    assertSucceeds(updateDoc(doc(staff, 'shops', SHOP_B), {
      suspended: true, suspensionReason: 'test', updatedAt: Date.now(),
    })));

  await check('staff admin cannot grant themselves owner', () =>
    assertFails(setDoc(doc(staff, 'admins', ADMIN), { role: 'owner' })));

  await check('staff admin cannot add a new admin', () =>
    assertFails(setDoc(doc(staff, 'admins', 'uid_smuggled'), { role: 'owner' })));

  await check('owner admin CAN add an admin', () =>
    assertSucceeds(setDoc(doc(superAdmin, 'admins', 'uid_new_staff'), { role: 'staff' })));

  await check('a normal user cannot make themselves an admin', () =>
    assertFails(setDoc(doc(owner, 'admins', OWNER), { role: 'owner' })));

  await check('a normal user cannot read the admin roster', () =>
    assertFails(getDoc(doc(owner, 'admins', ADMIN))));

  console.log('\n\n── Platform config ' + '─'.repeat(51));

  await check('anyone may read platform config (the app needs it)', () =>
    assertSucceeds(getDoc(doc(anon, 'platform', 'config'))));

  await check('a shopkeeper cannot rewrite platform config', () =>
    assertFails(updateDoc(doc(owner, 'platform', 'config'), { maintenance: true })));

  await check('staff admin cannot flip maintenance mode', () =>
    assertFails(updateDoc(doc(staff, 'platform', 'config'), { maintenance: true })));

  await check('owner admin CAN flip maintenance mode', () =>
    assertSucceeds(setDoc(doc(superAdmin, 'platform', 'config'), { maintenance: false }, { merge: true })));

  console.log('\n\n── Audit log is append-only ' + '─'.repeat(42));

  let auditId;
  await check('admin can append an audit entry', async () => {
    const ref = await addDoc(collection(staff, 'adminAudit'), {
      actorUid: ADMIN, action: 'test', detail: {}, at: serverTimestamp(),
    });
    auditId = ref.id;
    return assertSucceeds(Promise.resolve());
  });

  await check('admin cannot forge an entry as somebody else', () =>
    assertFails(addDoc(collection(staff, 'adminAudit'), {
      actorUid: SUPERADMIN, action: 'framed', detail: {}, at: serverTimestamp(),
    })));

  await check('nobody can edit an audit entry', () =>
    assertFails(updateDoc(doc(superAdmin, 'adminAudit', auditId), { action: 'tidied' })));

  await check('not even an owner admin can delete one', () =>
    assertFails(deleteDoc(doc(superAdmin, 'adminAudit', auditId))));

  console.log('\n\n── Discounts ' + '─'.repeat(57));

  await check('a shopkeeper can look up a code they know', () =>
    assertSucceeds(getDoc(doc(owner, 'discounts', 'LAUNCH50'))));

  await check('a shopkeeper cannot list every code', () =>
    assertFails(getDocs(collection(owner, 'discounts'))));

  await check('a shopkeeper cannot invent a code', () =>
    assertFails(setDoc(doc(owner, 'discounts', 'FREE100'), {
      code: 'FREE100', kind: 'percent', value: 100, scope: 'forever', active: true,
    })));

  await check('a shopkeeper cannot edit a code to be worth more', () =>
    assertFails(updateDoc(doc(owner, 'discounts', 'LAUNCH50'), { value: 100 })));

  await check('admin CAN create a code', () =>
    assertSucceeds(setDoc(doc(staff, 'discounts', 'EIDMUBARAK'), {
      code: 'EIDMUBARAK', kind: 'flat', value: 200, scope: 'first', active: true,
    })));

  console.log('\n\n── Payment claims ' + '─'.repeat(52));

  await check('a shopkeeper can report a JazzCash payment', () =>
    assertSucceeds(addDoc(collection(owner, 'paymentClaims'), {
      uid: OWNER, shopId: SHOP, amount: 850, method: 'jazzcash',
      reference: 'TX12345', status: 'pending', createdAt: Date.now(),
    })));

  await check('a claim cannot be created already approved', () =>
    assertFails(addDoc(collection(owner, 'paymentClaims'), {
      uid: OWNER, shopId: SHOP, amount: 850, method: 'cash',
      reference: 'x', status: 'approved', createdAt: Date.now(),
    })));

  await check('a shopkeeper cannot file a claim as another user', () =>
    assertFails(addDoc(collection(owner, 'paymentClaims'), {
      uid: OTHER, shopId: SHOP_B, amount: 850, method: 'cash',
      reference: 'x', status: 'pending', createdAt: Date.now(),
    })));

  await check('a shopkeeper cannot approve their own claim', async () => {
    let id;
    await seed(async (db) => {
      const ref = await addDoc(collection(db, 'paymentClaims'), {
        uid: OWNER, shopId: SHOP, amount: 850, method: 'cash', status: 'pending',
      });
      id = ref.id;
    });
    return assertFails(updateDoc(doc(owner, 'paymentClaims', id), { status: 'approved' }));
  });

  console.log('\n\n── Billing record ' + '─'.repeat(52));

  await seed(async (db) => {
    await setDoc(doc(db, 'subscriptions', SHOP), { shopId: SHOP, plan: 'monthly' });
    await setDoc(doc(db, 'subscriptions', SHOP, 'payments', 'pay1'), { amount: 850 });
  });

  await check('a shop can read its own billing history', () =>
    assertSucceeds(getDoc(doc(owner, 'subscriptions', SHOP))));

  await check('a shop cannot read another shop\'s billing history', () =>
    assertFails(getDoc(doc(other, 'subscriptions', SHOP))));

  await check('a shop cannot rewrite its own billing record', () =>
    assertFails(updateDoc(doc(owner, 'subscriptions', SHOP), { plan: 'annual' })));

  await check('a receipt can never be deleted, even by an owner admin', () =>
    assertFails(deleteDoc(doc(superAdmin, 'subscriptions', SHOP, 'payments', 'pay1'))));

  await check('admin CAN record a payment', () =>
    assertSucceeds(setDoc(doc(staff, 'subscriptions', SHOP, 'payments', 'pay2'), {
      amount: 2250, method: 'jazzcash', at: Date.now(),
    })));

  console.log('\n\n── Onboarding, the real path ' + '─'.repeat(42));

  // These cases pin down the constraint that broke sign-up on a real device:
  // a batch cannot create a shop and its subcollections at once, because the
  // subcollection rule reads the parent shop and a `get()` inside rules sees
  // the database as it was *before* the batch. `shopRepo.create` commits the
  // shop first for exactly this reason, and these tests keep it that way.
  const ONB = 'uid_onboarder';
  const onb = env.authenticatedContext(ONB).firestore();
  const NEWSHOP = 'shop_onboard';

  function freshShop(uid, trialEndsAt) {
    return {
      name: 'Bismillah Milk Shop', ownerUid: uid, memberUids: [uid],
      defaultMilkRate: 200, defaultMilkQty: 2, currency: 'PKR',
      createdAt: Date.now(), updatedAt: Date.now(), seedVersion: 1,
      subStatus: 'trialing', subPlan: null, subSource: 'trial',
      activeUntil: trialEndsAt, readOnlyUntil: trialEndsAt + 7 * DAY,
      trialUsed: true, trialStartedAt: Date.now(), cancelAtPeriodEnd: false,
    };
  }

  const onbEnds = Date.now() + 7 * DAY;

  await check('claim the trial, stamping the deadline', () =>
    assertSucceeds(setDoc(doc(onb, 'trialClaims', ONB), {
      shopId: NEWSHOP, claimedAt: Date.now(), trialEndsAt: onbEnds,
    })));

  await check('a claim cannot stamp a 10-year deadline', async () => {
    const greedy = 'uid_greedy_claim';
    const g = env.authenticatedContext(greedy).firestore();
    return assertFails(setDoc(doc(g, 'trialClaims', greedy), {
      shopId: 'x', claimedAt: Date.now(), trialEndsAt: Date.now() + 3650 * DAY,
    }));
  });

  await check('ONE batch (shop + seed together) is REFUSED — this was the bug', async () => {
    const b = writeBatch(onb);
    b.set(doc(onb, 'shops', NEWSHOP), freshShop(ONB, onbEnds));
    b.set(doc(onb, 'users', ONB), { shopId: NEWSHOP, createdAt: Date.now() });
    b.set(doc(onb, 'shops', NEWSHOP, 'categories', 'cat1'), { name: 'Milk', sortOrder: 0 });
    b.set(doc(onb, 'shops', NEWSHOP, 'products', 'p1'), { name: 'Milk', salePrice: 200 });
    return assertFails(b.commit());
  });

  await check('shop + user document together IS allowed', async () => {
    const b = writeBatch(onb);
    b.set(doc(onb, 'shops', NEWSHOP), freshShop(ONB, onbEnds));
    b.set(doc(onb, 'users', ONB), { shopId: NEWSHOP, createdAt: Date.now() });
    return assertSucceeds(b.commit());
  });

  await check('...THEN the seed catalogue in its own batch', async () => {
    const b = writeBatch(onb);
    b.set(doc(onb, 'shops', NEWSHOP, 'categories', 'cat1'), { name: 'Milk', sortOrder: 0 });
    b.set(doc(onb, 'shops', NEWSHOP, 'products', 'p1'), { name: 'Milk', salePrice: 200 });
    b.set(doc(onb, 'shops', NEWSHOP, 'expenseCategories', 'e1'), { name: 'Feed' });
    return assertSucceeds(b.commit());
  });

  await check('the trial the shop got matches the claim exactly', async () => {
    const snap = await getDoc(doc(onb, 'shops', NEWSHOP));
    if (snap.data().activeUntil !== onbEnds) throw new Error('deadline drifted from the claim');
    return assertSucceeds(Promise.resolve());
  });

  console.log('\n\n── Retrying a failed sign-up ' + '─'.repeat(41));

  // The second bug the device test exposed: the first attempt writes a claim,
  // so a retry must reuse that claim's shop id and deadline. A retry that
  // invented a new id would find the claim pointing elsewhere and lose the
  // trial.
  const RETRY = 'uid_retry';
  const retry = env.authenticatedContext(RETRY).firestore();
  const retryShop = 'shop_retry';
  const retryEnds = Date.now() + 7 * DAY;

  await check('first attempt claims, then "fails" before the shop lands', () =>
    assertSucceeds(setDoc(doc(retry, 'trialClaims', RETRY), {
      shopId: retryShop, claimedAt: Date.now(), trialEndsAt: retryEnds,
    })));

  await check('retry reusing the claim\'s shop id and deadline SUCCEEDS', () =>
    assertSucceeds(setDoc(doc(retry, 'shops', retryShop), freshShop(RETRY, retryEnds))));

  await check('a retry that invents a new shop id is refused', () =>
    assertFails(setDoc(doc(retry, 'shops', 'some_other_id'), freshShop(RETRY, retryEnds))));

  await check('a retry cannot help itself to a fresh 7 days', () =>
    assertFails(setDoc(doc(retry, 'shops', 'shop_retry_greedy'), freshShop(RETRY, Date.now() + 7 * DAY + 60000))));

  console.log('\n\n── Delete the shop and come back later ' + '─'.repeat(31));

  // An expired claim means the deadline has passed. The shop can still be
  // created — refusing outright would strand them — but it arrives locked for
  // an admin to activate, not with a fresh trial.
  const LATE = 'uid_late_returner';
  const late = env.authenticatedContext(LATE).firestore();

  await seed(async (db) => {
    await setDoc(doc(db, 'trialClaims', LATE), {
      shopId: 'shop_late', claimedAt: Date.now() - 60 * DAY,
      trialEndsAt: Date.now() - 53 * DAY,
    });
  });

  await check('cannot claim a fresh trial on an expired claim', () =>
    assertFails(setDoc(doc(late, 'shops', 'shop_late'), freshShop(LATE, Date.now() + 7 * DAY))));

  await check('CAN create the shop locked, for an admin to activate', () =>
    assertSucceeds(setDoc(doc(late, 'shops', 'shop_late'), {
      name: 'Late Dairy', ownerUid: LATE, memberUids: [LATE],
      defaultMilkRate: 200, defaultMilkQty: 2, currency: 'PKR',
      createdAt: Date.now(), updatedAt: Date.now(),
      subStatus: 'none', subPlan: null, subSource: 'none',
      activeUntil: 0, readOnlyUntil: 0, trialUsed: true, cancelAtPeriodEnd: false,
    })));

  await check('...and that locked shop cannot write a thing', () =>
    assertFails(setDoc(doc(late, 'shops', 'shop_late', 'customers', 'c1'), { name: 'X' })));

  // ── report ──────────────────────────────────────────────────────────────

  console.log('\n');
  if (failures.length) {
    console.error(`✗ ${failures.length} of ${passed + failures.length} rules tests FAILED:\n`);
    for (const f of failures) console.error(`   • ${f}\n`);
    await env.cleanup();
    process.exit(1);
  }
  console.log(`✓ security rules clean — ${passed} assertions, every one an attack or a right`);
  await env.cleanup();
}

function shopDocWithout(key) {
  const d = shopDoc();
  delete d[key];
  return d;
}

main().catch(async (e) => {
  console.error('\nTest harness crashed:', e);
  if (env) await env.cleanup();
  process.exit(1);
});
