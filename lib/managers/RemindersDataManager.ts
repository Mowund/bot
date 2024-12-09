/* eslint-disable @typescript-eslint/no-unused-vars, sort-keys */

import { inspect } from 'node:util';
import { CachedManager, Collection, Snowflake } from 'discord.js';
import { ConnectionCheckOutFailedEvent, Filter } from 'mongodb';
import chalk from 'chalk';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { ReminderData } from '../structures/ReminderData.js';
import { UserData } from '../structures/UserData.js';
import { mongoDB } from '../../src/defaults.js';

export class RemindersDataManager extends CachedManager<Snowflake, ReminderData, RemindersDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, ReminderData);
  }

  async set(
    reminder: RemindersDatabaseResolvable,
    userId: Snowflake,
    data: DataClassProperties<ReminderData>,
    { merge = true }: { merge?: boolean } = {},
  ) {
    const id = this.resolveId(reminder);
    if (!id) throw new Error('Invalid reminder type.');

    const db = this.client.mongo.db(mongoDB).collection('users'),
      user = await this.client.database.users.fetch(userId),
      existingReminder = user?.reminders.cache.find(r => r.id === id);

    let newData: DataClassProperties<ReminderData>;
    if (existingReminder) {
      newData = (
        (await db.findOneAndUpdate(
          { _id: userId as any, 'reminders._id': id },
          {
            $set: merge
              ? Object.fromEntries(Object.entries(data).map(([k, v]) => [`reminders.$.${k}`, v]))
              : { 'reminders.$': data },
          },
          { returnDocument: 'after' },
        )) as unknown as DataClassProperties<UserData>
      )?.reminders?.find(r => r._id === id);
    } else {
      newData = (
        (await db.findOneAndUpdate(
          { _id: userId as any },
          { $addToSet: { reminders: { _id: id, ...data } } },
          { upsert: true, returnDocument: 'after', projection: { reminders: { $elemMatch: { _id: id } } } },
        )) as unknown as DataClassProperties<UserData>
      )?.reminders?.[0];
    }

    const updatedReminder = new ReminderData(this.client, Object.assign(Object.create(newData), { userId }));
    await this.client.database.cacheDelete('reminders', id);

    return this.cache.set(id, updatedReminder).get(id);
  }

  async fetch(
    userId: Snowflake,
    options?: { cache?: boolean; force?: boolean },
  ): Promise<Collection<Snowflake, ReminderData>>;
  async fetch(
    userId: Snowflake,
    options: { cache?: boolean; force?: boolean; reminderId: Snowflake },
  ): Promise<ReminderData>;
  async fetch(userId: Snowflake, options: { cache?: boolean; force?: boolean; reminderId?: Snowflake } = {}) {
    const { cache = true, force = false, reminderId } = options;

    if (!reminderId) {
      if (!force) {
        const cachedData = this.cache.filter(r => r.userId === userId);
        if (cachedData.size) return cachedData;
      }

      const user = await this.client.database.users.fetch(userId, { cache, force }),
        reminders = user?.reminders.cache;

      return reminders;
    }

    const existing = this.cache.get(reminderId);
    if (!force && existing) return existing;

    const user = await this.client.database.users.fetch(userId, { cache, force }),
      reminders = user?.reminders.cache.get(reminderId);

    if (!reminders) return;

    return reminders;
  }

  async find(filter: Filter<ReminderData> = {}, { cache = true, ignoreDisabledDM = false } = {}) {
    const data = new Collection<Snowflake, ReminderData>(),
      db = this.client.mongo.db(mongoDB).collection('users'),
      users = await db
        .aggregate<DataClassProperties<UserData>>([
          ignoreDisabledDM ? { $match: { disabledDM: { $ne: true } } } : {},
          {
            $project: {
              reminders: {
                $filter: {
                  input: '$reminders',
                  as: 'reminder',
                  cond: Object.entries(filter).reduce((acc, [k, fO]) => {
                    Object.entries(fO).forEach(([c, m]) => {
                      acc[c] = [`$$reminder.${k}`, m];
                    });
                    return acc;
                  }, {}),
                },
              },
            },
          },
        ])
        .toArray();

    for (const user of users) {
      const userData = await this.client.database.users.fetch(user._id);

      if (cache) {
        await this.client.database.cacheDelete('users', user._id);
        this.client.database.users.cache.set(user._id, userData);
      }

      if (!user.reminders) continue;
      for (const r of user.reminders) {
        const reminderData = new ReminderData(this.client, Object.assign(Object.create(r), { userId: user._id }));
        data.set(r._id, reminderData);
      }
    }

    return data;
  }

  async delete(reminder: RemindersDatabaseResolvable, userId: Snowflake) {
    const id = this.resolveId(reminder);
    if (!id) throw new Error('Invalid reminder type.');

    const user = typeof reminder === 'object' ? reminder.user : await this.client.database.users.fetch(userId),
      db = this.client.mongo.db(mongoDB).collection('users');

    await db.updateOne(
      { _id: userId as any },
      user.reminders.cache.size > 1 ? { $pull: { reminders: { _id: id } } as any } : { $unset: { reminders: '' } },
    );

    await this.client.database.cacheDelete('reminders', id);

    return this.cache;
  }
}

export type RemindersDatabaseResolvable = Snowflake | ReminderData;
