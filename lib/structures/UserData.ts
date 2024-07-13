/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Snowflake } from 'discord.js';
import { App } from '../App.js';
import { UserRemindersDataManager } from '../managers/UserRemindersDataManager.js';
import { Base } from './Base.js';

export class UserData extends Base {
  ephemeralResponses?: boolean;
  ignoreEphemeralRoles?: boolean;
  autoLocale?: boolean;
  locale?: string;
  suppressedWarnings?: Record<Warnings, number>;

  constructor(client: App, data: UserData) {
    super(client);

    this.id = data.id;
    this.ephemeralResponses = data.ephemeralResponses;
    this.ignoreEphemeralRoles = data.ignoreEphemeralRoles;
    this.autoLocale = data.autoLocale;
    this.locale = data.locale;
    this.suppressedWarnings = data.suppressedWarnings;
  }

  get reminders() {
    return new UserRemindersDataManager(this);
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
  suppressedWarnings?: Record<Warnings, number>;
}
export enum Warnings {
  BotAppNotFound,
  InaccesibleMemberInfo,
}
