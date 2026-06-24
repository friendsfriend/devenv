import { TextAttributes, RGBA } from "@opentui/core";
import { uiColors } from "@devenv/ui";
import type { AppStore, ProviderStore } from "../stores";

export function FirstStepsView(props: {
	appStore: AppStore;
	providerStore: ProviderStore;
}) {
	const hasProvider = () => props.providerStore.providers().length > 0;
	const selected = (idx: number) => props.appStore.firstStepsSelectedIndex() === idx;
	const cursor = (idx: number) => selected(idx) ? "► " : "  ";
	return (
		<box
			position="absolute"
			top={0}
			left={0}
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			backgroundColor={RGBA.fromInts(0, 0, 0, 120)}
		>
			<box
				border
				borderStyle="rounded"
				borderColor={uiColors.primary}
				backgroundColor={uiColors.bgMantle}
				style={{
					width: 64,
					flexDirection: "column",
					paddingLeft: 4,
					paddingRight: 4,
					paddingTop: 2,
					paddingBottom: 2,
					gap: 1,
				}}
			>
				<text fg={uiColors.primary} attributes={TextAttributes.BOLD}>
					Welcome to DevEnv
				</text>
				<text fg={uiColors.textPrimary}>No resources found yet.</text>
				<text fg={uiColors.textSecondary}>Pick one first step:</text>

				<box backgroundColor={selected(0) ? uiColors.bgSurface2 : undefined} style={{ width: "100%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
					<text fg={uiColors.textPrimary} attributes={selected(0) ? TextAttributes.BOLD : undefined}>
						{cursor(0)}Connect Git provider {hasProvider() ? "configured" : "recommended"}
					</text>
				</box>
				<box backgroundColor={selected(1) ? uiColors.bgSurface2 : undefined} style={{ width: "100%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
					<text fg={hasProvider() || selected(1) ? uiColors.textPrimary : uiColors.textSecondary} attributes={selected(1) ? TextAttributes.BOLD : undefined}>
						{cursor(1)}Add app or library {hasProvider() ? "next" : "needs provider"}
					</text>
				</box>
				<box backgroundColor={selected(2) ? uiColors.bgSurface2 : undefined} style={{ width: "100%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
					<text fg={uiColors.textPrimary} attributes={selected(2) ? TextAttributes.BOLD : undefined}>
						{cursor(2)}Create runnable example config
					</text>
				</box>
				<box backgroundColor={selected(3) ? uiColors.bgSurface2 : undefined} style={{ width: "100%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
					<text fg={uiColors.textPrimary} attributes={selected(3) ? TextAttributes.BOLD : undefined}>{cursor(3)}?  Help</text>
				</box>

				{props.appStore.exampleConfigMessage() ? (
					<text fg={props.appStore.exampleConfigLoading() ? uiColors.warning : uiColors.textSecondary}>
						{props.appStore.exampleConfigMessage()}
					</text>
				) : null}
				{props.providerStore.providersError() ? (
					<text fg={uiColors.error}>{props.providerStore.providersError()}</text>
				) : null}
				<text fg={uiColors.textMuted}>j/k or arrows move    enter selects    esc closes</text>
			</box>
		</box>
	);
}
