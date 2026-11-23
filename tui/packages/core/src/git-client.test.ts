import { expect, test } from 'bun:test';
import { gitCheckout, gitFetch, gitInitialCheckout, gitPull, gitPush } from './git-client';

test('mutating git actions start stable backend action ids', async () => {
  const requests: Array<{ url: string; body: any }> = [];
  const deps = { baseUrl: 'http://server', fetchFn: async (url: string, init?: RequestInit) => { requests.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined }); return new Response('{}', { status: 202 }); }, onError: () => {} } as any;
  await gitPull(deps, 'api'); await gitFetch(deps, 'api'); await gitPush(deps, 'api'); await gitCheckout(deps, 'api', 'feature');
  expect(requests.map((request) => request.body.actionId)).toEqual(['app/api/action/pull/git/default','app/api/action/fetch/git/default','app/api/action/push/git/default','app/api/action/checkout/git/default']);
  expect(requests[3].body.inputs).toEqual({ branch: 'feature' });
});

test('initial checkout clones through the git checkout endpoint', async () => {
  const requests: string[] = [];
  const deps = { baseUrl: 'http://server', fetchFn: async (url: string) => { requests.push(url); return new Response('{}', { status: 202 }); }, onError: () => {} } as any;
  await gitInitialCheckout(deps, 'api', 'feature/x');
  expect(requests).toEqual(['http://server/api/git/checkout?appIdent=api&branch=feature%2Fx']);
});
