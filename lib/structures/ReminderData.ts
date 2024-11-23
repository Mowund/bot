/* eslint-disable @typescript-eslint/no-unused-vars */

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
}

export interface ReminderDataSetOptions {
  content?: string;
  recursive?: boolean;
  timestamp?: number;
}
