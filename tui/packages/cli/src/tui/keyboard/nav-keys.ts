import type { KeyboardEvent } from './types';

export const isDownKey = (event: KeyboardEvent) =>
  event.name === 'j' || event.sequence === 'j' || event.name === 'down' || event.name === 'Down';

export const isUpKey = (event: KeyboardEvent) =>
  event.name === 'k' || event.sequence === 'k' || event.name === 'up' || event.name === 'Up';
