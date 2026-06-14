import type { AgentGroup, AgentSpace } from '@devenv/types';
import type { ClientDeps } from './client-types';
import { handleFetchError } from './error-handler';

/**
 * Fetch the list of agent spaces from the backend.
 */
export async function getAgentSpaces(deps: ClientDeps): Promise<AgentSpace[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/agent-spaces`);
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  const data = (await response.json()) as { spaces: AgentSpace[] };
  return data.spaces;
}

export async function getPiSessions(deps: ClientDeps): Promise<AgentGroup[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/pi-sessions`);
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  const data = (await response.json()) as { agents: AgentGroup[] };
  return data.agents;
}

export async function getAgentSessions(deps: ClientDeps): Promise<AgentGroup[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/agent-sessions`);
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  const data = (await response.json()) as { agents: AgentGroup[] };
  return data.agents;
}

export async function getOpencodeAgents(deps: ClientDeps): Promise<string[]> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/opencode-agents`);
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  const data = (await response.json()) as { agents: string[] };
  return data.agents;
}

/**
 * Resolve the opencode agent .md file path for the given space id.
 * Returns the agents directory path and agent id.
 * Throws if no agent definition exists for the space.
 */
export async function resolveAgentFile(
  deps: ClientDeps,
  spaceId: string
): Promise<{ agentsDir: string; agentId: string }> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/agent-spaces/${encodeURIComponent(spaceId)}/extract-agent`, {
    method: 'POST',
  });
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  return (await response.json()) as { agentsDir: string; agentId: string };
}

/**
 * Resolve the opencode.json MCP config path.
 * Returns the full path so the caller can set OPENCODE_CONFIG.
 */
export async function resolveOpencodeConfig(deps: ClientDeps): Promise<{ configPath: string }> {
  const response = await deps.fetchFn(`${deps.baseUrl}/api/opencode-config/extract`, {
    method: 'POST',
  });
  if (!response.ok) {
    await handleFetchError(response, deps.onError);
  }
  return (await response.json()) as { configPath: string };
}
