import { expect, test } from 'bun:test';
import { gitCheckout, gitFetch, gitPull, gitPush } from './git-client';

test('mutating git actions start stable backend action ids', async () => {
  const requests: Array<{ url: string; body: any }> = [];
  const deps = { baseUrl: 'http://server', fetchFn: async (url: string, init?: RequestInit) => { requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined }); return new Response('{}', { status: 202 }); }, onError: () => {} } as any;
  await gitPull(deps, 'api'); await gitFetch(deps, 'api'); await gitPush(deps, 'api'); await gitCheckout(deps, 'api', 'feature');
  expect(requests.map((request) => request.body.actionId)).toEqual(['app/api/action/pull/git/default','app/api/action/fetch/git/default','app/api/action/push/git/default','app/api/action/checkout/git/default']);
  expect(requests[3].body.inputs).toEqual({ branch: 'feature' });
});
