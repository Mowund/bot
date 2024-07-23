import process from 'node:process';
import dotenv from 'dotenv-extended';
import { ShardingManager } from 'discord.js';
import { Chalk } from 'chalk';
import cs from 'console-stamp';
import { App } from '../lib/App';
import { isDev } from './defaults.js';

cs(console, {
  format: ':date(dd/mm/yyyy HH:MM:ss.l)',
});

dotenv.load({ errorOnRegex: true });

const manager = new ShardingManager('./dist/src/bot.js', {
    token: process.env.DISCORD_TOKEN,
    totalShards: isDev ? 2 : 'auto',
  }),
  chalk = new Chalk({ level: 3 });

manager.on('shardCreate', shard =>
  console.log(chalk.gray('[') + chalk.magenta(shard.id + 1) + chalk.gray(']'), chalk.red('Launched shard')),
);
await manager.spawn();
await manager.broadcastEval((c: App) => (c.allShardsReady = true));
