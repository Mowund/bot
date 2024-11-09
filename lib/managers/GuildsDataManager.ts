import { CachedManager, Guild, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { GuildData, GuildDataSetOptions } from '../structures/GuildData.js';

export class GuildsDataManager extends CachedManager<Snowflake, GuildData, GuildsDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, GuildData);
  }

  async set(guild: GuildsDatabaseResolvable, data: GuildDataSetOptions, { merge = true } = {}) {
    const id = this.resolveId(guild);
    if (!id) throw new Error('Invalid guild type: GuildsDatabaseResolvable');

    const db = this.client.mongo.db('Mowund').collection('guilds'),
      oldData =
        (this.cache.get(id) || ((await db.findOne({ _id: id as any })) as unknown as DataClassProperties<GuildData>)) ??
        null;

    if (merge) await db.updateOne({ _id: id as any }, { $set: data }, { upsert: true });
    else await db.replaceOne({ _id: id as any }, { $set: data }, { upsert: true });

    await this.client.database.cacheDelete('guilds', id);
    return this.cache
      .set(id, new GuildData(this.client, Object.assign(Object.create(oldData || {}), data, { id })))
      .get(id);
  }

  async fetch(id: Snowflake, { cache = true, force = false } = {}) {
    const existing = this.cache.get(id);
    if (!force && existing) return existing;

    const rawData = (await this.client.mongo
      .db('Mowund')
      .collection('guilds')
      .findOne({ _id: id as any })) as unknown as DataClassProperties<GuildData>;
    if (!rawData) return;

    const data = new GuildData(this.client, Object.assign(Object.create(rawData), { id }));
    if (cache) {
      await this.client.database.cacheDelete('guilds', id);
      this.cache.set(id, data);
    }

    return data;
  }

  /* async find(search: SearchOptions[][], { cache = true, returnCache = false } = {}) {
    const existing = this.cache.filter(r => testConditions(search, r));
    if (returnCache && existing.size) return existing;

    const data = new Collection<Snowflake, GuildData>();
    let db: firestore.Query<firestore.DocumentData> = this.client.firestore.collection('guilds');

    for (const x of search) {
      x.forEach(y => (db = this.client.mongo.db('Mowund').where(y.field, y.operator, y.target)));
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
  }*/

  async delete(guild: GuildsDatabaseResolvable) {
    const id = this.resolveId(guild);
    if (!id) throw new Error('Invalid guild type: GuildsDatabaseResolvable');

    await this.client.mongo
      .db('Mowund')
      .collection('guilds')
      .deleteOne({ _id: id as any });
    return this.client.database.cacheDelete('guilds', id);
  }
}

export type GuildsDatabaseResolvable = Snowflake | GuildData | Guild;
