import type { Discussion, MRChange } from '@devenv/types';
import { TimelineView, toTimelineItems } from './TimelineView';

interface DiscussionsViewProps {
  discussions: Discussion[];
  selectedIndex: number;
  currentHeadSHA?: string;
  changes?: MRChange[];
  onClose: () => void;
  loading?: boolean;
  error?: string;
  replyModeDiscussionId?: string | null;
  replyText?: string;
  showOnlyComments?: boolean;
}

/**
 * DiscussionsView — thin wrapper around TimelineView for MR discussions.
 * Normalizes Discussion[] → TimelineItem[] and passes MR-specific props.
 */
export function DiscussionsView(props: DiscussionsViewProps) {
  return (
    <TimelineView
      items={toTimelineItems(props.discussions)}
      selectedIndex={props.selectedIndex}
      currentHeadSHA={props.currentHeadSHA}
      changes={props.changes}
      onClose={props.onClose}
      loading={props.loading}
      error={props.error}
      replyModeId={props.replyModeDiscussionId}
      replyText={props.replyText}
      showOnlyComments={props.showOnlyComments}
    />
  );
}
