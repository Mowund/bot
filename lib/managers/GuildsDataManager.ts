/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */

import { firestore } from 'firebase-admin';
import { CachedManager, Collection, DiscordjsErrorCodes, DiscordjsTypeError, Guild, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { removeEmpty, SearchOptions, testConditions } from '../../src/utils.js';
import { GuildData, GuildDataSetOptions } from '../structures/GuildData.js';

export class GuildsDataManager extends CachedManager<Snowflake, GuildData, GuildsDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, GuildData);
  }

  async set(guild: GuildsDatabaseResolvable, data: GuildDataSetOptions, { merge = true } = {}) {
    const id = this.resolveId(guild);
    if (!id) throw new Error('Invalid guild type: GuildsDatabaseResolvable');

    const db = this.client.firestore.collection('guilds').doc(id),
      oldData =
        (this.cache.get(id) ||
          (((await db.get()) as firestore.DocumentSnapshot<firestore.DocumentData>)?.data() as
            | GuildData
            | undefined)) ??
        null,
      newData = oldData ? data : Object.assign(data, { id });

    await db.set(removeEmpty(newData), { merge });
    await this.client.database.cacheDelete('guilds', id);
    return this.cache.set(id, new GuildData(this.client, Object.assign(Object.create(oldData || {}), newData))).get(id);
  }

  async fetch(id: Snowflake, { cache = true, force = false } = {}) {
    const existing = this.cache.get(id);
    if (!force && existing) return existing;

    let data = (await this.client.firestore.collection('guilds').doc(id).get()).data() as GuildData | undefined;
    if (!data) return;

    data = new GuildData(this.client, Object.assign(Object.create(data), data));
    if (cache) {
      await this.client.database.cacheDelete('guilds', id);
      this.cache.set(id, data);
    }

    return data;
  }

  async find(search: SearchOptions[][], { cache = true, returnCache = false } = {}) {
    const existing = this.cache.filter(r => testConditions(search, r));
    if (returnCache && existing.size) return existing;

    const data = new Collection<Snowflake, GuildData>();
    let db: firestore.Query<firestore.DocumentData> = this.client.firestore.collection('guilds');

    for (const x of search) {
      x.forEach(y => (db = db.where(y.field, y.operator, y.target)));
      for (const z of (await db.get()).docs) {
        const d = z.data();
        data.set(z.id, new GuildData(this.client, Object.assign(Object.create(d), d)));
      }
    }
    if (cache) {
      data.forEach(async d => {
        await this.client.database.cacheDelete('guilds', d.id);
        this.cache.set(d.id, d);
      });
    }

    return data;
  }

  async delete(guild: GuildsDatabaseResolvable) {
    const id = this.resolveId(guild);
    if (!id) throw new Error('Invalid guild type: GuildsDatabaseResolvable');

    await this.client.firestore.collection('guilds').doc(id).delete();
    return this.client.database.cacheDelete('guilds', id);
  }
}

export type GuildsDatabaseResolvable = Snowflake | GuildData | Guild;
