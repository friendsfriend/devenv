import type {
  App,
  AppStatus,
  CreateAppRequest,
  DockerInfo,
  GitInfo,
  InfraService,
} from '@devenv/types';
import type { ClientDeps } from './client-types';
import { handleFetchError } from './error-handler';

/**
 * Fetch all applications
 */
export async function getApps(deps: ClientDeps): Promise<App[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/apps`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const data = (await response.json()) as { apps: App[] };
  return data.apps;
}

/**
 * Fetch all infrastructure services
 */
export async function getInfraServices(deps: ClientDeps): Promise<InfraService[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/infra-services`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const data = (await response.json()) as { services: InfraService[] };
  return data.services;
}

export async function startInfraService(deps: ClientDeps, ident: string, runner?: string): Promise<void> {
  const params = runner ? `?runner=${encodeURIComponent(runner)}` : '';
  const response = await deps.fetchFn(`${deps.baseUrl}/api/infra-services/${encodeURIComponent(ident)}/start${params}`, { method: 'POST' });
  if (!response.ok) await handleFetchError(response, deps.onError);
}

export async function stopInfraService(deps: ClientDeps, ident: string): Promise<void> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/infra-services/${encodeURIComponent(ident)}/stop`, { method: 'POST' });
  if (!response.ok) await handleFetchError(response, deps.onError);
}

export async function getInfraServiceLogs(deps: ClientDeps, ident: string): Promise<string> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/infra-services/${encodeURIComponent(ident)}/logs`);
  if (!response.ok) await handleFetchError(response, deps.onError);
  return response.text();
}

/**
 * Get status for all applications (Docker + Git info)
 */
export async function getStatus(deps: ClientDeps): Promise<AppStatus[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/status`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  const data = (await response.json()) as { statuses: AppStatus[] };
  return data.statuses;
}

/**
 * Get Docker info for a specific app
 */
export async function getDockerInfo(deps: ClientDeps, ident: string): Promise<DockerInfo> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/apps/${ident}/docker`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as DockerInfo;
}

/**
 * Get Git info for a specific app
 */
export async function getGitInfo(deps: ClientDeps, ident: string): Promise<GitInfo> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/apps/${ident}/git`);

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as GitInfo;
}

export async function createApp(deps: ClientDeps, request: CreateAppRequest): Promise<App> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/apps/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }

  return (await response.json()) as App;
}

export async function deleteApp(deps: ClientDeps, ident: string): Promise<void> {
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/apps/${encodeURIComponent(ident)}/delete`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
}

/**
 * Get available profiles for an app (compose file variants + repo Dockerfile check)
 */
export async function getProfiles(
  deps: ClientDeps,
  appIdent: string
): Promise<{ profiles: string[]; hasDockerfile: boolean }> {
  const response = await deps.fetchFn(
    `${deps.baseUrl}/api/apps/${encodeURIComponent(appIdent)}/profiles`,
    { method: 'GET' }
  );

  if (!response.ok) {
    await handleFetchError(response, deps.onError);
    return { profiles: [], hasDockerfile: false };
  }

  return (await response.json()) as { profiles: string[]; hasDockerfile: boolean };
}
