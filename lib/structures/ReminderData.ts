/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { Base } from './Base.js';
import { UserData } from './UserData.js';

export class ReminderData extends Base {
  content: string;
  recursive?: boolean;
  timestamp: number;
  user: UserData;

  constructor(client: App, data: DataClassProperties<ReminderData>) {
    super(client);

    this.id = data._id;
    this.content = data.content;
    this.recursive = data.recursive;
    this.timestamp = data.timestamp;
    this.user = data.user;
  }

  set(data: ReminderDataSetOptions, { merge = true } = {}) {
    return this.user.reminders.set(this.id, data, { merge });
  }

  delete() {
    return this.user.reminders.delete(this.id);
  }

  _patch(data: any) {
    if ('content' in data) this.content = data.content;
    if ('recursive' in data) this.recursive = data.recursive;
    if ('timestamp' in data) this.timestamp = data.timestamp;
    if ('user' in data) this.user = data.user;
    return data;
  }
}

export interface ReminderDataSetOptions {
  content?: string;
  recursive?: boolean;
  timestamp?: number;
}
