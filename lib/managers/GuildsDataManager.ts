import { CachedManager, Guild, Snowflake } from 'discord.js';
import { App } from '../App.js';
import { DataClassProperties } from '../../src/utils.js';
import { GuildData } from '../structures/GuildData.js';
import { UpdateFilter, WithoutId } from 'mongodb';

export class GuildsDataManager extends CachedManager<Snowflake, GuildData, GuildsDatabaseResolvable> {
  declare client: App;

  constructor(client: App) {
    super(client, GuildData);
  }

  async set<M extends boolean = true>(
    guild: GuildsDatabaseResolvable,
    data: M extends true ? UpdateFilter<DataClassProperties<GuildData>> : WithoutId<DataClassProperties<GuildData>>,
    { merge = true as M }: { merge?: M } = {},
  ) {
    const id = this.resolveId(guild);
    if (!id) throw new Error('Invalid guild type: GuildsDatabaseResolvable');

    const db = this.client.mongo.db('Mowund').collection<DataClassProperties<GuildData>>('guilds'),
      newData = merge
        ? await db.findOneAndUpdate({ _id: id }, data as UpdateFilter<DataClassProperties<GuildData>>, {
            returnDocument: 'after',
            upsert: true,
          })
        : await db.findOneAndReplace({ _id: id }, data as WithoutId<DataClassProperties<GuildData>>, {
            returnDocument: 'after',
            upsert: true,
          });

    await this.client.database.cacheDelete('guilds', id);
    return this.cache.set(id, new GuildData(this.client, newData)).get(id);
  }

  async fetch(id: Snowflake, { cache = true, force = false } = {}) {
    const existing = this.cache.get(id);
    if (!force && existing) return existing;

    const rawData = (await this.client.mongo
      .db('Mowund')
      .collection('guilds')
      .findOne({ _id: id as any })) as unknown as DataClassProperties<GuildData>;

    if (force && !rawData) return;

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
