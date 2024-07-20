import process from 'node:process';
import dotenv from 'dotenv-extended';
import { ShardingManager } from 'discord.js';
import { Chalk } from 'chalk';
import 'log-timestamp';
import { App } from '../lib/App';
import { debugLevel } from './defaults.js';

dotenv.load({ errorOnRegex: true });

const manager = new ShardingManager('./dist/src/bot.js', {
    token: process.env.DISCORD_TOKEN,
    totalShards: debugLevel ? 2 : 'auto',
  }),
  chalk = new Chalk({ level: 3 });

manager.on('shardCreate', shard =>
  console.log(chalk.gray('[') + chalk.magenta(shard.id + 1) + chalk.gray(']'), chalk.red('Launched shard')),
);
await manager.spawn();
await manager.broadcastEval((c: App) => (c.allShardsReady = true));
