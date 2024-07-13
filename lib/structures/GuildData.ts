/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { Base } from './Base.js';

export class GuildData extends Base {
  allowNonEphemeral?: { channelIds?: Snowflake[]; roleIds?: Snowflake[] };
  autorole?: { allowBots?: boolean; enabled?: boolean; roleId?: Snowflake };

  constructor(client: App, data: GuildData) {
    super(client);

    this.id = data.id;
    this.allowNonEphemeral = {
      channelIds: data.allowNonEphemeral?.channelIds && Object.values(data.allowNonEphemeral.channelIds),
      roleIds: data.allowNonEphemeral?.roleIds && Object.values(data.allowNonEphemeral.roleIds),
    };
    this.autorole = data.autorole;
  }

  set(data: GuildDataSetOptions, { merge = true } = {}) {
    return this.client.database.guilds.set(this.id, data, { merge });
  }

  delete() {
    return this.client.database.guilds.delete(this.id);
  }

  _patch(data: any) {
    if ('allowNonEphemeral' in data) {
      this.allowNonEphemeral = {
        channelIds: Object.values(data.allowNonEphemeral?.channelIds),
        roleIds: Object.values(data.allowNonEphemeral?.roleIds),
      };
    }
    if ('autorole' in data) this.autorole = data.autoRole;

    return data;
  }
}

export interface GuildDataSetOptions {
  allowNonEphemeral?: { channelIds?: Snowflake[]; roleIds?: Snowflake[] };
}
