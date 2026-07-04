import type {
	AppStore,
	IssueStore,
	LogStore,
	ChangeRequestStore,
	ProviderStore,
	UiStore,
	AgentStore,
	AppDetailStore,
} from "../stores";
import type {
	AppActions,
	IssueActions,
	LogActions,
	CrActions,
	DockerActions,
	GitActions,
	ProviderActions,
	AgentActions,
	UtilActions,
	PipelineActions,
	HelpActions,
} from "../actions";
import type { TableColumn } from "@devenv/ui";

export interface ViewStores {
	appStore: AppStore;
	issueStore: IssueStore;
	logStore: LogStore;
	changeRequestStore: ChangeRequestStore;
	providerStore: ProviderStore;
	uiStore: UiStore;
	agentStore: AgentStore;
	appDetailStore: AppDetailStore;
}

export interface ViewActions {
	appActions: AppActions;
	issueActions: IssueActions;
	logActions: LogActions;
	crActions: CrActions;
	dockerActions: DockerActions;
	gitActions: GitActions;
	providerActions: ProviderActions;
	agentActions: AgentActions;
	utilActions: UtilActions;
	pipelineActions: PipelineActions;
	helpActions: HelpActions;
}

export interface ContentRouterProps {
	stores: ViewStores;
	actions: ViewActions;
	columns: TableColumn[];
	scriptColumns: TableColumn[];
	spinnerFrames: string[];
	dimensions: { width: number; height: number };
	runningTextEnabled?: boolean;
	runningTextOffset?: number;
	getTabBorderColor: (
		tab: "applications" | "infrastructure" | "libraries" | "scripts",
	) => string;
}

export interface ModalOverlaysProps {
	stores: ViewStores;
	actions: ViewActions;
	spinnerFrames: string[];
	dimensions: { width: number; height: number };
}
