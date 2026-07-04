import { TextAttributes, RGBA } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { uiColors } from "@devenv/ui";
import type { AppStore, ProviderStore } from "../stores";

export function FirstStepsView(props: {
	appStore: AppStore;
	providerStore: ProviderStore;
}) {
	const dimensions = useTerminalDimensions();
	const dialogWidth = () => Math.min(86, Math.max(40, dimensions().width - 4));
	const hasProvider = () => props.providerStore.providers().some((p) => !p.invalid);
	const invalidProviderCount = () => props.providerStore.providers().filter((p) => p.invalid).length;
	const hasWorkspaceResource = () => props.appStore.apps().length > 0 || props.appStore.infraServices().length > 0 || props.appStore.scriptVisibleRows().length > 0;
	const selected = (idx: number) => props.appStore.firstStepsSelectedIndex() === idx;
	const cursor = (idx: number) => selected(idx) ? "► " : "  ";
	const rowColor = (idx: number, done: boolean, fallback: string = uiColors.textPrimary) => done ? uiColors.success : selected(idx) ? uiColors.textPrimary : fallback;
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
					width: dialogWidth(),
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
				<text fg={uiColors.textPrimary}>Thank you for using DevEnv.</text>
				<text fg={uiColors.textSecondary}>Connect a provider, then add an app, load examples, or set up config sync.</text>

				<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
					<box style={{ width: 5, height: 1, justifyContent: "flex-end" }}>
						<text fg={hasProvider() ? uiColors.success : uiColors.textPrimary} attributes={hasProvider() ? TextAttributes.BOLD : undefined}>{hasProvider() ? "✓ 1." : "1."}</text>
					</box>
					<box backgroundColor={selected(0) ? uiColors.bgSurface2 : undefined} style={{ flexGrow: 1, height: 1, paddingLeft: 1, paddingRight: 1 }}>
						<text fg={rowColor(0, hasProvider())} attributes={selected(0) || hasProvider() ? TextAttributes.BOLD : undefined}>
							{cursor(0)}Connect Provider
						</text>
					</box>
				</box>
				<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
					<box style={{ width: 5, height: 1, justifyContent: "flex-end" }}>
						<text fg={hasWorkspaceResource() ? uiColors.success : uiColors.textPrimary} attributes={hasWorkspaceResource() ? TextAttributes.BOLD : undefined}>{hasWorkspaceResource() ? "✓ 2." : "2."}</text>
					</box>
					<box backgroundColor={selected(1) ? uiColors.bgSurface2 : undefined} style={{ width: "24%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
						<text fg={rowColor(1, hasWorkspaceResource(), hasProvider() ? uiColors.textPrimary : uiColors.textSecondary)} attributes={selected(1) || hasWorkspaceResource() ? TextAttributes.BOLD : undefined}>
							{cursor(1)}Add app
						</text>
					</box>
					<box style={{ width: "8%", height: 1, justifyContent: "center" }}>
						<text fg={uiColors.textMuted}>-or-</text>
					</box>
					<box backgroundColor={selected(2) ? uiColors.bgSurface2 : undefined} style={{ width: "24%", height: 1, paddingLeft: 1, paddingRight: 1 }}>
						<text fg={rowColor(2, hasWorkspaceResource())} attributes={selected(2) || hasWorkspaceResource() ? TextAttributes.BOLD : undefined}>
							{cursor(2)}Load examples
						</text>
					</box>
					<box style={{ width: "8%", height: 1, justifyContent: "center" }}>
						<text fg={uiColors.textMuted}>-or-</text>
					</box>
					<box backgroundColor={selected(3) ? uiColors.bgSurface2 : undefined} style={{ flexGrow: 1, height: 1, paddingLeft: 1, paddingRight: 1 }}>
						<text fg={selected(3) ? uiColors.textPrimary : uiColors.textSecondary} attributes={selected(3) ? TextAttributes.BOLD : undefined}>
							{cursor(3)}Config repo guide
						</text>
					</box>
				</box>
				<box style={{ width: "100%", height: 1, flexDirection: "row" }}>
					<box style={{ width: 5, height: 1, justifyContent: "flex-end" }}>
						<text fg={uiColors.textPrimary}>?</text>
					</box>
					<box backgroundColor={selected(4) ? uiColors.bgSurface2 : undefined} style={{ flexGrow: 1, height: 1, paddingLeft: 1, paddingRight: 1 }}>
						<text fg={uiColors.textPrimary} attributes={selected(4) ? TextAttributes.BOLD : undefined}>{cursor(4)}Help</text>
					</box>
				</box>

				{props.appStore.exampleConfigMessage() ? (
					<text fg={props.appStore.exampleConfigLoading() ? uiColors.warning : uiColors.textSecondary}>
						{props.appStore.exampleConfigMessage()}
					</text>
				) : null}
				{props.providerStore.providersError() ? (
					<text fg={uiColors.error}>{props.providerStore.providersError()}</text>
				) : null}
				{invalidProviderCount() > 0 ? (
					<text fg={uiColors.warning}>{invalidProviderCount()} provider(s) blocked: clear-text credentials found. Press c to open Providers, then edit or delete.</text>
				) : null}
				<text fg={uiColors.textMuted}>j/k rows    h/l or ←/→ options    enter selects    esc closes</text>
			</box>
		</box>
	);
}
