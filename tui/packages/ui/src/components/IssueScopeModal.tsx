import { TextAttributes } from "@opentui/core";
import { uiColors } from "../colors";
import { ListViewModal } from "./ListViewModal";
import { formatHelpText } from "./HelpText";

export interface IssueScopeModalProps {
	selectedIndex: number;
	onSelect: (index: number) => void;
	onSubmit: (scope: string) => void;
	onCancel: () => void;
}

const SCOPE_ITEMS: string[] = [
	"All issues",
	"Assigned to me",
	"Created by me",
	"No assignee",
];

const SCOPE_VALUES: string[] = [
	"all",
	"assigned-to-me",
	"created-by-me",
	"no-assignee",
];

function ScopeRow(props: { label: string; isSelected: boolean }) {
	const cursor = () => (props.isSelected ? "► " : "  ");

	return (
		<box
			backgroundColor={props.isSelected ? uiColors.bgSurface2 : undefined}
			style={{
				width: "100%",
				height: 1,
				paddingLeft: 1,
				paddingRight: 1,
			}}
		>
			<text
				fg={uiColors.textPrimary}
				attributes={props.isSelected ? TextAttributes.BOLD : undefined}
			>
				{cursor()}
				{props.label}
			</text>
		</box>
	);
}

export function IssueScopeModal(props: IssueScopeModalProps) {
	return (
		<ListViewModal
			title="Select Issue Scope"
			helpText={formatHelpText([
				{ key: "j/k", action: "Navigate" },
				{ key: "Enter", action: "Select" },
				{ key: "Esc", action: "Cancel" },
			])}
			widthPercent={0.3}
			heightPercent={0.4}
			items={SCOPE_ITEMS}
			selectedIndex={props.selectedIndex}
			reservedHeight={3}
			scrollIndicatorLabel="scopes"
			renderItem={(item, isSelected) => (
				<ScopeRow label={item} isSelected={isSelected()} />
			)}
		/>
	);
}
