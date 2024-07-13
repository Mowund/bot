/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { firestore } from 'firebase-admin';
import { CachedManager, Collection, DiscordjsErrorCodes, DiscordjsTypeError, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { removeEmpty, SearchOptions, testConditions } from '../../src/utils.js';
import { ReminderData, ReminderDataSetOptions } from '../structures/ReminderData.js';

export class RemindersDataManager extends CachedManager<Snowflake, ReminderData, RemindersDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, ReminderData);
  }

  async set(
    reminder: RemindersDatabaseResolvable,
    userId: Snowflake,
    data: ReminderDataSetOptions,
    { merge = true } = {},
  ) {
    const id = this.resolveId(reminder);
    if (!id) throw new Error('Invalid reminder type.');

    const db = this.client.firestore.collection('users').doc(userId).collection('reminders').doc(id),
      oldData =
        (this.cache.get(id) ||
          (((await db.get()) as firestore.DocumentSnapshot<firestore.DocumentData>)?.data() as ReminderData)) ??
        null,
      newData = oldData ? data : Object.assign(data, { id });

    await db.set(removeEmpty(newData), { merge });
    await this.client.database.cacheDelete('reminders', id);
    return this.cache.set(id, new ReminderData(this.client, Object.assign(Object.create(oldData), newData))).get(id);
  }

  async fetch(id: Snowflake, userId: Snowflake, { cache = true, force = false } = {}) {
    const existing = this.cache.get(id);
    if (!force && existing) return existing;

    let data = (
      await this.client.firestore.collection('users').doc(userId).collection('reminders').doc(id).get()
    ).data() as ReminderData | undefined;

    if (!data) return;
    data = new ReminderData(this.client, Object.assign(Object.create(data), data));

    if (cache) {
      await this.client.database.cacheDelete('reminders', id);
      this.cache.set(id, data);
    }

    return data;
  }

  async find(search: SearchOptions[][], { cache = true, returnCache = false } = {}) {
    const existing = this.cache.filter(r => testConditions(search, r));
    if (returnCache && existing.size) return existing;

    const data = new Collection<Snowflake, ReminderData>();
    let db: firestore.Query<firestore.DocumentData> = this.client.firestore.collectionGroup('reminders');

    for (const x of search) {
      x.forEach(y => (db = db.where(y.field, y.operator, y.target)));
      for (const z of (await db.get()).docs) {
        const d = z.data();
        data.set(z.id, new ReminderData(this.client, Object.assign(Object.create(d), d)));
      }
    }
    if (cache) {
      data.forEach(async d => {
        await this.client.database.cacheDelete('reminders', d.id);
        this.cache.set(d.id, d);
      });
    }

    return data;
  }

  async delete(reminder: RemindersDatabaseResolvable, userId: Snowflake) {
    const id = this.resolveId(reminder);
    if (!id) throw new Error('Invalid reminder type.');

    await this.client.firestore.collection('users').doc(userId).collection('reminders').doc(id).delete();
    this.cache.delete(id);

    return this.cache;
  }
}

export type RemindersDatabaseResolvable = Snowflake | ReminderData;
