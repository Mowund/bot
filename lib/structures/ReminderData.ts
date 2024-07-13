/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { Base } from './Base.js';

export class ReminderData extends Base {
  channelId: Snowflake;
  content: string;
  isRecursive?: boolean;
  msTime: number;
  timestamp: number;
  userId: Snowflake;

  constructor(client: App, data: ReminderData) {
    super(client);

    this.id = data.id;
    this.channelId = data.channelId;
    this.content = data.content;
    this.isRecursive = data.isRecursive;
    this.msTime = data.msTime;
    this.timestamp = data.timestamp;
    this.userId = data.userId;
  }

  async set(data: ReminderDataSetOptions, { merge = true } = {}) {
    return (await this.client.database.users.fetch(this.userId)).reminders.set(this.id, data, { merge });
  }

  async delete() {
    return (await this.client.database.users.fetch(this.userId)).reminders.delete(this.id);
  }

  _patch(data: any) {
    if ('channelId' in data) this.channelId = data.channelId;
    if ('content' in data) this.content = data.content;
    if ('isRecursive' in data) this.isRecursive = data.isRecursive;
    if ('msTime' in data) this.msTime = data.msTime;
    if ('timestamp' in data) this.timestamp = data.timestamp;
    if ('userId' in data) this.userId = data.userId;
    return data;
  }
}

export interface ReminderDataSetOptions {
  channelId?: Snowflake;
  content?: string;
  isRecursive?: boolean;
  msTime?: number;
  timestamp?: number;
  userId?: Snowflake;
}
