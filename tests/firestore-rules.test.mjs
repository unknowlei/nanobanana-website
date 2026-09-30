import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import submitPrompt from '../api/submit.js';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = 'demo-nanobanana-rules';
const adminUid = '8jD6GqU7D4P7FZ0P05xrtUUK2qJ2';
const submissions = 'pending_submissions';

describe('Firestore rules on the local emulator', {
  skip: emulatorHost ? false : 'Set FIRESTORE_EMULATOR_HOST to a local Firestore emulator',
  concurrency: false,
}, () => {
  let environment;
  let api;
  let assertFails;
  let assertSucceeds;
  let anonymous;
  let ordinary;
  let admin;
  let sequence = 0;

  const submission = (overrides = {}) => ({
    title: 'Compatibility fixture',
    content: 'Existing prompt content\nwith multiple lines',
    tags: ['test', 'portrait'],
    images: ['https://example.invalid/submission.png'],
    contributor: 'Fixture contributor',
    notes: 'Existing notes',
    action: 'create',
    targetId: null,
    variantIndex: null,
    originalTitle: null,
    submissionType: 'new submission',
    status: 'pending',
    createdAt: new Date('2026-09-30T00:00:00Z'),
    processedAt: null,
    ...overrides,
  });
  const nextId = () => `fixture-${++sequence}`;
  const reference = (database, id, collection = submissions) => api.doc(database, collection, id);

  async function seed(collection = submissions) {
    const id = nextId();
    await environment.withSecurityRulesDisabled(async (context) => {
      await api.setDoc(reference(context.firestore(), id, collection), submission());
    });
    return id;
  }

  before(async () => {
    assert.match(emulatorHost, /^(?:127\.0\.0\.1|localhost):\d+$/, 'Only loopback emulators are allowed');
    const require = process.env.FIREBASE_RULES_TEST_PROJECT
      ? createRequire(path.resolve(process.env.FIREBASE_RULES_TEST_PROJECT, 'package.json'))
      : createRequire(import.meta.url);
    const testing = require('@firebase/rules-unit-testing');
    api = require('firebase/firestore');
    ({ assertFails, assertSucceeds } = testing);
    api.setLogLevel('silent');
    const [host, port] = emulatorHost.split(':');
    environment = await testing.initializeTestEnvironment({
      projectId,
      firestore: {
        host,
        port: Number(port),
        rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
      },
    });
    await environment.clearFirestore();
    anonymous = environment.unauthenticatedContext().firestore();
    ordinary = environment.authenticatedContext('ordinary-user', {
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();
    admin = environment.authenticatedContext(adminUid, {
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();
  });

  after(async () => {
    if (environment) {
      await environment.clearFirestore();
      await environment.cleanup();
    }
  });

  for (const identity of ['anonymous', 'ordinary']) {
    const database = () => identity === 'anonymous' ? anonymous : ordinary;

    test(`${identity} can create a normal pending submission with all existing fields`, async () => {
      const id = nextId();
      await assertSucceeds(api.setDoc(reference(database(), id), submission()));
      const saved = await api.getDoc(reference(admin, id));
      assert.equal(saved.data().status, 'pending');
      assert.equal(saved.data().processedAt, null);
      assert.deepEqual(saved.data().images, submission().images);
    });

    test(`${identity} can submit edits and variants for review`, async () => {
      for (const action of ['update', 'add-variant', 'edit-variant']) {
        await assertSucceeds(api.setDoc(reference(database(), nextId()), submission({
          action,
          targetId: 'existing-public-prompt',
          variantIndex: 0,
          originalTitle: 'Existing prompt',
          submissionType: action,
        })));
      }
    });

    test(`${identity} cannot create an already reviewed submission`, async () => {
      for (const status of ['approved', 'rejected']) {
        await assertFails(api.setDoc(reference(database(), nextId()), submission({ status })));
      }
      await assertFails(api.setDoc(reference(database(), nextId()), submission({
        processedAt: new Date('2026-09-30T00:00:00Z'),
      })));
    });

    test(`${identity} cannot omit the pending-state guards`, async () => {
      for (const missing of ['status', 'processedAt']) {
        const data = submission();
        delete data[missing];
        await assertFails(api.setDoc(reference(database(), nextId()), data));
      }
    });

    test(`${identity} cannot read a submission`, async () => {
      await assertFails(api.getDoc(reference(database(), await seed())));
    });

    test(`${identity} cannot list submissions`, async () => {
      await assertFails(api.getDocs(api.collection(database(), submissions)));
      await assertFails(api.getDocs(api.query(
        api.collection(database(), submissions), api.where('status', '==', 'pending'),
      )));
    });

    test(`${identity} cannot update or overwrite a submission`, async () => {
      const document = reference(database(), await seed());
      await assertFails(api.updateDoc(document, { status: 'approved', processedAt: api.serverTimestamp() }));
      await assertFails(api.setDoc(document, submission({ title: 'Overwritten' })));
    });

    test(`${identity} cannot batch-review submissions`, async () => {
      const ids = [await seed(), await seed()];
      const batch = api.writeBatch(database());
      for (const id of ids) {
        batch.update(reference(database(), id), {
          status: 'approved', processedAt: api.serverTimestamp(),
        });
      }
      await assertFails(batch.commit());
      for (const id of ids) {
        const saved = await api.getDoc(reference(admin, id));
        assert.equal(saved.data().status, 'pending');
        assert.equal(saved.data().processedAt, null);
      }
    });

    test(`${identity} cannot delete a submission`, async () => {
      await assertFails(api.deleteDoc(reference(database(), await seed())));
    });
  }

  test('an ordinary user cannot grant themselves administrator access with claims', async () => {
    const database = environment.authenticatedContext('ordinary-user', { admin: true, role: 'admin' }).firestore();
    await assertFails(api.getDoc(reference(database, await seed())));
  });

  test('the designated administrator can read and list submissions', async () => {
    await assertSucceeds(api.getDoc(reference(admin, await seed())));
    const pending = await assertSucceeds(api.getDocs(api.query(
      api.collection(admin, submissions), api.where('status', '==', 'pending'),
    )));
    assert.ok(pending.size > 0);
    await assertSucceeds(api.getDocs(api.collection(admin, submissions)));
  });

  test('the designated administrator can approve, reject, and restore submissions', async () => {
    const document = reference(admin, await seed());
    for (const status of ['approved', 'rejected']) {
      await assertSucceeds(api.updateDoc(document, { status, processedAt: api.serverTimestamp() }));
      const saved = await api.getDoc(document);
      assert.equal(saved.data().status, status);
      assert.ok(saved.data().processedAt);
    }
    await assertSucceeds(api.updateDoc(document, { status: 'pending', processedAt: null }));
    assert.equal((await api.getDoc(document)).data().processedAt, null);
  });

  test('the designated administrator can delete submissions', async () => {
    const document = reference(admin, await seed());
    await assertSucceeds(api.deleteDoc(document));
    assert.equal((await api.getDoc(document)).exists(), false);
  });

  test('the designated administrator can batch-review submissions', async () => {
    const ids = [await seed(), await seed()];
    for (const status of ['approved', 'rejected', 'pending']) {
      const batch = api.writeBatch(admin);
      for (const id of ids) {
        batch.update(reference(admin, id), {
          status,
          processedAt: status === 'pending' ? null : api.serverTimestamp(),
        });
      }
      await assertSucceeds(batch.commit());
      for (const id of ids) {
        const saved = await api.getDoc(reference(admin, id));
        assert.equal(saved.data().status, status);
        if (status === 'pending') {
          assert.equal(saved.data().processedAt, null);
        } else {
          assert.ok(saved.data().processedAt);
        }
      }
    }
  });

  test('other collections deny every identity read, list, create, update, and delete', async () => {
    const collection = 'unrelated_collection';
    const id = await seed(collection);
    for (const database of [anonymous, ordinary, admin]) {
      const document = reference(database, id, collection);
      await assertFails(api.getDoc(document));
      await assertFails(api.getDocs(api.collection(database, collection)));
      await assertFails(api.setDoc(reference(database, nextId(), collection), submission()));
      await assertFails(api.updateDoc(document, { title: 'Changed' }));
      await assertFails(api.deleteDoc(document));
    }
  });

  test('the unmodified anonymous submission API writes successfully through the actual rules', async () => {
    const originalFetch = globalThis.fetch;
    let writes = 0;
    const response = {
      statusCode: 200,
      setHeader() {},
      status(value) { this.statusCode = value; return this; },
      json(value) { this.body = value; return this; },
    };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input);
      assert.equal(url.origin, 'https://firestore.googleapis.com');
      assert.equal(init.method, 'POST');
      assert.ok(!init.headers.Authorization);
      writes += 1;
      return originalFetch(`http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents/${submissions}`, init);
    };
    try {
      await submitPrompt({ method: 'POST', body: submission({ status: 'approved' }) }, response);
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(writes, 1);
    assert.equal(response.statusCode, 200, JSON.stringify(response.body));
    assert.equal(response.body.success, true);
    assert.ok(response.body.id);
    const saved = await api.getDoc(reference(admin, response.body.id));
    assert.equal(saved.data().status, 'pending');
    assert.equal(saved.data().processedAt, null);
    assert.equal(saved.data().title, submission().title);
  });
});
