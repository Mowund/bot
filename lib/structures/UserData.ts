import { App } from '../App.js';
import { UserRemindersDataManager } from '../managers/UserRemindersDataManager.js';
import { DataClassProperties } from '../../src/utils.js';
import { Base } from './Base.js';
import { UpdateFilter, WithoutId } from 'mongodb';

export class UserData extends Base {
  disabledDM?: boolean;
  ephemeralResponses?: boolean;
  gameIcon: string;
  ignoreEphemeralRoles?: boolean;
  locale?: string;
  suppressedWarnings?: Record<Warnings, number>;
  reminders?: UserRemindersDataManager;

  constructor(client: App, data: DataClassProperties<UserData, true>) {
    super(client);

    this.id = data._id;
    this.disabledDM = data.disabledDM;
    this.ephemeralResponses = data.ephemeralResponses;
    this.gameIcon = data.gameIcon;
    this.ignoreEphemeralRoles = data.ignoreEphemeralRoles;
    this.locale = data.locale;
    this.suppressedWarnings = data.suppressedWarnings;
    this.reminders =
      data.reminders instanceof UserRemindersDataManager
        ? data.reminders
        : new UserRemindersDataManager(this, data.reminders);
  }

  hasSuppressedWarning(warning: Warnings) {
    const now = Date.now(),
      suppressedWarnings = this.suppressedWarnings ?? ({} as Record<Warnings, number>);
    let hasExpired = false;

    for (const key in suppressedWarnings) {
      if (suppressedWarnings[key] < now) {
        delete suppressedWarnings[key];
        hasExpired ||= true;
      }
    }
    if (hasExpired) {
      this.set(
        Object.keys(suppressedWarnings).length
          ? { $set: { suppressedWarnings } }
          : { $unset: { suppressedWarnings: '' } },
      );
    }

    return suppressedWarnings[warning] ?? null;
  }

  suppressWarning(warning: Warnings, time = 7 * 24 * 60 * 60000) {
    const now = Date.now(),
      suppressedWarnings = this.suppressedWarnings ?? ({} as Record<Warnings, number>);

    for (const key in suppressedWarnings) if (suppressedWarnings[key] < now) delete suppressedWarnings[key];
    suppressedWarnings[warning] = now + time;

    return this.set({ $set: { suppressedWarnings } });
  }

  unsuppressWarning(warning: Warnings) {
    const now = Date.now(),
      suppressedWarnings = this.suppressedWarnings ?? ({} as Record<Warnings, number>);

    delete suppressedWarnings[warning];
    for (const key in suppressedWarnings) if (suppressedWarnings[key] < now) delete suppressedWarnings[key];

    return this.set(
      Object.keys(suppressedWarnings).length
        ? { $set: { suppressedWarnings } }
        : { $unset: { suppressedWarnings: '' } },
    );
  }

  set<M extends boolean = true>(
    data: M extends true ? UpdateFilter<DataClassProperties<UserData>> : WithoutId<DataClassProperties<UserData>>,
    { merge = true as M }: { merge?: M } = {},
  ) {
    return this.client.database.users.set(this.id, data, { merge });
  }

  delete() {
    return this.client.database.users.delete(this.id);
  }
}

export enum Warnings {
  BotAppNotFound,
  InaccesibleMemberInfo,
  CannotDM,
}
