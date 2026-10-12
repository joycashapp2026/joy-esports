// Joy Esports - automatic push notifications (runs on GitHub Actions, free)
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
webpush.setVapidDetails('https://joycashapp2026.github.io/', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

async function sendTo(docs, payload) {
  let ok = 0, dead = 0;
  for (let i = 0; i < docs.length; i += 40) {
    await Promise.all(docs.slice(i, i + 40).map(async (d) => {
      try {
        await webpush.sendNotification(JSON.parse(d.data().sub), JSON.stringify(payload), { TTL: 86400 });
        ok++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { dead++; try { await d.ref.delete(); } catch (x) {} }
      }
    }));
  }
  return { ok, dead };
}

(async () => {
  const metaRef = db.doc('meta/push');
  const metaSnap = await metaRef.get();
  const first = !metaSnap.exists;
  const sent = new Set((metaSnap.exists && metaSnap.data().sent) || []);

  const app = (await db.doc('app/main').get()).data() || {};
  const ms = await db.collection('matches').where('st', 'in', ['up', 'live']).get();
  const now = Date.now();

  const items = [];
  (app.ann || []).forEach(a => items.push({ k: 'a' + a.id, title: '📢 New Announcement', body: a.t }));
  (app.offers || []).forEach(o => { if (o.e > now) items.push({ k: 'o' + o.id, title: '🎁 New Offer', body: `${o.t}: deposit ${o.m}+ coins and get +${o.b} extra coins` }); });
  (app.tasks || []).forEach(t => { if (t.id > 1e6) items.push({ k: 't' + t.id, title: '🎯 New Mission', body: `${t.t} - reward ${t.r} deposit coins` }); });
  ms.forEach(d => {
    const m = d.data();
    items.push({ k: 'm' + m.id, title: m.free ? '🎮 New Free Match' : '🎮 New Match', body: `${m.title} · ${m.fee ? 'Entry ' + m.fee + ' coins' : 'FREE'}` });
    if (m.st === 'live') items.push({ k: 'l' + m.id, title: '🔴 Your match is LIVE', body: `${m.title} - open the app for Room ID & Password`, uids: Object.values(m.sm || {}) });
  });

  const fresh = items.filter(i => !sent.has(i.k));
  fresh.forEach(i => sent.add(i.k));

  if (!first && fresh.length) {
    const subs = (await db.collection('push').get()).docs;
    let broadcast = fresh.filter(i => !i.uids);
    const targeted = fresh.filter(i => i.uids);
    if (broadcast.length > 3) broadcast = [{ k: 'sum' + now, title: '🔔 Joy Esports', body: `${broadcast.length} new updates in the app. Open it to see what's new!` }];
    for (const i of broadcast) await sendTo(subs, { title: i.title, body: i.body, tag: i.k });
    for (const i of targeted) await sendTo(subs.filter(d => i.uids.includes(d.id)), { title: i.title, body: i.body, tag: i.k });
    console.log('Sent', fresh.length, 'item(s) to', subs.length, 'subscriber(s)');
  } else {
    console.log(first ? 'First run: existing items marked as seen' : 'Nothing new');
  }
  await metaRef.set({ sent: [...sent].slice(-2000), at: now });
})().catch(e => { console.error(e); process.exit(1); });
