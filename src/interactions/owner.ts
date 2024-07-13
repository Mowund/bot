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
import * as defaults from '../defaults.js';
import * as utils from '../utils.js';

export default class Owner extends Command {
  constructor() {
    super(
      [
        {
          defaultMemberPermissions: PermissionFlagsBits.Administrator,
          description: 'OWNER.DESCRIPTION',
          name: 'OWNER.NAME',
          options: [
            {
              description: 'OWNER.OPTIONS.EVAL.DESCRIPTION',
              name: 'OWNER.OPTIONS.EVAL.NAME',
              options: [
                {
                  description: 'OWNER.OPTIONS.EVAL.OPTIONS.SCRIPT.DESCRIPTION',
                  name: 'OWNER.OPTIONS.EVAL.OPTIONS.SCRIPT.NAME',
                  required: true,
                  type: ApplicationCommandOptionType.String,
                },
                {
                  description: 'OWNER.OPTIONS.EVAL.OPTIONS.ASYNC.DESCRIPTION',
                  name: 'OWNER.OPTIONS.EVAL.OPTIONS.ASYNC.NAME',
                  type: ApplicationCommandOptionType.Boolean,
                },
                {
                  description: 'OWNER.OPTIONS.EVAL.OPTIONS.AWAIT.DESCRIPTION',
                  name: 'OWNER.OPTIONS.EVAL.OPTIONS.AWAIT.NAME',
                  type: ApplicationCommandOptionType.Boolean,
                },
              ],
              type: ApplicationCommandOptionType.Subcommand,
            },
            {
              description: 'OWNER.OPTIONS.COMMAND.DESCRIPTION',
              name: 'OWNER.OPTIONS.COMMAND.NAME',
              options: [
                {
                  description: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.DESCRIPTION',
                  name: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.NAME',
                  options: [
                    {
                      description: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.OPTIONS.ID.DESCRIPTION',
                      name: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.OPTIONS.ID.NAME',
                      type: ApplicationCommandOptionType.String,
                    },
                    {
                      description: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.OPTIONS.GUILD.DESCRIPTION',
                      name: 'OWNER.OPTIONS.COMMAND.OPTIONS.UPDATE.OPTIONS.GUILD.NAME',
                      type: ApplicationCommandOptionType.String,
                    },
                  ],
                  type: ApplicationCommandOptionType.Subcommand,
                },
              ],
              type: ApplicationCommandOptionType.SubcommandGroup,
            },
            {
              description: 'OWNER.OPTIONS.LOCALIZATION.DESCRIPTION',
              name: 'OWNER.OPTIONS.LOCALIZATION.NAME',
              options: [
                {
                  description: 'OWNER.OPTIONS.LOCALIZATION.OPTIONS.UPDATE.DESCRIPTION',
                  name: 'OWNER.OPTIONS.LOCALIZATION.OPTIONS.UPDATE.NAME',
                  type: ApplicationCommandOptionType.Subcommand,
                },
              ],
              type: ApplicationCommandOptionType.SubcommandGroup,
            },
            {
              description: 'OWNER.OPTIONS.SHARD.DESCRIPTION',
              name: 'OWNER.OPTIONS.SHARD.NAME',
              options: [
                {
                  description: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.DESCRIPTION',
                  name: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.NAME',
                  options: [
                    {
                      description: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.SHARD_DELAY.DESCRIPTION',
                      name: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.SHARD_DELAY.NAME',
                      type: ApplicationCommandOptionType.Integer,
                    },
                    {
                      description: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.RESPAWN_DELAY.DESCRIPTION',
                      name: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.RESPAWN_DELAY.NAME',
                      type: ApplicationCommandOptionType.Integer,
                    },
                    {
                      description: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.TIMEOUT.DESCRIPTION',
                      name: 'OWNER.OPTIONS.SHARD.OPTIONS.RESPAWN_ALL.OPTIONS.TIMEOUT.NAME',
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

    if (!defaults.botOwners.includes(user.id)) {
      return interaction.editReply({
        embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.DEVELOPERS_ONLY'))],
      });
    }

    const guild = await client.fetchGuild(guildO);

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
                .addFields({ name: localize('GENERIC.TYPE'), value: `\`\`\`ts\n${evaledType}\`\`\`` }),
            ],
          });
        } catch (err) {
          console.error(err);
          return interaction.editReply({
            embeds: [
              embed({ type: 'error' }).addFields({
                name: localize('GENERIC.OUTPUT'),
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
                      ? (await appCmds.fetch(idO, {
                          guildId: (guild ?? interaction.guild).id,
                          withLocalizations: true,
                        })) ?? (await appCmds.fetch(idO, { withLocalizations: true }))
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
                        console.log(
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
                        console.log(chalk.yellow(`Updated global command: ${cmd.name} (${cmd.id})`));
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
                console.log(chalk.red(`Deleted guild (${(guild ?? interaction.guild).id}) command: ${name} (${id})`));
              } else {
                await appCmds.delete(id);
                console.log(chalk.red(`Deleted global command: ${name} (${id})`));
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
                            ? localize('GENERIC.MESSAGE')
                            : o.type === ApplicationCommandType.User
                              ? localize('GENERIC.USER')
                              : localize('GENERIC.CHAT')
                        }**: \`${o.name}\``
                      : '',
                  )
                  .join('\n'),
              updCmdGlobal = cmdMap(updCmds),
              updCmdGuild = cmdMap(updCmds, true),
              delCmdGlobal = cmdMap(delCmds),
              delCmdGuild = cmdMap(delCmds, true);

            if (updCmds.size) {
              const e = embed({ title: localize('OWNER.OPTIONS.COMMAND.COMMANDS.UPDATED'), type: 'success' });
              if (updCmdGlobal) {
                e.addFields({
                  inline: true,
                  name: localize('OWNER.OPTIONS.COMMAND.COMMANDS.GLOBAL'),
                  value: updCmdGlobal,
                });
              }

              if (updCmdGuild) {
                e.addFields({
                  inline: true,
                  name: guild
                    ? localize('OWNER.OPTIONS.COMMAND.COMMANDS.SPECIFIED_GUILD', { guildName: guild.name })
                    : localize('OWNER.OPTIONS.COMMAND.COMMANDS.GUILD'),
                  value: updCmdGuild,
                });
              }
              embs.push(e);
            }
            if (delCmds.size) {
              const e = embed({ color: Colors.Red, title: `🗑️ ${localize('OWNER.OPTIONS.COMMAND.COMMANDS.DELETED')}` });
              if (delCmdGlobal) {
                e.addFields({
                  inline: true,
                  name: localize('OWNER.OPTIONS.COMMAND.COMMANDS.GLOBAL'),
                  value: delCmdGlobal,
                });
              }

              if (delCmdGuild) {
                e.addFields({
                  inline: true,
                  name: guild
                    ? localize('OWNER.OPTIONS.COMMAND.COMMANDS.SPECIFIED_GUILD', { guildName: guild.name })
                    : localize('OWNER.OPTIONS.COMMAND.COMMANDS.GUILD'),
                  value: delCmdGuild,
                });
              }
              embs.push(e);
            }

            return interaction.editReply({
              embeds: embs.length
                ? embs
                : [embed({ type: 'warning' }).setDescription(localize('OWNER.OPTIONS.COMMAND.NO_UPDATE'))],
            });
          }
        }
        break;
      }
      case 'localization': {
        switch (options.getSubcommand()) {
          case 'update': {
            await interaction.editReply({
              embeds: [embed({ type: 'loading' }).setDescription(localize('OWNER.OPTIONS.LOCALIZATION.UPDATING'))],
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
              embeds: [embed({ type: 'success' }).setDescription(localize('OWNER.OPTIONS.LOCALIZATION.UPDATED'))],
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
              embeds: [embed({ type: 'warning' }).setDescription(localize('OWNER.OPTIONS.SHARD.RESPAWNING'))],
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
