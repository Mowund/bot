import process from 'node:process';
import dotenv from 'dotenv-extended';
import { ShardingManager } from 'discord.js';
import cs from 'console-stamp';
import { Chalk } from 'chalk';
import { App } from '../lib/App';

cs(console, {
  format: ':date(dd/mm/yyyy HH:MM:ss.l)',
});

dotenv.load({ errorOnRegex: true });

const manager = new ShardingManager('./dist/src/bot.js', {
    token: process.env.DISCORD_TOKEN,
    totalShards: process.env.NODE_ENV === 'development' ? 2 : 'auto',
  }),
  chalk = new Chalk({ level: 3 });

manager.on('shardCreate', shard =>
  console.log(chalk.gray('[') + chalk.magenta(shard.id + 1) + chalk.gray(']'), chalk.red('Launched shard')),
);
await manager.spawn();
await manager.broadcastEval((c: App) => (c.allShardsReady = true));
