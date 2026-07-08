/** @jsxImportSource @opentui/solid */
import { Show } from 'solid-js';
import { HighlightedText } from './Highlight';
import { uiColors } from '../colors';

export interface FilterStatusBarProps {
  filterSummary?: string;
  sortSummary?: string;
}

export function FilterStatusBar(props: FilterStatusBarProps) {
  const hasStatus = () => !!props.filterSummary || !!props.sortSummary;

  return (
    <Show when={hasStatus()}>
      <box backgroundColor={uiColors.bgSurface2} style={{ width: '100%', height: 1, flexDirection: 'row', paddingLeft: 1, paddingRight: 1 }}>
        <Show when={props.filterSummary}>
          <HighlightedText text={` ${props.filterSummary!}`} highlight="highlight2" />
        </Show>
        <box style={{ width: 'auto', marginLeft: 'auto' }}>
          <Show when={props.sortSummary}>
            <HighlightedText text={`󰒺 ${props.sortSummary!}`} highlight="highlight3" />
          </Show>
        </box>
      </box>
    </Show>
  );
}
