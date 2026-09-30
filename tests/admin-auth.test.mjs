import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { requireAdmin } from '../lib/admin-auth.js';
import getSubmissions from '../api/get-submissions.js';
import approveSubmission from '../api/approve-submission.js';
import syncGithub from '../api/sync-github.js';
import submit from '../api/submit.js';

const PROJECT_ID = 'nano-banana-d0fe0';
const ADMIN_UID = '8jD6GqU7D4P7FZ0P05xrtUUK2qJ2';
const KEY_ID = 'offline-test-key';
const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const attackerKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const originalFetch = globalThis.fetch;
const environmentKeys = ['FIREBASE_AUTH_EMULATOR_HOST', 'GITHUB_TOKEN', 'GITHUB_REPO', 'GITHUB_FILE_PATH'];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
let app;
let keyFetcher;
let originalFetchPublicKeys;
let fetchCalls;

function token(claims = {}, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: KEY_ID, typ: 'JWT', ...options.header };
  const payload = {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: ADMIN_UID,
    iat: now - 60,
    exp: now + 3600,
    auth_time: now - 60,
    firebase: { sign_in_provider: 'google.com', identities: {} },
    ...claims,
  };
  const input = [header, payload].map((value) => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.');
  const signature = header.alg === 'none' ? '' : sign('RSA-SHA256', Buffer.from(input), options.privateKey || keyPair.privateKey).toString('base64url');
  return `${input}.${signature}`;
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; this.ended = true; return this; },
    end() { this.ended = true; return this; },
  };
}

function request(method, authorization, body = {}) {
  return { method, headers: authorization === undefined ? {} : { authorization }, body, query: {} };
}

function mockFetch(replies) {
  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    assert.ok(replies.length > 0, 'Unexpected downstream request');
    const reply = replies.shift();
    return { ok: reply.ok ?? true, json: async () => reply.body, text: async () => reply.text || '' };
  };
}

before(() => {
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  app = getApps().find((item) => item.name === 'nanobanana-admin')
    || initializeApp({ projectId: PROJECT_ID }, 'nanobanana-admin');
  // Replace only remote public-key retrieval; claims and signatures use the real SDK.
  keyFetcher = getAuth(app).idTokenVerifier.signatureVerifier.keyFetcher;
  originalFetchPublicKeys = keyFetcher.fetchPublicKeys;
  keyFetcher.fetchPublicKeys = async () => ({
    [KEY_ID]: keyPair.publicKey.export({ type: 'spki', format: 'pem' }),
  });
});

beforeEach((context) => {
  fetchCalls = [];
  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    throw new Error('Network access is disabled in this test suite');
  };
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  context.mock.method(console, 'error', () => {});
  context.mock.method(console, 'log', () => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
});

after(async () => {
  keyFetcher.fetchPublicKeys = originalFetchPublicKeys;
  await deleteApp(app);
});

const invalidCredentials = [
  ['missing authorization', () => undefined],
  ['empty authorization', () => ''],
  ['wrong scheme', () => `Basic ${token()}`],
  ['empty bearer', () => 'Bearer '],
  ['multiple bearer values', () => `Bearer ${token()} extra`],
  ['non-string authorization', () => ['Bearer token']],
  ['malformed JWT', () => 'Bearer not-a-jwt'],
  ['forged signature', () => `Bearer ${token({}, { privateKey: attackerKeyPair.privateKey })}`],
  ['unsigned JWT', () => `Bearer ${token({}, { header: { alg: 'none' } })}`],
  ['expired JWT', () => `Bearer ${token({ exp: Math.floor(Date.now() / 1000) - 60 })}`],
  ['wrong project', () => `Bearer ${token({ aud: 'different-project' })}`],
  ['wrong issuer', () => `Bearer ${token({ iss: 'https://securetoken.google.com/different-project' })}`],
  ['empty subject', () => `Bearer ${token({ sub: '' })}`],
  ['unknown signing key', () => `Bearer ${token({}, { header: { kid: 'untrusted-key' } })}`],
];

describe('real Firebase ID token verification', () => {
  for (const [name, authorization] of invalidCredentials) {
    test(`rejects ${name}`, async () => {
      const res = response();
      assert.equal(await requireAdmin(request('POST', authorization()), res), null);
      assert.equal(res.statusCode, 401);
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(fetchCalls.length, 0);
    });
  }

  test('accepts a correctly signed administrator token', async () => {
    const idToken = token();
    const res = response();
    assert.equal(await requireAdmin(request('POST', `Bearer ${idToken}`), res), idToken);
    assert.equal(res.ended, false);
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  test('accepts case-insensitive bearer scheme', async () => {
    const idToken = token();
    assert.equal(await requireAdmin(request('POST', `bEaReR ${idToken}`), response()), idToken);
  });

  for (const [name, claims] of [
    ['regular user', { sub: 'regular-user' }],
    ['forged uid claim', { sub: 'regular-user', uid: ADMIN_UID }],
  ]) {
    test(`rejects ${name} with 403`, async () => {
      const res = response();
      assert.equal(await requireAdmin(request('POST', `Bearer ${token(claims)}`), res), null);
      assert.equal(res.statusCode, 403);
      assert.equal(fetchCalls.length, 0);
    });
  }

  test('fails closed when auth emulator is configured', async () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    const res = response();
    assert.equal(await requireAdmin(request('POST', `Bearer ${token()}`), res), null);
    assert.equal(res.statusCode, 500);
    assert.equal(fetchCalls.length, 0);
  });

  test('fails closed on key retrieval failure with the SDK invalid-argument status', async (context) => {
    context.mock.method(keyFetcher, 'fetchPublicKeys', async () => { throw new Error('offline fixture failure'); });
    const res = response();
    assert.equal(await requireAdmin(request('POST', `Bearer ${token()}`), res), null);
    // Firebase Admin maps key-fetch errors to auth/argument-error.
    assert.equal(res.statusCode, 401);
    assert.equal(fetchCalls.length, 0);
  });
});

const routes = [
  ['get-submissions', getSubmissions, 'GET', {}, 200],
  ['approve-submission', approveSubmission, 'POST', { submissionId: 'fixture-id' }, 200],
  ['sync-github', syncGithub, 'POST', { sections: [] }, 405],
];

for (const [name, handler, method, body, optionsStatus] of routes) {
  describe(`${name} authorization boundary`, () => {
    for (const [caseName, authorization] of invalidCredentials) {
      test(`${caseName} cannot reach downstream`, async () => {
        const res = response();
        await handler(request(method, authorization(), body), res);
        assert.equal(res.statusCode, 401);
        assert.equal(res.ended, true);
        assert.equal(fetchCalls.length, 0);
      });
    }

    test('regular user cannot reach downstream', async () => {
      const res = response();
      await handler(request(method, `Bearer ${token({ sub: 'regular-user' })}`, body), res);
      assert.equal(res.statusCode, 403);
      assert.equal(fetchCalls.length, 0);
    });

    test('rejects unsupported methods without downstream requests', async () => {
      const res = response();
      await handler(request('PATCH'), res);
      assert.equal(res.statusCode, 405);
      assert.equal(fetchCalls.length, 0);
    });

    test('preserves OPTIONS behavior without downstream requests', async () => {
      const res = response();
      await handler(request('OPTIONS'), res);
      assert.equal(res.statusCode, optionsStatus);
      assert.equal(fetchCalls.length, 0);
      if (optionsStatus === 200) assert.match(res.headers['access-control-allow-headers'], /Authorization/);
    });
  });
}

describe('authorized and ordinary-user flows with mocked downstream services', () => {
  test('administrator lists all pages and forwards the verified bearer on every request', async () => {
    const idToken = token();
    const document = (id, status) => ({
      name: `projects/${PROJECT_ID}/databases/(default)/documents/pending_submissions/${id}`,
      fields: { title: { stringValue: id }, status: { stringValue: status } },
    });
    mockFetch([
      { body: { documents: [document('first', 'pending'), document('reviewed', 'approved')], nextPageToken: 'page +/=' } },
      { body: { documents: [document('second', 'pending')] } },
    ]);
    const res = response();
    const req = request('GET', `Bearer ${idToken}`);
    req.query.status = 'all';
    await getSubmissions(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.map((item) => item.id), ['first', 'reviewed', 'second']);
    assert.equal(fetchCalls.length, 2);
    for (const call of fetchCalls) {
      assert.equal(call.options.method, 'GET');
      assert.equal(call.options.headers.Authorization, `Bearer ${idToken}`);
      assert.equal(new URL(call.url).hostname, 'firestore.googleapis.com');
    }
    assert.equal(new URL(fetchCalls[1].url).searchParams.get('pageToken'), 'page +/=');
  });

  for (const requestedStatus of [undefined, 'pending', 'approved', 'rejected']) {
    test(`administrator queries ${requestedStatus ?? 'default pending'} with its verified bearer and ignores readTime-only rows`, async () => {
      const idToken = token();
      const status = requestedStatus ?? 'pending';
      mockFetch([{ body: [
        { readTime: '2026-09-30T00:00:00Z' },
        { document: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/pending_submissions/fixture-${status}`,
          fields: { title: { stringValue: 'Fixture' }, status: { stringValue: status } },
        }, readTime: '2026-09-30T00:00:00Z' },
      ] }]);
      const req = request('GET', `Bearer ${idToken}`);
      if (requestedStatus !== undefined) req.query.status = requestedStatus;
      const res = response();
      await getSubmissions(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.data.map((item) => ({ id: item.id, status: item.status })), [
        { id: `fixture-${status}`, status },
      ]);
      assert.equal(fetchCalls.length, 1);
      const call = fetchCalls[0];
      assert.equal(call.options.method, 'POST');
      assert.equal(call.options.headers.Authorization, `Bearer ${idToken}`);
      assert.equal(new URL(call.url).hostname, 'firestore.googleapis.com');
      assert.equal(new URL(call.url).pathname, `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`);
      assert.deepEqual(JSON.parse(call.options.body), {
        structuredQuery: {
          from: [{ collectionId: 'pending_submissions' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: status },
            },
          },
        },
      });
    });
  }

  test('empty status-query results containing only readTime produce an empty list', async () => {
    mockFetch([{ body: [{ readTime: '2026-09-30T00:00:00Z' }] }]);
    const res = response();
    await getSubmissions(request('GET', `Bearer ${token()}`), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(fetchCalls.length, 1);
  });

  for (const status of ['unknown', 'Pending', 'approved,pending', '../all']) {
    test(`invalid status ${JSON.stringify(status)} returns 400 without downstream requests`, async () => {
      const req = request('GET', `Bearer ${token()}`);
      req.query.status = status;
      const res = response();
      await getSubmissions(req, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
      assert.equal(fetchCalls.length, 0);
    });
  }

  for (const [status, method] of [['all', 'GET'], ['pending', 'POST']]) {
    test(`${status} Firestore failure returns 500 without retrying or switching query branches`, async () => {
      mockFetch([{ ok: false, text: 'offline Firestore fixture failure' }]);
      const req = request('GET', `Bearer ${token()}`);
      req.query.status = status;
      const res = response();
      await getSubmissions(req, res);
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /offline Firestore fixture failure/);
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0].options.method, method);
    });
  }

  test('a later all-status page failure stops pagination and does not expose partial results', async () => {
    mockFetch([
      { body: { documents: [], nextPageToken: 'fixture-next-page' } },
      { ok: false, text: 'offline pagination fixture failure' },
    ]);
    const req = request('GET', `Bearer ${token()}`);
    req.query.status = 'all';
    const res = response();
    await getSubmissions(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.data, undefined);
    assert.equal(fetchCalls.length, 2);
    assert.equal(new URL(fetchCalls[1].url).searchParams.get('pageToken'), 'fixture-next-page');
  });

  test('administrator approval forwards the verified bearer and removes only the requested document', async () => {
    const idToken = token();
    mockFetch([{ body: {} }]);
    const res = response();
    await approveSubmission(request('POST', `Bearer ${idToken}`, { submissionId: 'fixture id#?' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].options.method, 'DELETE');
    assert.equal(fetchCalls[0].options.headers.Authorization, `Bearer ${idToken}`);
    assert.equal(new URL(fetchCalls[0].url).pathname.split('/').pop(), 'fixture%20id%23%3F');
  });

  for (const submissionId of [undefined, '', '.', '..', '../other', 'nested/document', 123]) {
    test(`approval rejects invalid document ID ${JSON.stringify(submissionId)}`, async () => {
      const res = response();
      await approveSubmission(request('POST', `Bearer ${token()}`, { submissionId }), res);
      assert.equal(res.statusCode, 400);
      assert.equal(fetchCalls.length, 0);
    });
  }

  test('administrator sync writes only to mocked GitHub using its separate server credential', async () => {
    process.env.GITHUB_TOKEN = 'offline-github-fixture';
    process.env.GITHUB_REPO = 'fixture/repository';
    process.env.GITHUB_FILE_PATH = 'public/data.json';
    mockFetch([{ body: { sha: 'old-fixture-sha' } }, { body: { commit: { sha: 'new-fixture-sha' } } }]);
    const body = { sections: [{ id: 'fixture-section' }], commonTags: ['fixture'], siteNotes: 'fixture-note' };
    const res = response();
    await syncGithub(request('POST', `Bearer ${token()}`, body), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.commit.sha, 'new-fixture-sha');
    assert.equal(fetchCalls.length, 2);
    for (const call of fetchCalls) {
      assert.equal(call.url, 'https://api.github.com/repos/fixture/repository/contents/public/data.json');
      assert.equal(call.options.headers.Authorization, 'token offline-github-fixture');
    }
    assert.equal(fetchCalls[1].options.method, 'PUT');
    const update = JSON.parse(fetchCalls[1].options.body);
    assert.equal(update.sha, 'old-fixture-sha');
    const uploaded = JSON.parse(Buffer.from(update.content, 'base64').toString('utf8'));
    assert.deepEqual(uploaded.sections, body.sections);
    assert.deepEqual(uploaded.commonTags, body.commonTags);
    assert.equal(uploaded.siteNotes, body.siteNotes);
  });

  test('anonymous submission remains permitted by the API and creates a pending record', async () => {
    mockFetch([{ body: { name: `projects/${PROJECT_ID}/databases/(default)/documents/pending_submissions/fixture-new` } }]);
    const res = response();
    await submit(request('POST', undefined, {
      title: 'Fixture submission', content: ['First line', 'Second line'], tags: ['fixture'],
      images: ['https://example.invalid/fixture.png'], contributor: 'Fixture contributor',
    }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, 'fixture-new');
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].options.method, 'POST');
    assert.equal(fetchCalls[0].options.headers.Authorization, undefined);
    const document = JSON.parse(fetchCalls[0].options.body);
    assert.equal(document.fields.status.stringValue, 'pending');
    assert.equal(document.fields.content.stringValue, 'First line\nSecond line');
    assert.equal(document.fields.action.stringValue, 'create');
  });
});
