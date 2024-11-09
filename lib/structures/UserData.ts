/* eslint-disable @typescript-eslint/no-unused-vars */

import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { UserRemindersDataManager } from '../managers/UserRemindersDataManager.js';
import { DataClassProperties } from '../../src/utils.js';
import { Base } from './Base.js';
import { ReminderData, ReminderDataSetOptions } from './ReminderData.js';

export class UserData extends Base {
  ephemeralResponses?: boolean;
  ignoreEphemeralRoles?: boolean;
  autoLocale?: boolean;
  locale?: string;
  suppressedWarnings?: Record<Warnings, number>;
  reminders: UserRemindersDataManager;

  constructor(client: App, data: DataClassProperties<UserData>) {
    super(client);

    this.id = data._id;
    this.ephemeralResponses = data.ephemeralResponses;
    this.ignoreEphemeralRoles = data.ignoreEphemeralRoles;
    this.autoLocale = data.autoLocale;
    this.locale = data.locale;
    this.suppressedWarnings = data.suppressedWarnings;
    this.reminders = new UserRemindersDataManager(
      this,
      data.reminders as unknown as DataClassProperties<ReminderData>[],
    );
  }

  suppressWarning(warning: Warnings, time = 604800000) {
    const suppressedWarnings = this.suppressedWarnings;
    suppressedWarnings[warning] = Date.now() + time;
    return this.set({ suppressedWarnings });
  }

  set(data: UserDataSetOptions, { merge = true } = {}) {
    return this.client.database.users.set(this.id, data, { merge });
  }

  delete() {
    return this.client.database.users.delete(this.id);
  }

  _patch(data: any) {
    if ('ephemeralResponses' in data) this.ephemeralResponses = data.ephemeralResponses;
    if ('ignoreEphemeralRoles' in data) this.ignoreEphemeralRoles = data.ignoreEphemeralRoles;
    if ('autoLocale' in data) this.autoLocale = data.autoLocale;
    if ('locale' in data) this.locale = data.locale;
    if ('suppressedWarnings' in data) this.suppressedWarnings = data.suppresedWarnings;
    return data;
  }
}

export interface UserDataSetOptions {
  ephemeralResponses?: boolean;
  ignoreEphemeralRoles?: boolean;
  autoLocale?: boolean;
  locale?: string;
  reminders?: ReminderDataSetOptions[];
  suppressedWarnings?: Record<Warnings, number>;
}
export enum Warnings {
  BotAppNotFound,
  InaccesibleMemberInfo,
}
