import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { Base } from './Base.js';

export class ReminderData extends Base {
  userId: Snowflake;
  content: string;
  recursive?: boolean;
  timestamp: number;

  constructor(client: App, data: DataClassProperties<ReminderData>) {
    super(client);

    this.id = data._id;
    this.userId = data.userId;
    this.content = data.content;
    this.recursive = data.recursive;
    this.timestamp = data.timestamp;
  }

  get user() {
    return this.client.database.users.cache.get(this.userId) ?? null;
  }

  set(data: ReminderDataSetOptions, { merge = true } = {}) {
    return this.user.reminders.set(this.id, data, { merge });
  }

  delete() {
    return this.user.reminders.delete(this.id);
  }
}

export interface ReminderDataSetOptions {
  content?: string;
  recursive?: boolean;
  timestamp?: number;
}
