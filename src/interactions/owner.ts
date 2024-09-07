import { readdirSync } from 'node:fs';
import nodeUtil from 'node:util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  BaseInteraction,
  Collection,
  Colors,
  PermissionFlagsBits,
  Snowflake,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import * as index from '../defaults.js';
import * as utils from '../utils.js';

export default class Owner extends Command {
  constructor() {
    super(
      [
        {
          defaultMemberPermissions: PermissionFlagsBits.Administrator,
          description: 'DESC.OWNER',
          name: 'CMD.OWNER',
          options: [
            {
              description: 'DESC.OWNER_EVAL',
              name: 'CMD.EVAL',
              options: [
                {
                  description: 'OWNER.EVAL.DESC.SCRIPT',
                  name: 'CMD.SCRIPT',
                  required: true,
                  type: ApplicationCommandOptionType.String,
                },
                {
                  description: 'OWNER.EVAL.DESC.ASYNC',
                  name: 'CMD.ASYNC',
                  type: ApplicationCommandOptionType.Boolean,
                },
                {
                  description: 'OWNER.EVAL.DESC.AWAIT',
                  name: 'CMD.AWAIT',
                  type: ApplicationCommandOptionType.Boolean,
                },
              ],
              type: ApplicationCommandOptionType.Subcommand,
            },
            {
              description: 'DESC.OWNER_COMMAND',
              name: 'CMD.COMMAND',
              options: [
                {
                  description: 'OWNER.COMMAND.DESC.UPDATE',
                  name: 'CMD.UPDATE',
                  options: [
                    {
                      description: 'OWNER.COMMAND.UPDATE.DESC.ID',
                      name: 'CMD.ID',
                      type: ApplicationCommandOptionType.String,
                    },
                    {
                      description: 'OWNER.COMMAND.UPDATE.DESC.GUILD',
                      name: 'CMD.GUILD',
                      type: ApplicationCommandOptionType.String,
                    },
                  ],
                  type: ApplicationCommandOptionType.Subcommand,
                },
              ],
              type: ApplicationCommandOptionType.SubcommandGroup,
            },
            {
              description: 'DESC.OWNER_LOCALIZATION',
              name: 'CMD.LOCALIZATION',
              options: [
                {
                  description: 'OWNER.LOCALIZATION.DESC.UPDATE',
                  name: 'CMD.UPDATE',
                  type: ApplicationCommandOptionType.Subcommand,
                },
              ],
              type: ApplicationCommandOptionType.SubcommandGroup,
            },
            {
              description: 'DESC.OWNER_SHARD',
              name: 'CMD.SHARD',
              options: [
                {
                  description: 'OWNER.SHARD.DESC.RESPAWN_ALL',
                  name: 'CMD.RESPAWN_ALL',
                  options: [
                    {
                      description: 'OWNER.SHARD.RESPAWN_ALL.DESC.SHARD_DELAY',
                      name: 'CMD.SHARD_DELAY',
                      type: ApplicationCommandOptionType.Integer,
                    },
                    {
                      description: 'OWNER.SHARD.RESPAWN_ALL.DESC.RESPAWN_DELAY',
                      name: 'CMD.RESPAWN_DELAY',
                      type: ApplicationCommandOptionType.Integer,
                    },
                    {
                      description: 'OWNER.SHARD.RESPAWN_ALL.DESC.TIMEOUT',
                      name: 'CMD.TIMEOUT',
                      type: ApplicationCommandOptionType.Integer,
                    },
                  ],
                  type: ApplicationCommandOptionType.Subcommand,
                },
              ],
              type: ApplicationCommandOptionType.SubcommandGroup,
            },
          ],
        },
      ],
      {
        guildOnly: ['420007989261500418'],
      },
    );
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    if (!interaction.isChatInputCommand()) return;

    const { client, embed, isEphemeral, localize } = args,
      { chalk } = client,
      { member, options, user } = interaction,
      idO = options.getString('id'),
      guildO = options.getString('guild'),
      __filename = fileURLToPath(import.meta.url),
      __dirname = dirname(__filename);

    await interaction.deferReply({ ephemeral: isEphemeral });

    if (!index.botOwners.includes(user.id)) {
      return interaction.editReply({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.DEVELOPERS_ONLY'))],
      });
    }

    const guild = guildO && (await client.guilds.fetch(guildO).catch(() => null));

    if (guildO && !guild) {
      return interaction.editReply({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.GUILD_NOT_FOUND'))],
      });
    }

    switch (options.getSubcommand()) {
      case 'eval': {
        const scriptO = options.getString('script'),
          asyncO = options.getBoolean('async') ?? true,
          awaitO = options.getBoolean('await') ?? true,
          script = asyncO ? `(async () => {${scriptO}})()` : scriptO;

        try {
          let evaled = awaitO ? await eval(script) : eval(script);
          const evaledType = typeof evaled;

          if (evaledType !== 'string') evaled = nodeUtil.inspect(evaled);

          return interaction.editReply({
            embeds: [
              embed({ type: 'success' })
                .setDescription(`\`\`\`ts\n${utils.truncate(evaled, 4087)}\`\`\``)
                .addFields({ name: localize('TYPE'), value: `\`\`\`ts\n${evaledType}\`\`\`` }),
            ],
          });
        } catch (err) {
          client.error(err);
          return interaction.editReply({
            embeds: [
              embed({ type: 'error' }).addFields({
                name: localize('OUTPUT'),
                value: `\`\`\`js\n${err}\`\`\``,
              }),
            ],
          });
        }
      }
    }

    switch (options.getSubcommandGroup()) {
      case 'command': {
        switch (options.getSubcommand()) {
          case 'update': {
            const embs = [],
              appCmds = client.application.commands,
              fAppCmds = await appCmds.fetch({ withLocalizations: true }),
              fGdCmds =
                (guild ?? interaction.guild) &&
                (await appCmds.fetch({ guildId: (guild ?? interaction.guild).id, withLocalizations: true })),
              updCmds = new Collection<Snowflake, ApplicationCommand>();

            let delCmds = new Collection<Snowflake, ApplicationCommand>(fAppCmds);
            if (fGdCmds) delCmds = delCmds.concat(fGdCmds);

            try {
              for (const file of readdirSync(__dirname).filter(f => f.endsWith('.js'))) {
                const command = new (await import(`./${file}`)).default() as Command;
                for (const dt of command.structure) {
                  client.localizeData(dt);

                  const gOnly = command.options?.guildOnly?.find(i => i === (guild ?? interaction.guild)?.id),
                    findCmd = idO
                      ? ((await appCmds.fetch(idO, {
                          guildId: (guild ?? interaction.guild).id,
                          withLocalizations: true,
                        })) ?? (await appCmds.fetch(idO, { withLocalizations: true })))
                      : dt,
                    searchCmd =
                      fGdCmds?.find(c => c.name === findCmd.name) ?? fAppCmds.find(c => c.name === findCmd.name),
                    dataEquals = searchCmd?.equals(dt, true);

                  if (dt.name === findCmd.name) {
                    if (interaction.inGuild() && command.options?.guildOnly) {
                      if (idO) delCmds = delCmds.filter(c => c.name === dt.name);

                      const found = delCmds.find(c => c.name === dt.name);
                      delCmds =
                        found && command.options?.guildOnly?.includes(found?.guildId)
                          ? delCmds.filter(c => c.name !== dt.name)
                          : delCmds;

                      if ((!dataEquals || idO) && gOnly) {
                        const cmd = await appCmds.create(dt, guild?.id || gOnly);
                        updCmds.set(cmd.id, cmd);
                        client.log(
                          chalk.green(`Updated guild (${guild?.id || gOnly}) command: ${cmd.name} (${cmd.id})`),
                        );
                      }
                    } else if (!command.options?.guildOnly) {
                      if (idO) delCmds = delCmds.filter(c => c.name === dt.name);

                      const found = delCmds.find(c => c.name === dt.name);
                      delCmds = found ? delCmds.filter(c => c.name !== dt.name || c.guildId) : delCmds;

                      if ((!dataEquals || idO) && !guild) {
                        const cmd = await appCmds.create(dt);
                        updCmds.set(cmd.id, cmd);
                        client.log(chalk.yellow(`Updated global command: ${cmd.name} (${cmd.id})`));
                      }
                    }
                  }
                }
              }
            } catch (err) {
              await client.reportError(err, {
                embed: { footer: 'requested', member, user },
                message: 'An error occured while reloading an application command',
              });

              return interaction.editReply({
                embeds: [
                  embed({ type: 'error' }).setDescription(
                    `${localize('ERROR.RELOADING_APPLICATION_COMMAND')}\n\`\`\`js\n${err}\`\`\``,
                  ),
                ],
              });
            }

            delCmds.forEach(async ({ guildId, name }, id) => {
              if (guildId) {
                await (guild ?? interaction.guild).commands.delete(id);
                client.log(chalk.red(`Deleted guild (${(guild ?? interaction.guild).id}) command: ${name} (${id})`));
              } else {
                await appCmds.delete(id);
                client.log(chalk.red(`Deleted global command: ${name} (${id})`));
              }
            });

            client.globalCommandCount = client.countCommands(await appCmds.fetch());

            const cmdMap = (cmds: Collection<string, ApplicationCommand>, gOnly = false) =>
                cmds
                  .filter(o => (gOnly ? o.guildId : !o.guildId))
                  .map(o =>
                    (gOnly ? o.guildId : !o.guildId)
                      ? `**${
                          o.type === ApplicationCommandType.Message
                            ? localize('MESSAGE')
                            : o.type === ApplicationCommandType.User
                              ? localize('USER.NOUN')
                              : localize('CHAT')
                        }**: \`${o.name}\``
                      : '',
                  )
                  .join('\n'),
              updCmdGlobal = cmdMap(updCmds),
              updCmdGuild = cmdMap(updCmds, true),
              delCmdGlobal = cmdMap(delCmds),
              delCmdGuild = cmdMap(delCmds, true);

            if (updCmds.size) {
              const e = embed({ title: localize('OWNER.COMMAND.COMMANDS.UPDATED'), type: 'success' });
              if (updCmdGlobal) {
                e.addFields({
                  inline: true,
                  name: localize('OWNER.COMMAND.COMMANDS.GLOBAL'),
                  value: updCmdGlobal,
                });
              }

              if (updCmdGuild) {
                e.addFields({
                  inline: true,
                  name: guild
                    ? localize('OWNER.COMMAND.COMMANDS.SPECIFIED_GUILD', { guildName: guild.name })
                    : localize('OWNER.COMMAND.COMMANDS.GUILD'),
                  value: updCmdGuild,
                });
              }
              embs.push(e);
            }
            if (delCmds.size) {
              const e = embed({ color: Colors.Red, title: `🗑️ ${localize('OWNER.COMMAND.COMMANDS.DELETED')}` });
              if (delCmdGlobal) {
                e.addFields({
                  inline: true,
                  name: localize('OWNER.COMMAND.COMMANDS.GLOBAL'),
                  value: delCmdGlobal,
                });
              }

              if (delCmdGuild) {
                e.addFields({
                  inline: true,
                  name: guild
                    ? localize('OWNER.COMMAND.COMMANDS.SPECIFIED_GUILD', { guildName: guild.name })
                    : localize('OWNER.COMMAND.COMMANDS.GUILD'),
                  value: delCmdGuild,
                });
              }
              embs.push(e);
            }

            return interaction.editReply({
              embeds: embs.length
                ? embs
                : [embed({ type: 'warning' }).setDescription(localize('OWNER.COMMAND.NO_UPDATE'))],
            });
          }
        }
        break;
      }
      case 'localization': {
        switch (options.getSubcommand()) {
          case 'update': {
            await interaction.editReply({
              embeds: [embed({ type: 'loading' }).setDescription(localize('OWNER.LOCALIZATION.UPDATING'))],
            });

            await client.updateLocalizations();

            const metadata = [
              {
                description: 'ROLE_CONNECTION.LEVEL.DESCRIPTION',
                key: 'level',
                name: 'ROLE_CONNECTION.LEVEL.NAME',
                type: 2,
              },
              {
                description: 'ROLE_CONNECTION.MOWANS.DESCRIPTION',
                key: 'mowans',
                name: 'ROLE_CONNECTION.MOWANS.NAME',
                type: 2,
              },
              {
                description: 'ROLE_CONNECTION.PLAYING_SINCE.DESCRIPTION',
                key: 'playingsince',
                name: 'ROLE_CONNECTION.PLAYING_SINCE.NAME',
                type: 6,
              },
            ];
            for (const d of metadata) client.localizeData(d);
            await client.application.editRoleConnectionMetadataRecords(metadata);

            return interaction.editReply({
              embeds: [embed({ type: 'success' }).setDescription(localize('OWNER.LOCALIZATION.UPDATED'))],
            });
          }
        }
        break;
      }
      case 'shard': {
        switch (options.getSubcommand()) {
          case 'respawn-all': {
            const shardDelayO = options.getInteger('shard-delay') ?? 5000,
              respawnDelayO = options.getInteger('respawn-delay') ?? 500,
              timeoutO = options.getInteger('timeout') ?? 30000;

            await interaction.editReply({
              embeds: [embed({ type: 'warning' }).setDescription(localize('OWNER.SHARD.RESPAWNING'))],
            });

            return client.shard.respawnAll({
              respawnDelay: respawnDelayO,
              shardDelay: shardDelayO,
              timeout: timeoutO,
            });
          }
        }
      }
    }
  }
}
