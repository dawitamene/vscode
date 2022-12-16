/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/base/common/uri';
import { MenuId, MenuRegistry, IMenuItem } from 'vs/platform/actions/common/actions';
import { ITerminalGroupService, ITerminalService as IIntegratedTerminalService } from 'vs/workbench/contrib/terminal/browser/terminal';
import { ResourceContextKey } from 'vs/workbench/common/contextkeys';
import { IFileService } from 'vs/platform/files/common/files';
import { IListService } from 'vs/platform/list/browser/listService';
import { getMultiSelectedResources, IExplorerService } from 'vs/workbench/contrib/files/browser/files';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { Schemas } from 'vs/base/common/network';
import { distinct } from 'vs/base/common/arrays';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Disposable } from 'vs/base/common/lifecycle';
import { isWindows } from 'vs/base/common/platform';
import { dirname, basename } from 'vs/base/common/path';
import { LifecyclePhase } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { IExternalTerminalConfiguration, IExternalTerminalService } from 'vs/platform/externalTerminal/common/externalTerminal';
import { TerminalLocation } from 'vs/platform/terminal/common/terminal';

const OPEN_IN_TERMINAL_COMMAND_ID = 'openInTerminal';
const OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID = 'openInIntegratedTerminal';
const OPEN_IN_EXTERNAL_TERMINAL_COMMAND_ID = 'openInExternalTerminal';

function registerOpenTerminalCommand(id: string, explorerKind: string) {
	CommandsRegistry.registerCommand({
		id: id,
		handler: async (accessor, resource: URI) => {

			const configurationService = accessor.get(IConfigurationService);
			const editorService = accessor.get(IEditorService);
			const fileService = accessor.get(IFileService);
			const integratedTerminalService = accessor.get(IIntegratedTerminalService);
			const remoteAgentService = accessor.get(IRemoteAgentService);
			const terminalGroupService = accessor.get(ITerminalGroupService);
			let externalTerminalService: IExternalTerminalService | undefined = undefined;
			try {
				externalTerminalService = accessor.get(IExternalTerminalService);
			} catch {
			}

			const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IExplorerService));
			return fileService.resolveAll(resources.map(r => ({ resource: r }))).then(async stats => {
				// Always use integrated terminal when using a remote
				const config = configurationService.getValue<IExternalTerminalConfiguration>();

				let isIntegratedKind = explorerKind === 'integrated';
				// Key binding compatible with historical command 'OPEN_IN_TERMINAL_COMMAND_ID'
				if (explorerKind === 'origin') {
					const config = configurationService.getValue<IExternalTerminalConfiguration>();
					isIntegratedKind = config.terminal.explorerKind === 'integrated';
				}
				const useIntegratedTerminal = remoteAgentService.getConnection() || isIntegratedKind;
				const targets = distinct(stats.filter(data => data.success));
				if (useIntegratedTerminal) {
					// TODO: Use uri for cwd in createterminal
					const opened: { [path: string]: boolean } = {};
					const cwds = targets.map(({ stat }) => {
						const resource = stat!.resource;
						if (stat!.isDirectory) {
							return resource;
						}
						return URI.from({
							scheme: resource.scheme,
							authority: resource.authority,
							fragment: resource.fragment,
							query: resource.query,
							path: dirname(resource.path)
						});
					});
					for (const cwd of cwds) {
						if (opened[cwd.path]) {
							return;
						}
						opened[cwd.path] = true;
						const instance = await integratedTerminalService.createTerminal({ config: { cwd } });
						if (instance && instance.target !== TerminalLocation.Editor && (resources.length === 1 || !resource || cwd.path === resource.path || cwd.path === dirname(resource.path))) {
							integratedTerminalService.setActiveInstance(instance);
							terminalGroupService.showPanel(true);
						}
					}
				} else if (externalTerminalService) {
					distinct(targets.map(({ stat }) => stat!.isDirectory ? stat!.resource.fsPath : dirname(stat!.resource.fsPath))).forEach(cwd => {
						externalTerminalService!.openTerminal(config.terminal.external, cwd);
					});
				}
			});
		}
	});
}

registerOpenTerminalCommand(OPEN_IN_TERMINAL_COMMAND_ID, 'origin');
registerOpenTerminalCommand(OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID, 'integrated');
registerOpenTerminalCommand(OPEN_IN_EXTERNAL_TERMINAL_COMMAND_ID, 'external');

export class ExternalTerminalContribution extends Disposable implements IWorkbenchContribution {
	private _openInIntegratedTerminalMenuItem: IMenuItem;
	private _openInExternalTerminalMenuItem: IMenuItem;

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();

		this._openInIntegratedTerminalMenuItem = {
			group: 'navigation',
			order: 30,
			command: {
				id: OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID,
				title: nls.localize('scopedConsoleAction.Integrated', "Open in Integrated Terminal")
			},
			when: ContextKeyExpr.and(
				ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote)),
				ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'integrated'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')),
			)
		};


		this._openInExternalTerminalMenuItem = {
			group: 'navigation',
			order: 31,
			command: {
				id: OPEN_IN_EXTERNAL_TERMINAL_COMMAND_ID,
				title: nls.localize('scopedConsoleAction.external', "Open in External Terminal")
			},
			when: ContextKeyExpr.and(
				ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.notEqualsTo(Schemas.vscodeRemote)),
				ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'external'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')),
			)
		};


		MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInExternalTerminalMenuItem);
		MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInIntegratedTerminalMenuItem);

		this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('terminal.explorerKind') || e.affectsConfiguration('terminal.external')) {
				this._refreshOpenInTerminalMenuItemTitle();
			}
		});

		this._refreshOpenInTerminalMenuItemTitle();
	}

	private isWindowsTerminal(): boolean {
		const config = this._configurationService.getValue<IExternalTerminalConfiguration>().terminal;
		if (isWindows && config.external?.windowsExec) {
			const file = basename(config.external.windowsExec);
			if (file === 'wt' || file === 'wt.exe') {
				return true;
			}
		}
		return false;
	}

	private _refreshOpenInTerminalMenuItemTitle(): void {
		if (this.isWindowsTerminal()) {
			this._openInIntegratedTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.wt', "Open in Windows Terminal");
		} else {
			this._openInIntegratedTerminalMenuItem.command.title = nls.localize('scopedConsoleAction', "Open in Integrated Terminal");
		}
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExternalTerminalContribution, LifecyclePhase.Restored);
