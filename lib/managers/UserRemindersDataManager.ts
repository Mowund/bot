import { Collection, DataManager, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { ReminderData, ReminderDataSetOptions } from '../structures/ReminderData.js';
import { UserData } from '../structures/UserData.js';
import { DataClassProperties } from '../../src/utils.js';
import { RemindersDatabaseResolvable } from './RemindersDataManager.js';

export class UserRemindersDataManager extends DataManager<Snowflake, ReminderData, RemindersDatabaseResolvable> {
  declare client: App;
  userId: Snowflake;

  constructor(userData: UserData, reminders: DataClassProperties<ReminderData>[]) {
    super(userData.client, ReminderData);

    this.userId = userData.id;
    reminders?.forEach(r =>
      this.client.database.reminders.cache.set(
        r._id,
        new ReminderData(this.client, Object.assign(Object.create(r), { userId: userData.id })),
      ),
    );
  }

  get cache() {
    return this.client.database.reminders.cache.filter(r => r.userId === this.userId);
  }

  get user() {
    return this.client.database.users.cache.get(this.userId) ?? null;
  }

  set(reminder: RemindersDatabaseResolvable, data: ReminderDataSetOptions, { merge = true } = {}) {
    return this.client.database.reminders.set(reminder, this.userId, data, { merge });
  }

  fetch(options?: { cache?: boolean; force?: boolean }): Promise<Collection<string, ReminderData>>;
  fetch(options: { cache?: boolean; force?: boolean; reminderId: Snowflake }): Promise<ReminderData>;
  fetch(options: { cache?: boolean; force?: boolean; reminderId?: Snowflake } = {}) {
    return this.client.database.reminders.fetch(this.userId, options) as
      | Promise<Collection<string, ReminderData>>
      | Promise<ReminderData>;
  }

  delete(reminder: RemindersDatabaseResolvable) {
    return this.client.database.reminders.delete(reminder, this.userId);
  }
}
