/**********************************************************************
 * Copyright (c) 2019-2020 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/

import { ConfigStorage, PluginPackage } from '@theia/plugin-ext/lib/common';
import { MAIN_REMOTE_RPC_CONTEXT, PluginRemoteBrowser, ProxyNameDefinition } from '../common/plugin-remote-rpc';

import { RPCProtocol } from '@theia/plugin-ext/lib/common/rpc-protocol';

export class PluginRemoteBrowserImpl implements PluginRemoteBrowser {
  private mappingPluginHost: Map<string, string>;

  constructor(private readonly rpcs: Map<string, RPCProtocol>) {
    this.mappingPluginHost = new Map();
  }

  public addMapping(pluginID: string, host: string): void {
    this.mappingPluginHost.set(pluginID, host);
  }

  async $loadPlugin(pluginId: string, configStorage: ConfigStorage): Promise<void> {
    const matchingHost = this.mappingPluginHost.get(pluginId);
    if (matchingHost) {
      const rpc = this.rpcs.get(matchingHost)!;
      const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
      await nodeRemote.$loadPlugin(pluginId, configStorage);
    }
  }

  async $activatePlugin(pluginId: string): Promise<void> {
    const matchingHost = this.mappingPluginHost.get(pluginId);
    if (matchingHost) {
      const rpc = this.rpcs.get(matchingHost)!;
      const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
      await nodeRemote.$activatePlugin(pluginId);
    }
  }

  async $callMethod(
    fromHostId: string,
    pluginId: string,
    callId: number,
    entryName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Promise<any> {
    const matchingHost = this.mappingPluginHost.get(pluginId);
    if (matchingHost) {
      const rpc = this.rpcs.get(matchingHost)!;
      const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
      const result = await nodeRemote.$callMethod(fromHostId, pluginId, callId, entryName, ...args);
      return result;
    }
    throw new Error(`No matching host for the plugin with id ${pluginId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async $callLocalMethod(hostId: string, callId: number, index: number, ...args: any[]): Promise<any> {
    const rpc = this.rpcs.get(hostId)!;
    const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
    const localCallResult = await nodeRemote.$callLocalMethod(callId, index, ...args);
    return localCallResult;
  }

  async $definePluginExports(pluginId: string, proxyDefinitions: ProxyNameDefinition[]): Promise<void> {
    this.getOtherHosts(pluginId).map(async host => {
      const rpc = this.rpcs.get(host)!;
      const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
      await nodeRemote.$definePluginExports(host, pluginId, proxyDefinitions);
    });
  }

  async $definePluginPackage(pluginId: string, pluginPackage: PluginPackage): Promise<void> {
    this.getOtherHosts(pluginId).map(async host => {
      const rpc = this.rpcs.get(host)!;
      const nodeRemote = rpc.getProxy(MAIN_REMOTE_RPC_CONTEXT.PLUGIN_REMOTE_NODE);
      await nodeRemote.$definePluginPackage(pluginId, pluginPackage);
    });
  }

  /**
   * Provides all hosts that are not where the plugin is hosted.
   */
  protected getOtherHosts(pluginId: string): string[] {
    const matchingHost = this.mappingPluginHost.get(pluginId);
    if (matchingHost) {
      return Array.from(this.rpcs.keys()).filter(host => host !== matchingHost);
    } else {
      return [];
    }
  }
}
