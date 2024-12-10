import twemoji from '@twemoji/api';
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
  MessageFlags,
} from 'discord.js';
import {
  collMap,
  toUTS,
  getFieldValue,
  decreaseSizeCDN,
  disableComponents,
  beforeMatch,
  arrayMap,
  afterMatch,
} from '../utils.js';
import { imageOptions, premiumLimits } from '../defaults.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { App } from '../../lib/App.js';

export default class Emoji extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.EMOJI',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.EMOJI',
        options: [
          {
            description: 'DESC.EMOJI_ADD',
            name: 'CMD.ADD',
            options: [
              {
                description: 'EMOJI.ADD.DESC.IMAGE',
                name: 'CMD.IMAGE',
                required: true,
                type: ApplicationCommandOptionType.Attachment,
              },
              {
                description: 'EMOJI.ADD.DESC.NAME',
                maxLength: 32,
                minLength: 2,
                name: 'CMD.NAME',
                required: true,
                type: ApplicationCommandOptionType.String,
              },
            ],
            type: ApplicationCommandOptionType.Subcommand,
          },
          {
            description: 'DESC.EMOJI_INFO',
            name: 'CMD.INFO',
            options: [
              {
                description: 'EMOJI.INFO.DESC.EMOJI',
                name: 'CMD.EMOJI',
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
    const { __, client, embed, intName, isEphemeral } = args,
      { __dl } = client,
      { appPermissions, guild, memberPermissions, user } = interaction,
      emojiLimit = guild
        ? (guild.features as GuildFeature | string[]).includes('MORE_EMOJI') && guild.premiumTier < 3
          ? 200
          : premiumLimits[guild.premiumTier].emojis
        : 0;

    let addBtnVsby = 0,
      editBtnVsby = 2;

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        isInfo = options.getSubcommand() === __dl('CMD.INFO'),
        imageO = options.getAttachment(__dl('CMD.IMAGE')),
        inputO = isInfo ? options.getString(__dl('CMD.EMOJI')) : options.getString(__dl('CMD.NAME')),
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
            embeds: [embed({ type: 'error' }).setDescription(__('ERROR.DM'))],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (!memberPermissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
          return interaction.reply({
            embeds: [
              embed({ type: 'error' }).setDescription(
                __('ERROR.PERM.USER.SINGLE.REQUIRES', { perm: __('PERM.MANAGE_EXPRESSIONS') }),
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (imageO.size > 256000) {
          return interaction.reply({
            embeds: [embed({ type: 'error' }).setDescription(__('ERROR.INVALID.IMAGE.SIZE', { maxSize: 256 }))],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (alphanumI || lengthI) {
          return interaction.reply({
            embeds: [
              embed({ type: 'error' }).setDescription(
                __('ERROR.INVALID.NAME', {
                  alphanum: alphanumI,
                  condition: lengthI,
                  input: inputO,
                  maxLength: 32,
                  minLength: 2,
                }),
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });

      if (!isInfo) {
        emj = await guild.emojis
          .create({
            attachment: imageO.url,
            name: inputO,
            reason: `${user.tag} | ${__('EMOJI.REASON.CREATED.COMMAND')}`,
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
                    __(
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

      const anyEmj = shardEmj?.[0] || emj;

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
        emjURL = `https://cdn.discordapp.com/emojis/${parsedEmoji.id || emjId}`,
        isGIF = false;

      const parsedTwemoji =
          twemoji
            .parse(emjName, i => i)
            .match(/alt="([^"]*)".*?src="([^"]*)"/)
            ?.slice(1) ?? null,
        imageType = parsedTwemoji
          ? 'twemoji'
          : (await fetch(`${emjURL}.gif`)).ok
            ? 'gif'
            : (await fetch(emjURL)).ok && 'png';

      switch (imageType) {
        case 'gif':
          isGIF = true;
        // eslint-disable-next-line no-fallthrough
        case 'png':
          emjURL += `.${imageType}?size=${imageOptions.size}`;
          break;
        case 'twemoji':
          [emjName, emjCodePoint] = parsedTwemoji;
          emjDisplay = `${emjName} `;
          emjURL = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${emjCodePoint}.png`;
          break;
        default:
          return interaction.editReply({
            embeds: [embed({ type: 'error' }).setDescription(__('ERROR.EMOJI.NOT_FOUND', { input: inputO }))],
          });
      }

      const emb = embed();
      if (parsedEmoji.id || anyEmj) emb.addFields({ inline: true, name: `📛 ${__('NAME')}`, value: `\`${emjName}\`` });

      emb
        .setTitle(
          emjDisplay +
            __(
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
        .setThumbnail(emjURL)
        .setColor(Colors.Green)
        .setTimestamp(Date.now());

      if (emjCodePoint) {
        emb.addFields({
          inline: true,
          name: `🪪 ${__('CODEPOINT')}`,
          value: `\`${emjCodePoint}\``,
        });
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('mention')} ${__('MENTION')}`,
          value: `\`${emjName}\``,
        });
      } else {
        emb.addFields({
          inline: true,
          name: `🪪 ${__('ID')}`,
          value: `\`${emjId}\``,
        });
        if (parsedEmoji.id || anyEmj) {
          emb.addFields({
            inline: true,
            name: `${client.useEmoji('mention')} ${__('MENTION')}`,
            value: `\`<${isGIF ? 'a' : ''}:${emjName}:${emjId}>\``,
          });
        }
        emb.addFields({
          inline: true,
          name: `📅 ${__('CREATED')}`,
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
            name: `${client.useEmoji(integration.type)} ${__('MANAGED_BY')}`,
            value: `<@${integration.userId || integration.user.id}>`,
          });
          editBtnVsby = 1;
        } else {
          emb.addFields({
            inline: true,
            name: `${client.useEmoji('user')} ${__('AUTHOR')}`,
            value: `<@${shardEmj?.[0]?.author || (await emj.fetchAuthor()).id}>`,
          });
        }

        emb.addFields({
          name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [${__('COUNT', {
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
      let row = rows[0];

      row.addComponents(
        new ButtonBuilder()
          .setLabel(__(`OPEN.${isGIF ? 'GIF' : 'PNG'}`))
          .setEmoji('🖼️')
          .setStyle(ButtonStyle.Link)
          .setURL(emjURL),
      );

      if (emjCodePoint) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(__('OPEN.SVG'))
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${emjCodePoint}.svg`),
        );
        rows.push(new ActionRowBuilder<ButtonBuilder>());
        row = rows[1];
      }

      if (addBtnVsby) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(__('EMOJI.COMPONENT.ADD'))
            .setEmoji('➕')
            .setStyle(ButtonStyle.Success)
            .setCustomId(`${intName}_edit_add`)
            .setDisabled(addBtnVsby < 2),
        );
      }
      if (editBtnVsby) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel(__('EDIT'))
            .setEmoji('📝')
            .setStyle(ButtonStyle.Primary)
            .setCustomId(`${intName}_edit`)
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
              __(`ERROR.EMOJI.MAXIMUM_NOW.${emj.animated ? 'ANIMATED' : 'STATIC'}`, {
                limit: emojiLimit,
              }),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isRoleSelectMenu()) {
      const { message } = interaction;

      if (message.interactionMetadata.user.id !== user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }
      const oldEmbs = message.embeds,
        emjURL = oldEmbs[0].thumbnail.url,
        emjCodePoint = getFieldValue(oldEmbs[0], __('CODEPOINT'))?.replaceAll('`', '');

      let customId = afterMatch(interaction.customId, '_'),
        emb = embed({ footer: 'interacted' }),
        emjId = new URL(emjURL).pathname.split(/[/&.]/)[2],
        emj = guild?.emojis.cache.get(emjId);

      const emjDisplay = emj && appPermissions.has(PermissionFlagsBits.UseExternalEmojis) ? `${emj} ` : '',
        emjMention = emj ? `\`${emj}\`` : getFieldValue(oldEmbs[0], __('MENTION')),
        emjName = emj?.name ?? getFieldValue(oldEmbs[0], __('NAME'))?.replaceAll('`', '');

      if (emj) {
        emjId = emj.id;
      } else if (!emjCodePoint) {
        if (!['emoji_edit_add', 'emoji_edit_readd'].includes(customId)) customId = 'nonexistent';

        addBtnVsby = 2;
        editBtnVsby = 1;
      }

      if (!memberPermissions?.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
        customId = 'noperm';
        addBtnVsby = emj ? 0 : 1;
        editBtnVsby = 1;
      }

      const rows: ActionRowBuilder<ButtonBuilder | RoleSelectMenuBuilder>[] = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel(__(`OPEN.${emjURL.includes('gif') ? 'GIF' : 'PNG'}`))
            .setEmoji('🖼️')
            .setStyle(ButtonStyle.Link)
            .setURL(`${beforeMatch(emjURL, '?')}?size=${imageOptions.size}`),
        ),
      ];

      if (emjName) emb.addFields({ inline: true, name: `📛 ${__('NAME')}`, value: `\`${emjName}\`` });

      emb
        .setColor(Colors.Yellow)
        .setTitle(emjDisplay + __('EMOJI.EDITING'))
        .addFields({
          inline: true,
          name: `🪪 ${__(`${emjCodePoint ? 'CODEPOINT' : 'ID'}`)}`,
          value: `\`${emjCodePoint ?? emjId}\``,
        })
        .setThumbnail(emjURL)
        .setTimestamp(Date.now());

      if (emjMention) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('mention')} ${__('MENTION')}`,
          value: emjMention,
        });
      }
      if (!emjCodePoint) {
        emb.addFields({
          inline: true,
          name: `📅 ${__('CREATED')}`,
          value: toUTS(SnowflakeUtil.timestampFrom(emjId)),
        });
      }
      if (emj) {
        emb.addFields({
          inline: true,
          name: `${client.useEmoji('user')} ${__('AUTHOR')}`,
          value: `${await emj.fetchAuthor()}`,
        });
        emb.addFields({
          name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [${__('COUNT', {
            count: emj.roles.cache.size,
          })}]`,
          value:
            collMap(emj.roles.cache, emj.guild?.id !== guild?.id ? { mapFunction: c => `\`${c.id}\`` } : {}) ||
            '@everyone',
        });
      }

      switch (customId) {
        case 'edit_add':
        case 'edit_readd':
        case 'edit': {
          const isAdd = ['emoji_edit_add', 'emoji_edit_readd'].includes(customId);
          if (isAdd) {
            const isAddId = customId === 'edit_add';

            await (interaction as ButtonInteraction).update({
              components: disableComponents(message.components),
              embeds: [
                emb
                  .setTitle(
                    `${client.useEmoji('loading')} ${__(
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
                  reason: `${user.tag} | ${__(
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
                          __(
                            `ERROR.EMOJI.MAXIMUM.${
                              err.code === RESTJSONErrorCodes.MaximumNumberOfAnimatedEmojisReached
                                ? 'ANIMATED'
                                : 'STATIC'
                            }`,
                            { limit: emojiLimit },
                          ),
                        ),
                      ],
                      flags: MessageFlags.Ephemeral,
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
              title: `${emj} ${__(`EMOJI.${isAddId ? (emjCodePoint ? 'ADDED_UNICODE' : 'ADDED') : 'READDED'}`)}`,
            })
              .setThumbnail(emj.imageURL(imageOptions))
              .addFields(
                {
                  inline: true,
                  name: `📛 ${__('NAME')}`,
                  value: `\`${emj.name}\``,
                },
                {
                  inline: true,
                  name: `🪪 ${__('ID')}`,
                  value: `\`${emj.id}\``,
                },
                {
                  inline: true,
                  name: `${client.useEmoji('mention')} ${__('MENTION')}`,
                  value: `\`${emj}\``,
                },
                {
                  inline: true,
                  name: `📅 ${__('CREATED')}`,
                  value: toUTS(emj.createdTimestamp),
                },
                {
                  inline: true,
                  name: `${client.useEmoji('user')} ${__('AUTHOR')}`,
                  value: `${await emj.fetchAuthor()}`,
                },
                {
                  name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [0]`,
                  value: '@everyone',
                },
              );
          }
          const opts = {
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('VIEW'))
                  .setEmoji('🔎')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId(`${intName}_view`),
                new ButtonBuilder()
                  .setLabel(__('RENAME'))
                  .setEmoji('✏️')
                  .setStyle(ButtonStyle.Secondary)
                  .setCustomId(`${intName}_rename`),
                new ButtonBuilder()
                  .setLabel(__('ROLES.EDIT'))
                  .setEmoji('📜')
                  .setStyle(ButtonStyle.Secondary)
                  .setCustomId(`${intName}_edit_roles`),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('DELETE'))
                  .setEmoji('🗑️')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId(`${intName}_edit_delete`),
              ),
            ],
            embeds: [emb],
          };

          await (interaction.replied ? interaction.editReply(opts) : (interaction as ButtonInteraction).update(opts));
          if (isAdd && guild.emojis.cache.filter(({ animated }) => animated === emj.animated).size === emojiLimit) {
            await interaction.followUp({
              embeds: [
                embed({ type: 'warning' }).setDescription(
                  __(`ERROR.EMOJI.MAXIMUM_NOW.${emj.animated ? 'ANIMATED' : 'STATIC'}`, {
                    limit: emojiLimit,
                  }),
                ),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }
        case 'nonexistent':
        case 'noperm':
        case 'view': {
          if (addBtnVsby && emj?.guild?.id !== guild?.id) {
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(__('EMOJI.COMPONENT.ADD'))
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success)
                .setCustomId(`${intName}_edit_add`)
                .setDisabled(addBtnVsby < 2),
            );
          }
          if (editBtnVsby) {
            rows[0].addComponents(
              new ButtonBuilder()
                .setLabel(__('EDIT'))
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary)
                .setCustomId(`${intName}_edit`)
                .setDisabled(editBtnVsby < 2),
            );
          }

          await (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb.setTitle(emjDisplay + __('EMOJI.VIEWING')).setColor(Colors.Green)],
          });
          if (['emoji_nonexistent', 'emoji_noperm'].includes(customId)) {
            await interaction.followUp({
              embeds: [
                embed({ type: 'warning' }).setDescription(
                  customId === 'nonexistent'
                    ? __('ERROR.EMOJI.NONEXISTENT')
                    : __('ERROR.PERM.USER.SINGLE.NO_LONGER', {
                        perm: __('PERM.MANAGE_EMOJIS_AND_STICKERS'),
                      }),
                ),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }
        case 'edit_delete': {
          return (interaction as ButtonInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId(`${intName}_edit`),
                new ButtonBuilder()
                  .setLabel(__('YES'))
                  .setEmoji('✅')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId(`${intName}_edit_delete_confirm`),
              ),
            ],
            embeds: [
              emb
                .setTitle(emjDisplay + __('EMOJI.DELETING'))
                .setDescription(__('EMOJI.DELETING_DESCRIPTION'))
                .setColor(Colors.Orange),
            ],
          });
        }
        case 'edit_delete_confirm': {
          await emj?.delete(`${user.tag} | ${__('EMOJI.REASON.DELETED')}`);

          rows[0].addComponents(
            new ButtonBuilder()
              .setLabel(__('EMOJI.COMPONENT.READD'))
              .setEmoji('➕')
              .setStyle(ButtonStyle.Success)
              .setCustomId(`${intName}_edit_readd`),
          );

          return (interaction as ButtonInteraction).update({
            components: rows,
            embeds: [emb.setTitle(`${client.useEmoji('emojiGhost')} ${__('EMOJI.DELETED')}`).setColor(Colors.Red)],
          });
        }
        case 'rename': {
          return (interaction as ButtonInteraction).showModal(
            new ModalBuilder()
              .setTitle(__('EMOJI.RENAMING'))
              .setCustomId(`${intName}_rename_submit`)
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId(`rename_input`)
                    .setLabel(__('EMOJI.RENAMING_LABEL'))
                    .setMinLength(2)
                    .setMaxLength(32)
                    .setPlaceholder(emjName)
                    .setStyle(TextInputStyle.Short),
                ),
              ),
          );
        }
        case 'rename_submit': {
          const { fields } = interaction as ModalMessageModalSubmitInteraction,
            inputF = fields.getTextInputValue('emoji_rename_input').replace(/\s/g, ''),
            alphanumI = /[^\w]/g.test(inputF) && (inputF.length < 2 || inputF.length > 32 ? 'also' : 'only'),
            lengthI = inputF.length < 2 ? 'shorter' : inputF.length > 32 && 'longer';

          if (inputF === emjName) return interaction.deferUpdate();
          if (alphanumI || lengthI) {
            return (interaction as ModalMessageModalSubmitInteraction).reply({
              embeds: [
                embed({ type: 'error' }).setDescription(
                  __('ERROR.INVALID.NAME', {
                    alphanum: alphanumI,
                    condition: lengthI,
                    input: inputF,
                    maxLength: 32,
                    minLength: 2,
                  }),
                ),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }

          emj = await emj.setName(inputF, `${user.tag} | ${__('EMOJI.REASON.RENAMED')}`);

          emb.spliceFields(0, 1, {
            inline: true,
            name: `📛 ${__('NAME')}`,
            value: `\`${emj.name}\``,
          });
          emb.spliceFields(2, 1, {
            inline: true,
            name: `${client.useEmoji('mention')} ${__('MENTION')}`,
            value: `\`${emj}\``,
          });

          return (interaction as ModalMessageModalSubmitInteraction).update({
            embeds: [emb.setColor(Colors.Green).setTitle(emjDisplay + __('EMOJI.RENAMED'))],
          });
        }
        case 'add_roles':
        case 'add_roles_submit':
        case 'edit_roles':
        case 'remove_roles':
        case 'remove_roles_submit':
        case 'reset_roles': {
          const emjRoles = emj.roles.cache,
            isEdit = customId === 'edit_roles',
            isRemove =
              !customId.startsWith('add_roles') &&
              (message.components.at(-1).components.at(-1).customId === 'remove_roles_submit' ||
                customId.startsWith('remove_roles')),
            isSubmit = customId.endsWith('_submit');
          let title: string;

          if (isSubmit) {
            const { roles } = interaction as RoleSelectMenuInteraction<'cached'>;

            if (isRemove) {
              emj = await emj.roles.remove(roles);
              title = __('ROLES.REMOVING', {
                count: emjRoles.size - emj.roles.cache.size,
              });
              emb.setColor(Colors.Red);
            } else {
              emj = await emj.roles.add(roles);
              title = __('ROLES.ADDING', {
                count: emj.roles.cache.size - emjRoles.size,
              });
              emb.setColor(Colors.Green);
            }

            emb.spliceFields(5, 1, {
              name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [${__('COUNT', {
                count: emj.roles.cache.size,
              })}]`,
              value: collMap(emj.roles.cache) || '@everyone',
            });
          } else if (customId === 'reset_roles') {
            emj = await emj.roles.set([]);
            title = __('ROLES.RESET');
            emb.setColor(Colors.Red).spliceFields(5, 1, {
              name: `${client.useEmoji('role')} ${__('ROLES.NOUN')} [0]`,
              value: '@everyone',
            });
          } else if (isEdit) {
            title = __('ROLES.EDITING');
            emb.setColor(Colors.Orange);
          } else if (isRemove) {
            title = __('ROLES.REMOVING', { count: 0 });
            emb.setColor(Colors.Red);
          } else {
            title = __('ROLES.ADDING', { count: 0 });
            emb.setColor(Colors.Green);
          }

          return (interaction as ButtonInteraction | RoleSelectMenuInteraction).update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('BACK'))
                  .setEmoji('↩️')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId(`${intName}_edit`),
                new ButtonBuilder()
                  .setLabel(__('ROLES.RESET'))
                  .setEmoji('🔄')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId(`${intName}_reset_roles`)
                  .setDisabled(!emj.roles.cache.size),
              ),
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setLabel(__('ROLES.ADD'))
                  .setEmoji('➕')
                  .setStyle(ButtonStyle.Success)
                  .setCustomId(`${intName}_add_roles`)
                  .setDisabled(!isEdit && !isRemove),
                new ButtonBuilder()
                  .setLabel(__('ROLES.REMOVE'))
                  .setEmoji('➖')
                  .setStyle(ButtonStyle.Danger)
                  .setCustomId(`${intName}_remove_roles`)
                  .setDisabled((!isEdit && isRemove) || !emj.roles.cache.size),
              ),
              new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setPlaceholder(
                    __(isEdit ? 'ROLES.SELECT.DEFAULT' : isRemove ? 'ROLES.SELECT.REMOVE' : 'ROLES.SELECT.ADD'),
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
