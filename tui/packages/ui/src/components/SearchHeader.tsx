/** @jsxImportSource @opentui/solid */
import { Show, type JSX } from 'solid-js';
import { colors, uiColors } from '../colors';

export interface SearchHeaderProps {
  searchMode?: boolean;
  searchQuery?: string;
  resultCount?: number;
  children: JSX.Element;
}

export function SearchHeader(props: SearchHeaderProps) {
  const hasSearch = () => (props.searchQuery ?? '').length > 0;

  return (
    <box
      backgroundColor={uiColors.bgSurface1}
      style={{
        width: '100%',
        height: 1,
        flexDirection: 'row',
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <Show
        when={props.searchMode || hasSearch()}
        fallback={props.children}
      >
        <box flexDirection="row">
          <text fg={colors.peach}>/</text>
          <text fg={uiColors.textPrimary}>{props.searchQuery ?? ''}</text>
          <Show when={props.searchMode}>
            <text fg={uiColors.primary}>█</text>
          </Show>
          <Show when={!props.searchMode && hasSearch() && props.resultCount !== undefined}>
            <text fg={uiColors.textMuted}> ({props.resultCount} results)</text>
          </Show>
        </box>
      </Show>
    </box>
  );
}
