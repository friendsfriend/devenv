import { createMemo, For, Show, type JSX } from 'solid-js';
import { useTerminalDimensions } from '@opentui/solid';
import { ScrollBoxRenderable, TextAttributes } from '@opentui/core';
import { uiColors } from '../colors';
import { GenericModal } from './GenericModal';
import { ModalTabs } from './ModalTabs';
import { focusSoon } from '../utils/focusSoon';
import { ScrollableContent } from './ScrollableContent';
import { RunningText } from './RunningText';

export interface HelpSection {
  title: string;
  items: Array<{
    key: string;
    description: string;
  }>;
}

export interface GuideEntry {
  key: string;
  title: string;
  description: string;
}

export type HelpTab = 'keybinds' | 'guides';

export interface HelpViewProps {
  sections: HelpSection[];
  viewTitle: string;
  onClose?: () => void;
  /** Whether to show all-contexts scope or current context only */
  allContexts?: boolean;
  /** Called when scope toggle changes */
  onScopeToggle?: (allContexts: boolean) => void;
  /** Available guides to display */
  guides?: GuideEntry[];
  /** Called when a guide is selected */
  onGuideSelect?: (guideKey: string) => void;
  /** Currently selected guide index (for list navigation) */
  selectedGuideIndex?: number;
  /** Active tab */
  activeTab?: HelpTab;
  /** Called when active tab changes */
  onTabChange?: (tab: HelpTab) => void;
  /** Called when keybind scrollbox is mounted */
  onKeybindScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
  /** Called when guide list scrollbox is mounted */
  onGuideScrollBoxReady?: (scrollBox: ScrollBoxRenderable) => void;
  /** Search is active and input should be shown */
  searchActive?: boolean;
  /** Current search query */
  searchQuery?: string;
  /** Called when user types in search */
  onSearchChange?: (query: string) => void;
  /** Whether long help text should scroll horizontally */
  runningTextEnabled?: boolean;
  /** Global running text tick offset */
  runningTextOffset?: number;
}

export function HelpView(props: HelpViewProps): JSX.Element {
  const activeTab = () => props.activeTab ?? 'keybinds';
  const dimensions = useTerminalDimensions();
  const descriptionWidth = createMemo(() => Math.max(10, Math.floor(dimensions().width * 0.72) - 24));

  const filteredSections = createMemo(() => {
    const q = (props.searchQuery ?? '').toLowerCase().trim();
    if (!q) return props.sections;

    return props.sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.key.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            section.title.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0);
  });

  const hasMatches = createMemo(() => filteredSections().length > 0);
  const guideCount = createMemo(() => props.guides?.length ?? 0);

  return (
    <GenericModal
      title="Help"
      widthPercent={0.72}
      heightPercent={0.78}
      helpText=""
      customFooter={<box style={{ height: 0 }} />}
      customHeader={
        <box style={{ width: '100%', flexDirection: 'column', flexShrink: 0 }}>
          <box style={{ width: '100%', flexDirection: 'row' }}>
            <text fg={uiColors.primary} attributes={TextAttributes.BOLD}>Help</text>
            <text fg={uiColors.textMuted}>{` — ${props.viewTitle}`}</text>
          </box>
          <ModalTabs
            activeId={activeTab()}
            onChange={(id) => props.onTabChange?.(id as HelpTab)}
            tabs={[
              { id: 'keybinds', label: 'Keybindings' },
              { id: 'guides', label: 'Guides', badge: guideCount() },
            ]}
          />
        </box>
      }
    >
      <Show
        when={activeTab() === 'guides'}
        fallback={
          <box style={{ width: '100%', height: '100%', flexDirection: 'column', minHeight: 0 }}>
            <Show when={props.searchActive}>
              <box style={{ width: '100%', flexDirection: 'row', flexShrink: 0, marginBottom: 1 }}>
                <text fg={uiColors.textMuted}>{'/ '}</text>
                <input
                  ref={(el: any) => {
                    focusSoon(el);
                  }}
                  onInput={(val: string) => props.onSearchChange?.(val)}
                  placeholder="Search keybinds..."
                  style={{ flexGrow: 1 }}
                  focusedBackgroundColor={uiColors.bgMantle}
                  focusedTextColor={uiColors.textPrimary}
                />
              </box>
            </Show>

            <ScrollableContent
              onScrollBoxReady={(r: ScrollBoxRenderable) => props.onKeybindScrollBoxReady?.(r)}
                            style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
            >
              <Show
                when={hasMatches()}
                fallback={
                  <box style={{ paddingLeft: 1 }}>
                    <text fg={uiColors.textSecondary}>
                      {`No keybinds match "${props.searchQuery ?? ''}"`}
                    </text>
                  </box>
                }
              >
                <For each={filteredSections()}>
                  {(section) => (
                    <box style={{ flexDirection: 'column', marginBottom: 1 }}>
                      <text fg={uiColors.borderHighlight} attributes={TextAttributes.BOLD}>
                        {section.title}
                      </text>
                      <For each={section.items}>
                        {(item) => (
                          <box style={{ flexDirection: 'row', paddingLeft: 1 }}>
                            <text fg={uiColors.textMuted} attributes={TextAttributes.BOLD}>
                              {item.key.padEnd(18).slice(0, 18)}
                            </text>
                            <RunningText text={item.description} width={descriptionWidth()} fg={uiColors.textPrimary} enabled={props.runningTextEnabled} active offset={props.runningTextOffset} />
                          </box>
                        )}
                      </For>
                    </box>
                  )}
                </For>
              </Show>
            </ScrollableContent>
          </box>
        }
      >
        <box style={{ width: '100%', height: '100%', flexDirection: 'column', minHeight: 0 }}>
          <ScrollableContent
            onScrollBoxReady={(r: ScrollBoxRenderable) => props.onGuideScrollBoxReady?.(r)}
                        style={{ width: '100%', flexGrow: 1, minHeight: 0 }}
          >
            <For each={props.guides ?? []}>
              {(guide, idx) => {
                const selected = () => props.selectedGuideIndex === idx();
                return (
                  <box style={{ width: '98%', flexDirection: 'column', marginBottom: 1, flexShrink: 0 }}>
                    <text
                      fg={selected() ? uiColors.primary : uiColors.textPrimary}
                      attributes={selected() ? TextAttributes.BOLD : undefined}
                    >
                      {`${selected() ? '› ' : '  '}${guide.title}`}
                    </text>
                    <RunningText text={`  ${guide.description}`} width={descriptionWidth()} fg={uiColors.textSecondary} enabled={props.runningTextEnabled} active={selected()} offset={props.runningTextOffset} />
                  </box>
                );
              }}
            </For>
          </ScrollableContent>
        </box>
      </Show>
    </GenericModal>
  );
}
