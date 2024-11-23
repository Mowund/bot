import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { Base } from './Base.js';
import { DataClassProperties } from '../../src/utils.js';
import { UpdateFilter, WithoutId } from 'mongodb';

export class GuildData extends Base {
  allowNonEphemeral?: { channelIds?: Snowflake[]; roleIds?: Snowflake[] };
  autorole?: { allowBots?: boolean; enabled?: boolean; roleId?: Snowflake };

  constructor(client: App, data: DataClassProperties<GuildData, true>) {
    super(client);

    this.id = data._id;
    this.allowNonEphemeral = {
      channelIds: data.allowNonEphemeral?.channelIds && Object.values(data.allowNonEphemeral.channelIds),
      roleIds: data.allowNonEphemeral?.roleIds && Object.values(data.allowNonEphemeral.roleIds),
    };
    this.autorole = data.autorole;
  }

  set<M extends boolean = true>(
    data: M extends true ? UpdateFilter<DataClassProperties<GuildData>> : WithoutId<DataClassProperties<GuildData>>,
    { merge = true as M }: { merge?: M } = {},
  ) {
    return this.client.database.guilds.set(this.id, data, { merge });
  }

  delete() {
    return this.client.database.guilds.delete(this.id);
  }
}
