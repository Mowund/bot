import { parse } from 'twemoji-parser';
import {
  SnowflakeUtil,
  ButtonBuilder,
  ActionRowBuilder,
  RESTJSONErrorCodes,
  ButtonStyle,
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  parseEmoji,
  BaseInteraction,
  GuildEmoji,
  ModalMessageModalSubmitInteraction,
  ButtonInteraction,
  Colors,
  RoleSelectMenuBuilder,
  RoleSelectMenuInteraction,
  Integration,
  GuildFeature,
  Snowflake,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import { collMap, toUTS, getFieldValue, decreaseSizeCDN, disableComponents, beforeMatch, arrayMap } from '../utils.js';
import { imageOptions, premiumLimits } from '../defaults.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { App } from '../../lib/App.js';

export default class Emoji extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'EMOJI.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'EMOJI.NAME',
        options: [
          {
            description: 'EMOJI.OPTIONS.ADD.DESCRIPTION',
            name: 'EMOJI.OPTIONS.ADD.NAME',
            options: [
              {
                description: 'EMOJI.OPTIONS.ADD.OPTIONS.IMAGE.DESCRIPTION',
                name: 'EMOJI.OPTIONS.ADD.OPTIONS.IMAGE.NAME',
                required: true,
                type: ApplicationCommandOptionType.Attachment,
              },
              {
                description: 'EMOJI.OPTIONS.ADD.OPTIONS.NAME.DESCRIPTION',
                maxLength: 32,
                minLength: 2,
                name: 'EMOJI.OPTIONS.ADD.OPTIONS.NAME.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'EMOJI.OPTIONS.INFO.DESCRIPTION',
            name: 'EMOJI.OPTIONS.INFO.NAME',
            options: [
              {
                description: 'EMOJI.OPTIONS.INFO.OPTIONS.EMOJI.DESCRIPTION',
                name: 'EMOJI.OPTIONS.INFO.OPTIONS.EMOJI.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral, localize } = args,
      { appPermissions, guild, memberPermissions, user } = interaction,
      emojiLimit = guild
        ? (guild.features as GuildFeature | string[]).includes('MORE_STICKERS') && guild.premiumTier < 3
          ? 200
          : premiumLimits[guild.premiumTier].emojis
        : 0;

    let addBtnVsby = 0,
      editBtnVsby = 2;

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        isInfo = options.getSubcommand() === 'info',
        imageO = options.getAttachment('image'),
        inputO = isInfo ? options.getString('emoji') : options.getString('name'),
        parsedEmoji = isInfo ? parseEmoji(inputO) : { animated: false, id: null, name: null };

      let emj: GuildEmoji,
        shardEmj: [GuildEmoji & { guildId: Snowflake }, Snowflake[], Integration],
        emjId = parsedEmoji.id || inputO.match(/\d+/g)?.[0],
        emjName = parsedEmoji.name;

      if (isInfo) {
        emj =
          client.emojis.cache.get(emjId) ||
          (!parsedEmoji.id &&
            (guild?.emojis.cache.find(({ name }) => name === emjName) ||
              guild?.emojis.cache.find(({ name }) => name.toLowerCase() === emjName.toLowerCase())));
        shardEmj =
          (client.allShardsReady &&
            !emj &&
            ((await client.shard
              .broadcastEval(
                async (c: App, { d }) => {
                  const bE = c.emojis.cache.get(d);

                  if (bE) {
                    if (!bE.managed) await bE.fetchAuthor();
                    return [
                      bE,
                      (await import('discord.js'))
                        .discordSort(bE.roles.cache)
                        .map(({ id }) => id)
                        .reverse(),
                      bE.managed &&
                        (await bE.guild.fetchIntegrations()).get(bE.roles.cache.first()?.tags.integrationId),
                    ];
                  }
                },
                {
                  context: {
                    d: emjId,
                  },
                },
              )
              .then(eA => eA.find(e => e))) as typeof shardEmj)) ||
          null;
      } else {
        const alphanumI = /[^\w]/g.test(inputO) && (inputO.length < 2 || inputO.length > 32 ? 'also' : 'only'),
          lengthI = inputO.length < 2 ? 'shorter' : inputO.length > 32 && 'longer';

        if (!interaction.channel?.fetch || !interaction.inGuild()) {
          return interaction.reply({
            embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.DM'))],
            ephemeral: true,
          });
        }

        if (!memberPermissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
          return interaction.reply({
            embeds: [
              embed({ type: 'error' }).setDescription(
                localize('ERROR.PERM.USER.SINGLE.REQUIRES', { perm: localize('PERM.MANAGE_EXPRESSIONS') }),
              ),
            ],
            ephemeral: true,
          });
        }

        if (imageO.size > 256000) {
          return interaction.reply({
            embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.INVALID.IMAGE.SIZE', { maxSize: 256 }))],
            ephemeral: true,
          });
        }

        if (alphanumI || lengthI) {
          return interaction.reply({
            embeds: [
              embed({ type: 'error' }).setDescription(
                localize('ERROR.INVALID.NAME', {
                  alphanum: alphanumI,
                  condition: lengthI,
                  input: inputO,
                  maxLength: 32,
                  minLength: 2,
                }),
              ),
            ],
            ephemeral: true,
          });
        }
      }
      await interaction.deferReply({ ephemeral: isEphemeral });

      if (!isInfo) {
        emj = await guild.emojis
          .create({
            attachment: imageO.url,
            name: inputO,
            reason: `${user.tag} | ${localize('EMOJI.REASON.CREATED.COMMAND')}`,
          })
          .catch(async err => {
            if (
              [
                RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached,
                RESTJSONErrorCodes.MaximumNumberOfEmojisReached,
              ].includes(err.code)
            ) {
              await interaction.editReply({
                embeds: [
                  embed({ type: 'error' }).setDescription(
                    localize(
                      `ERROR.EMOJI.MAXIMUM.${
                        err.code === RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached ? 'ANIMATED' : 'STATIC'
                      }`,
                      { limit: emojiLimit },
                    ),
                  ),
                ],
              });
              return null;
            }
            throw err;
          });

        if (!emj) return;
      }

      const anyEmj = shardEmj?.[0] || emj,
        emjUnicodeURL = `https://twemoji.maxcdn.com/v/latest/72x72/`;

      if (anyEmj) {
        emjId = anyEmj.id;
        emjName = anyEmj.name;
      }

      let emjDisplay =
          (!interaction.guild || appPermissions.has(PermissionFlagsBits.UseExternalEmojis)) && anyEmj
            ? anyEmj.animated
              ? `<${anyEmj.identifier}> `
              : `<:${anyEmj.identifier}> `
            : `${client.useEmoji('emojiGhost')} `,
        emjCodePoint: string,
        emjURL = `https://cdn.discordapp.com/emojis/${parsedEmoji.id || emjId}`;

      const parsedTwemoji = parse(emjName)[0],
        imageType = parsedTwemoji
          ? 'twemoji'
          : (await fetch(`${emjURL}.gif`)).ok
            ? 'gif'
            : (await fetch(emjURL)).ok && 'png';

      switch (imageType) {
        case 'gif':
        case 'png':
          emjURL += `.${imageType}?size=${imageOptions.size}`;
          break;
        case 'twemoji':
          emjDisplay = `${parsedTwemoji.text} `;
          emjCodePoint = new URL(parsedTwemoji.url).pathname.split(/[/&.]/)[4];
          emjURL = `${emjUnicodeURL}${emjCodePoint}.png`;
          break;
        default:
          return interaction.editReply({
            embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.EMOJI.NOT_FOUND', { input: inputO }))],
          });
      }

      const emb = embed();
      if (parsedEmoji.id || anyEmj)
        emb.addFields({ inline: true, name: `📛 ${localize('GENERIC.NAME')}`, value: `\`${emjName}\`` });

      emb
        .setTitle(
          emjDisplay +
            localize(
              `EMOJI.${
                isInfo
                  ? emjCodePoint
                    ? 'VIEWING_UNICODE'
                    : anyEmj?.managed
                      ? 'VIEWING_INTEGRATION'
                      : 'VIEWING'
                  : 'ADDED'
              }`,
            ),
        )
        .addFields({
          inline: true,
          name: `🪪 ${localize(`GENERIC.${emjCodePoint ? 'CODEPOINT' : 'ID'}`)}`,
          value: `\`${emjCodePoint ?? emjId}\``,
        })
        .setThumbnail(emjURL)
        .setColor(Colors.Green)
        .setTimestamp(Date.now());

      if (emjCodePoint || parsedEmoji.id || anyEmj) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('mention')} ${localize('GENERIC.MENTION')}`,
          value: `\`${emjDisplay.trim() || `<${imageType === 'gif' ? 'a' : ''}:${emjName}:${emjId}>`}\``,
        });
      }

      if (!emjCodePoint) {
        emb.addFields({
          inline: true,
          name: `📅 ${localize('GENERIC.CREATED')}`,
          value: toUTS(SnowflakeUtil.timestampFrom(emjId)),
        });
      }

      if (anyEmj) {
        if (anyEmj.managed) {
          const integration = (shardEmj?.[2] ||
            (await emj.guild.fetchIntegrations()).get(emj.roles.cache.first()?.tags.integrationId)) as Integration & {
            userId: Snowflake;
          };

          emb.addFields({
            inline: true,
            name: `${client.useEmoji(integration.type)} ${localize('GENERIC.MANAGED_BY')}`,
            value: `<@${integration.userId || integration.user.id}>`,
          });
          editBtnVsby = 1;
        } else {
          emb.addFields({
            inline: true,
            name: `${client.useEmoji('user')} ${localize('GENERIC.AUTHOR')}`,
            value: `<@${shardEmj?.[0]?.author || (await emj.fetchAuthor()).id}>`,
          });
        }

        emb.addFields({
          name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [${localize('GENERIC.COUNT', {
            count: shardEmj?.[1]?.length ?? emj.roles?.cache.size,
          })}]`,
          value:
            (shardEmj?.[1]
              ? arrayMap(shardEmj?.[1], { mapFunction: r => `\`${r}\`` })
              : collMap(emj.roles.cache, emj.guild?.id !== guild?.id ? { mapFunction: c => `\`${c.id}\`` } : {})) ||
            '@everyone',
        });
      }

      if (emj?.guild?.id !== guild?.id) {
        addBtnVsby = 2;
        editBtnVsby = 0;
      }
      if (!memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers)) addBtnVsby = editBtnVsby = 0;

      const rows = [new ActionRowBuilder<ButtonBuilder>()];
      rows[0].addComponents(
        new ButtonBuilder()
          .setLabel(localize('EMOJI.COMPONENT.LINK'))
          .setEmoji('🖼️')
          .setStyle(ButtonStyle.Link)
          .setURL(emjCodePoint ? emjURL : `${beforeMatch(emjURL, '?')}?size=${imageOptions.size}`),
      );

      if (addBtnVsby) {
        rows[0].addComponents(
          new ButtonBuilder()
            .setLabel(localize('EMOJI.COMPONENT.ADD'))
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success)
            .setCustomId('emoji_edit_add')
            .setDisabled(addBtnVsby < 2),
        );
      }
      if (editBtnVsby) {
        rows[0].addComponents(
          new ButtonBuilder()
            .setLabel(localize('GENERIC.EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('emoji_edit')
            .setDisabled(editBtnVsby < 2),
        );
      }

      await interaction.editReply({
        components: rows,
        embeds: [emb],
      });

      if (!isInfo && guild.emojis.cache.filter(({ animated }) => animated === emj.animated).size === emojiLimit) {
        return interaction.followUp({
          embeds: [
            embed({ type: 'warning' }).setDescription(
              localize(`ERROR.EMOJI.MAXIMUM_NOW.${emj.animated ? 'ANIMATED' : 'STATIC'}`, {
                limit: emojiLimit,
              }),
            ),
          ],
          ephemeral: true,
        });
      }
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isRoleSelectMenu()) {
      const { message } = interaction;

      if (message.interactionMetadata.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.UNALLOWED.COMMAND'))],
          ephemeral: true,
        });
      }
      const oldEmbs = message.embeds,
        emjURL = oldEmbs[0].thumbnail.url,
        emjCodePoint = getFieldValue(oldEmbs[0], localize('GENERIC.CODEPOINT'))?.replaceAll('`', '');

      let { customId } = interaction,
        emb = embed({ footer: 'interacted' }),
        emjId = new URL(emjURL).pathname.split(/[/&.]/)[2],
        emj = guild?.emojis.cache.get(emjId);

      const emjDisplay = emj && appPermissions.has(PermissionFlagsBits.UseExternalEmojis) ? `${emj} ` : '',
        emjMention = emj ? `\`${emj}\`` : getFieldValue(oldEmbs[0], localize('GENERIC.MENTION')),
        emjName = emj?.name ?? getFieldValue(oldEmbs[0], localize('GENERIC.NAME'))?.replaceAll('`', '');

      if (emj) {
        emjId = emj.id;
      } else if (!emjCodePoint) {
        if (!['emoji_edit_add', 'emoji_edit_readd'].includes(customId)) customId = 'emoji_nonexistent';

        addBtnVsby = 2;
        editBtnVsby = 1;
      }

      if (!memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
        customId = 'emoji_noperm';
        addBtnVsby = emj ? 0 : 1;
        editBtnVsby = 1;
      }

      const rows: ActionRowBuilder<ButtonBuilder | RoleSelectMenuBuilder>[] = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(localize('EMOJI.COMPONENT.LINK'))
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Link)
            .setURL(`${beforeMatch(emjURL, '?')}?size=${imageOptions.size}`),
        ),
      ];

      if (emjName) emb.addFields({ inline: true, name: `📛 ${localize('GENERIC.NAME')}`, value: `\`${emjName}\`` });

      emb
        .setColor(Colors.Yellow)
        .setTitle(emjDisplay + localize('EMOJI.EDITING'))
        .addFields({
          inline: true,
          name: `🪪 ${localize(`GENERIC.${emjCodePoint ? 'CODEPOINT' : 'ID'}`)}`,
          value: `\`${emjCodePoint ?? emjId}\``,
        })
        .setThumbnail(emjURL)
        .setTimestamp(Date.now());

      if (emjMention) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('mention')} ${localize('GENERIC.MENTION')}`,
          value: emjMention,
        });
      }
      if (!emjCodePoint) {
        emb.addFields({
          inline: true,
          name: `📅 ${localize('GENERIC.CREATED')}`,
          value: toUTS(SnowflakeUtil.timestampFrom(emjId)),
        });
      }
      if (emj) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('user')} ${localize('GENERIC.AUTHOR')}`,
          value: `${await emj.fetchAuthor()}`,
        });
        emb.addFields({
          name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [${localize('GENERIC.COUNT', {
            count: emj.roles.cache.size,
          })}]`,
          value:
            collMap(emj.roles.cache, emj.guild?.id !== guild?.id ? { mapFunction: c => `\`${c.id}\`` } : {}) ||
            '@everyone',
        });
      }

      switch (customId) {
        case 'emoji_edit_add':
        case 'emoji_edit_readd':
        case 'emoji_edit': {
          const isAdd = ['emoji_edit_add', 'emoji_edit_readd'].includes(customId);
          if (isAdd) {
            const isAddId = customId === 'emoji_edit_add';

            await (interaction as ButtonInteraction).update({
              components: disableComponents(message.components),
              embeds: [
                emb
                  .setTitle(
                    `${client.useEmoji('loading')} ${localize(
                      `EMOJI.${isAddId ? (emjCodePoint ? 'ADDING_UNICODE' : 'ADDING') : 'READDING'}`,
                    )}`,
                  )
                  .setColor(Colors.Blurple),
              ],
            });

            const emjCreate = (url: string): Promise<GuildEmoji> =>
              guild.emojis
                .create({
                  attachment: url,
                  name: emjCodePoint?.substring(0, 32).replaceAll('-', '_') || emjName || emjId,
                  reason: `${user.tag} | ${localize(
                    `EMOJI.REASON.CREATED.${isAddId ? (emjCodePoint ? 'UNICODE' : 'CDN') : 'DELETED'}`,
                  )}`,
                })
                .catch(async err => {
                  if (err.code === RESTJSONErrorCodes.InvalidFormBodyOrContentType)
                    return emjCreate(await decreaseSizeCDN(url, { initialSize: 256, maxSize: 256000 }));

                  if (
                    [
                      RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached,
                      RESTJSONErrorCodes.MaximumNumberOfEmojisReached,
                    ].includes(err.code)
                  ) {
                    await interaction.editReply({ embeds: oldEmbs });
                    await interaction.followUp({
                      embeds: [
                        embed({ type: 'warning' }).setDescription(
                          localize(
                            `ERROR.EMOJI.MAXIMUM.${
                              err.code === RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached
                                ? 'ANIMATED'
                                : 'STATIC'
                            }`,
                            { limit: emojiLimit },
                          ),
                        ),
                      ],
                      ephemeral: true,
                    });
                    return null;
                  }
                  throw err;
                });

            emj = await emjCreate(emjURL);
            if (!emj) return;

            emb = embed({
              color: Colors.Green,
              footer: 'interacted',
              title: `${emj} ${localize(`EMOJI.${isAddId ? (emjCodePoint ? 'ADDED_UNICODE' : 'ADDED') : 'READDED'}`)}`,
            })
              .setThumbnail(emj.imageURL(imageOptions))
              .addFields(
                {
                  inline: true,
                  name: `📛 ${localize('GENERIC.NAME')}`,
                  value: `\`${emj.name}\``,
                },
                {
                  inline: true,
                  name: `🪪 ${localize('GENERIC.ID')}`,
                  value: `\`${emj.id}\``,
                },
                {
                  inline: true,
                  name: `${client.useEmoji('mention')} ${localize('GENERIC.MENTION')}`,
                  value: `\`${emj}\``,
                },
                {
                  inline: true,
                  name: `📅 ${localize('GENERIC.CREATED')}`,
                  value: toUTS(emj.createdTimestamp),
                },
                {
                  inline: true,
                  name: `${client.useEmoji('user')} ${localize('GENERIC.AUTHOR')}`,
                  value: `${await emj.fetchAuthor()}`,
                },
                {
                  name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [0]`,
                  value: '@everyone',
                },
              );
          }
          const opts = {
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.VIEW'))
                  .setEmoji('🔎')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('emoji_view'),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.RENAME'))
                  .setEmoji('✏️')
                  .setStyle(ButtonStyle.Secondary)
                  .setCustomId('emoji_rename'),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ROLES.EDIT'))
                  .setEmoji('📜')
                  .setStyle(ButtonStyle.Secondary)
                  .setCustomId('emoji_edit_roles'),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.DELETE'))
                  .setEmoji('🗑️')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId('emoji_edit_delete'),
              ),
            ],
            embeds: [emb],
          };

          await (interaction.replied ? interaction.editReply(opts) : (interaction as ButtonInteraction).update(opts));
          if (isAdd && guild.emojis.cache.filter(({ animated }) => animated === emj.animated).size === emojiLimit) {
            await interaction.followUp({
              embeds: [
                embed({ type: 'warning' }).setDescription(
                  localize(`ERROR.EMOJI.MAXIMUM_NOW.${emj.animated ? 'ANIMATED' : 'STATIC'}`, {
                    limit: emojiLimit,
                  }),
                ),
              ],
              ephemeral: true,
            });
          }
          return;
        }
        case 'emoji_nonexistent':
        case 'emoji_noperm':
        case 'emoji_view': {
          if (addBtnVsby && emj?.guild?.id !== guild?.id) {
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(localize('EMOJI.COMPONENT.ADD'))
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success)
                .setCustomId('emoji_edit_add')
                .setDisabled(addBtnVsby < 2),
            );
          }
          if (editBtnVsby) {
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(localize('GENERIC.EDIT'))
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('emoji_edit')
                .setDisabled(editBtnVsby < 2),
            );
          }

          await (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb.setTitle(emjDisplay + localize('EMOJI.VIEWING')).setColor(Colors.Green)],
          });
          if (['emoji_nonexistent', 'emoji_noperm'].includes(customId)) {
            await interaction.followUp({
              embeds: [
                embed({ type: 'warning' }).setDescription(
                  customId === 'emoji_nonexistent'
                    ? localize('ERROR.EMOJI.NONEXISTENT')
                    : localize('ERROR.PERM.USER.SINGLE.NO_LONGER', {
                        perm: localize('PERM.MANAGE_EMOJIS_AND_STICKERS'),
                      }),
                ),
              ],
              ephemeral: true,
            });
          }
          return;
        }
        case 'emoji_edit_delete': {
          return (interaction as ButtonInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('emoji_edit'),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.YES'))
                  .setEmoji('✅')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId('emoji_edit_delete_confirm'),
              ),
            ],
            embeds: [
              emb
                .setTitle(emjDisplay + localize('EMOJI.DELETING'))
                .setDescription(localize('EMOJI.DELETING_DESCRIPTION'))
                .setColor(Colors.Orange),
            ],
          });
        }
        case 'emoji_edit_delete_confirm': {
          await emj?.delete(`${user.tag} | ${localize('EMOJI.REASON.DELETED')}`);

          rows[0].addComponents(
            new ButtonBuilder()
              .setLabel(localize('EMOJI.COMPONENT.READD'))
              .setEmoji('➕')
              .setStyle(ButtonStyle.Success)
              .setCustomId('emoji_edit_readd'),
          );

          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [
              emb.setTitle(`${client.useEmoji('emojiGhost')} ${localize('EMOJI.DELETED')}`).setColor(Colors.Red),
            ],
          });
        }
        case 'emoji_rename': {
          return (interaction as ButtonInteraction).showModal(
            new ModalBuilder()
              .setTitle(localize('EMOJI.RENAMING'))
              .setCustomId('emoji_rename_submit')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('emoji_rename_input')
                    .setLabel(localize('EMOJI.RENAMING_LABEL'))
                    .setMinLength(2)
                    .setMaxLength(32)
                    .setPlaceholder(emjName)
                    .setStyle(TextInputStyle.Short),
                ),
              ),
          );
        }
        case 'emoji_rename_submit': {
          const { fields } = interaction as ModalMessageModalSubmitInteraction,
            inputF = fields.getTextInputValue('emoji_rename_input').replace(/\s/g, ''),
            alphanumI = /[^\w]/g.test(inputF) && (inputF.length < 2 || inputF.length > 32 ? 'also' : 'only'),
            lengthI = inputF.length < 2 ? 'shorter' : inputF.length > 32 && 'longer';

          if (inputF === emjName) return interaction.deferUpdate();
          if (alphanumI || lengthI) {
            return (interaction as ModalMessageModalSubmitInteraction).reply({
              embeds: [
                embed({ type: 'error' }).setDescription(
                  localize('ERROR.INVALID.NAME', {
                    alphanum: alphanumI,
                    condition: lengthI,
                    input: inputF,
                    maxLength: 32,
                    minLength: 2,
                  }),
                ),
              ],
              ephemeral: true,
            });
          }

          emj = await emj.setName(inputF, `${user.tag} | ${localize('EMOJI.REASON.RENAMED')}`);

          emb.spliceFields(0, 1, {
            inline: true,
            name: `📛 ${localize('GENERIC.NAME')}`,
            value: `\`${emj.name}\``,
          });
          emb.spliceFields(2, 1, {
            inline: true,
            name: `${client.useEmoji('mention')} ${localize('GENERIC.MENTION')}`,
            value: `\`${emj}\``,
          });

          return (interaction as ModalMessageModalSubmitInteraction).update({
            embeds: [emb.setColor(Colors.Green).setTitle(emjDisplay + localize('EMOJI.RENAMED'))],
          });
        }
        case 'emoji_add_roles':
        case 'emoji_add_roles_submit':
        case 'emoji_edit_roles':
        case 'emoji_remove_roles':
        case 'emoji_remove_roles_submit':
        case 'emoji_reset_roles': {
          const emjRoles = emj.roles.cache,
            isEdit = customId === 'emoji_edit_roles',
            isRemove =
              !customId.startsWith('emoji_add_roles') &&
              (message.components.at(-1).components.at(-1).customId === 'emoji_remove_roles_submit' ||
                customId.startsWith('emoji_remove_roles')),
            isSubmit = customId.endsWith('_submit');
          let title: string;

          if (isSubmit) {
            const { roles } = interaction as RoleSelectMenuInteraction<'cached'>;

            if (isRemove) {
              emj = await emj.roles.remove(roles);
              title = localize('GENERIC.ROLES.REMOVING', {
                count: emjRoles.size - emj.roles.cache.size,
              });
              emb.setColor(Colors.Red);
            } else {
              emj = await emj.roles.add(roles);
              title = localize('GENERIC.ROLES.ADDING', {
                count: emj.roles.cache.size - emjRoles.size,
              });
              emb.setColor(Colors.Green);
            }

            emb.spliceFields(5, 1, {
              name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [${localize('GENERIC.COUNT', {
                count: emj.roles.cache.size,
              })}]`,
              value: collMap(emj.roles.cache) || '@everyone',
            });
          } else if (customId === 'emoji_reset_roles') {
            emj = await emj.roles.set([]);
            title = localize('GENERIC.ROLES.RESET');
            emb.setColor(Colors.Red).spliceFields(5, 1, {
              name: `${client.useEmoji('role')} ${localize('GENERIC.ROLES.ROLES')} [0]`,
              value: '@everyone',
            });
          } else if (isEdit) {
            title = localize('GENERIC.ROLES.EDITING');
            emb.setColor(Colors.Orange);
          } else if (isRemove) {
            title = localize('GENERIC.ROLES.REMOVING', { count: 0 });
            emb.setColor(Colors.Red);
          } else {
            title = localize('GENERIC.ROLES.ADDING', { count: 0 });
            emb.setColor(Colors.Green);
          }

          return (interaction as ButtonInteraction | RoleSelectMenuInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('emoji_edit'),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ROLES.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('emoji_reset_roles')
                  .setDisabled(!emj.roles.cache.size),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ROLES.ADD'))
                  .setEmoji('➕')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId('emoji_add_roles')
                  .setDisabled(!isEdit && !isRemove),
                new ButtonBuilder()
                  .setLabel(localize('GENERIC.ROLES.REMOVE'))
                  .setEmoji('➖')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId('emoji_remove_roles')
                  .setDisabled((!isEdit && isRemove) || !emj.roles.cache.size),
              ),
              new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setPlaceholder(
                    localize(
                      isEdit
                        ? 'GENERIC.ROLES.SELECT.DEFAULT'
                        : isRemove
                          ? 'GENERIC.ROLES.SELECT.REMOVE'
                          : 'GENERIC.ROLES.SELECT.ADD',
                    ),
                  )
                  .setMinValues(1)
                  .setMaxValues(25)
                  .setCustomId(isRemove ? 'emoji_remove_roles_submit' : 'emoji_add_roles_submit')
                  .setDisabled(isEdit || (isRemove && !emj.roles.cache.size)),
              ),
            ],
            embeds: [emb.setTitle(emjDisplay + title)],
          });
        }
      }
    }
  }
}
