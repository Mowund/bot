/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { Collection, DataManager, Snowflake } from 'discord.js';
import { firestore } from 'firebase-admin';
import { SearchOptions, testConditions } from '../../src/utils.js';
import { App } from '../App.js';
import { ReminderData, ReminderDataSetOptions } from '../structures/ReminderData.js';
import { UserData } from '../structures/UserData.js';
import { RemindersDatabaseResolvable } from './RemindersDataManager.js';

export class UserRemindersDataManager extends DataManager<Snowflake, ReminderData, RemindersDatabaseResolvable> {
  declare client: App;
  userData: UserData;

  constructor(userData: UserData) {
    super(userData.client, ReminderData);

    this.userData = userData;
  }

  get cache() {
    return this.client.database.reminders.cache.filter(r => r.userId === this.userData.id);
  }

  async set(reminder: RemindersDatabaseResolvable, data: ReminderDataSetOptions, { merge = true } = {}) {
    if (!this.cache.size) await this.fetch({ force: true });
    return this.client.database.reminders.set(reminder, this.userData.id, data, { merge });
  }

  async fetch(options?: { cache?: boolean; force?: boolean }): Promise<Collection<string, ReminderData>>;
  async fetch(options: { cache?: boolean; force?: boolean; reminderId: Snowflake }): Promise<ReminderData>;
  async fetch(options: { cache?: boolean; force?: boolean; reminderId?: Snowflake } = {}) {
    const noSize = !this.cache.size,
      { cache = true, force, reminderId } = options,
      existing = this.cache.get(reminderId),
      collection = this.client.firestore.collection('users').doc(this.userData.id).collection('reminders');

    if (!force && (existing || this.cache.size)) return existing || this.cache;

    let data: Collection<Snowflake, ReminderData> | ReminderData;

    if (force || noSize) {
      const rawData = (await collection.get()).docs as firestore.QueryDocumentSnapshot<firestore.DocumentData>[];
      if (!rawData.length) return;

      data = new Collection();
      for (const rD of rawData) {
        const d = rD.data() as ReminderData;
        data.set(d.id, new ReminderData(this.client, Object.assign(Object.create(d), d)));
      }

      if (cache) data.forEach(d => this.client.database.reminders.cache.set(d.id, d));

      if (reminderId) data = data.get(reminderId);
    } else {
      const rawData = (await collection.doc(reminderId).get()).data() as ReminderData | undefined;
      if (!rawData) return;

      data = new ReminderData(this.client, Object.assign(Object.create(rawData), rawData));
      if (cache) this.client.database.reminders.cache.set(reminderId, data);
    }

    return data;
  }

  async find(search: SearchOptions[][], { cache = true, returnCache = false } = {}) {
    if (!this.cache.size && cache) await this.fetch({ force: true });

    const existing = this.cache.filter(r => testConditions(search, r));
    if (returnCache && existing.size) return existing;

    const data = new Collection<Snowflake, ReminderData>();
    let db: firestore.Query<firestore.DocumentData> = this.client.firestore
      .collection('users')
      .doc(this.userData.id)
      .collection('reminders');

    for (const x of search) {
      x.forEach(y => (db = db.where(y.field, y.operator, y.target)));
      for (const z of (await db.get()).docs) {
        const d = z.data();
        data.set(z.id, new ReminderData(this.client, Object.assign(Object.create(d), d)));
      }
    }

    if (cache) data.forEach(d => this.client.database.reminders.cache.set(d.id, d));
    return data;
  }

  delete(reminder: RemindersDatabaseResolvable) {
    return this.client.database.reminders.delete(reminder, this.userData.id);
  }
}
