import { Base, CachedManager, Collection, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { GuildData } from '../structures/GuildData.js';
import { ReminderData } from '../structures/ReminderData.js';
import { UserData } from '../structures/UserData.js';
import { GuildsDataManager } from './GuildsDataManager.js';
import { RemindersDataManager } from './RemindersDataManager.js';
import { UsersDataManager } from './UsersDataManager.js';

export class DatabaseManager extends CachedManager<Snowflake, Base, Base> {
  declare client: App;
  guilds: GuildsDataManager;
  reminders: RemindersDataManager;
  users: UsersDataManager;

  constructor(client: App) {
    super(client, Base);

    this.guilds = new GuildsDataManager(client);
    this.reminders = new RemindersDataManager(client);
    this.users = new UsersDataManager(client);
  }

  cacheDelete(manager: 'guilds', id: Snowflake): Promise<Collection<Snowflake, GuildData>>;
  cacheDelete(manager: 'reminders', userId: Snowflake): Promise<Collection<Snowflake, ReminderData>>;
  cacheDelete(manager: 'users', id: Snowflake): Promise<Collection<Snowflake, UserData>>;
  async cacheDelete(manager: AnyDataName, id: Snowflake) {
    if (this.client.allShardsReady) {
      await this.client.shard.broadcastEval(
        (c: App, { i, m }: { i: Snowflake; m: typeof manager }) => c.database[m].cache.delete(i),
        {
          context: {
            i: id,
            m: manager,
          },
        },
      );
    } else {
      this[manager].cache.delete(id);
    }
    return this[manager].cache;
  }
}

export type AnyData = GuildData | ReminderData | UserData;
export type AnyDataName = 'guilds' | 'reminders' | 'users';
