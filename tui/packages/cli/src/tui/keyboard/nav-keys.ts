import type { KeyboardEvent } from './types';

export const isDownKey = (event: KeyboardEvent) =>
  event.name === 'j' || event.sequence === 'j' || event.name === 'down' || event.name === 'Down';

export const isUpKey = (event: KeyboardEvent) =>
  event.name === 'k' || event.sequence === 'k' || event.name === 'up' || event.name === 'Up';

export const isLeftKey = (event: KeyboardEvent) =>
  event.name === 'h' || event.sequence === 'h' || event.name === 'left' || event.name === 'Left';

export const isRightKey = (event: KeyboardEvent) =>
  event.name === 'l' || event.sequence === 'l' || event.name === 'right' || event.name === 'Right';
