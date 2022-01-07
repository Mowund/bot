'use strict';

const { UserFlags, Permissions, MessageActionRow, MessageButton } = require('discord.js'),
  { emojis, botColor, imgOpts } = require('../defaults'),
  { toUTS, flagToEmoji, collMap, monthDiff } = require('../utils');

module.exports = {
  data: [
    {
      name: 'User Info',
      type: 'USER',
    },
    {
      name: 'user',
      description: 'User related commands',
      options: [
        {
          name: 'info',
          description: 'Get information about a user',
          type: 'SUB_COMMAND',
          options: [
            {
              name: 'user',
              description: 'The user to get information from',
              type: 'USER',
            },
            {
              name: 'ephemeral',
              description: 'Send reply as an ephemeral message (Default: True)',
              type: 'BOOLEAN',
            },
          ],
        },
      ],
    },
  ],
  async execute(client, interaction, st, embed) {
    const { commandName, guild, user, options } = interaction,
      userO = options?.getUser('user') ?? user,
      memberO = guild?.members.cache.get(userO.id),
      ephemeralO = options?.getBoolean('ephemeral') ?? true;

    if (interaction.isApplicationCommand()) {
      await interaction.deferReply({ ephemeral: ephemeralO });

      if (commandName === 'User Info' || options?.getSubcommand(true) === 'info') {
        const fUser = await userO.fetch(),
          flags = userO.system
            ? [emojis.verifiedSystem]
            : userO.bot
            ? userO.flags.has(UserFlags.FLAGS.VERIFIED_BOT)
              ? [emojis.verifiedBot]
              : [emojis.bot]
            : [];

        if (userO.id === guild?.ownerId) flags.push(emojis.serverOwner);
        if (memberO?.premiumSince) {
          const pMonths = monthDiff(memberO.premiumSince);

          flags.push(
            pMonths <= 1
              ? emojis.boosting1Month
              : pMonths === 2
              ? emojis.boosting2Months
              : pMonths >= 3 && pMonths < 6
              ? emojis.boosting3Months
              : pMonths >= 6 && pMonths < 12
              ? emojis.boosting6Months
              : pMonths >= 12 && pMonths < 15
              ? emojis.boosting12Months
              : pMonths >= 15 && pMonths < 18
              ? emojis.boosting15Months
              : emojis.boosting18Months,
          );
        }

        for (const flag of userO.flags.toArray()) {
          flags.push(flagToEmoji(flag));
        }

        const color = memberO?.displayColor || fUser.accentColor || botColor,
          embs = [
            embed({ title: st.__('USER.INFO.TITLE') })
              .setColor(color)
              .setAuthor({ name: userO.tag, iconURL: userO.displayAvatarURL(imgOpts) })
              .setThumbnail((memberO ?? userO).displayAvatarURL(imgOpts))
              .setDescription(`${userO} ${flags.join(' ')}`)
              .addField(st.__('GENERIC.ID'), `\`${userO.id}\``, true)
              .addField(st.__('GENERIC.CREATION_DATE'), toUTS(userO.createdTimestamp), true),
          ],
          rows = [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setLabel(st.__('USER.INFO.USER.AVATAR'))
                .setStyle('LINK')
                .setURL(userO.displayAvatarURL(imgOpts)),
            ),
          ];

        if (memberO) {
          const mRoles = memberO.roles.cache.filter(({ id }) => id !== guild.id);
          embs[0].addField(st.__('USER.INFO.MEMBER.JOINED'), toUTS(memberO.joinedTimestamp), true);
          if (mRoles.size > 0) embs[0].addField(`${st.__('GENERIC.ROLES')} [${mRoles.size}]`, collMap(mRoles));
        }

        if (memberO?.avatar) {
          rows[0].addComponents(
            new MessageButton()
              .setLabel(st.__('USER.INFO.MEMBER.AVATAR'))
              .setStyle('LINK')
              .setURL(memberO.displayAvatarURL(imgOpts)),
          );
        }

        if (fUser.banner) {
          const button = new MessageButton()
            .setLabel(st.__('USER.INFO.USER.BANNER'))
            .setStyle('LINK')
            .setURL(fUser.bannerURL(imgOpts));

          embs[0].addField(st.__('USER.INFO.USER.BANNER'), '** **').setImage(fUser.bannerURL(imgOpts));
          rows[0].addComponents(button);
        }

        if (memberO?.banner) {
          if (fUser.banner) {
            embs[0].footer = null;
            embs[0].timestamp = null;
            embs.push(
              embed()
                .setColor(color)
                .addField(st.__('USER.INFO.MEMBER.BANNER'), '** **')
                .setImage(memberO.bannerURL(imgOpts)),
            );
          } else {
            embs[0].addField(st.__('USER.INFO.MEMBER.BANNER'), '** **').setImage(memberO.bannerURL(imgOpts));
          }

          rows[0].addComponents(
            new MessageButton()
              .setLabel(st.__('USER.INFO.MEMBER.BANNER'))
              .setStyle('LINK')
              .setURL(memberO.bannerURL(imgOpts)),
          );
        }

        if (!ephemeralO) {
          rows.push(
            new MessageActionRow().addComponents(
              new MessageButton()
                .setLabel(st.__('GENERIC.COMPONENT.MESSAGE_DELETE'))
                .setEmoji('🧹')
                .setStyle('DANGER')
                .setCustomId('generic_message_delete'),
            ),
          );
        }

        await interaction.editReply({
          embeds: embs,
          components: rows,
        });
        if (interaction.inGuild() && !guild?.roles.everyone.permissions.has(Permissions.FLAGS.USE_EXTERNAL_EMOJIS)) {
          return interaction.followUp({
            embeds: [
              embed({ type: 'warning' }).setDescription(
                st.__mf('PERM.ROLE_REQUIRES', {
                  role: '@everyone',
                  perm: st.__('PERM.USE_EXTERNAL_EMOJIS'),
                }),
              ),
            ],
            ephemeral: true,
          });
        }
      }
    }
  },
};
