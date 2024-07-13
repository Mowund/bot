import util from 'node:util';
import { inflate } from 'node:zlib';
import {
  ApplicationCommandOptionType,
  BaseInteraction,
  Guild,
  ApplicationIntegrationType,
  InteractionContextType,
} from 'discord.js';
import murmurhash from 'murmurhash';
import { search } from 'fast-fuzzy';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { AppEmoji, imageOptions } from '../defaults.js';
import { truncate } from '../utils.js';
import { Kind, PopulationType } from '../../lib/interfaces/Experiment.js';

// TODO: Add info about all treatments and their rollouts and overrides, along with checking if the guild actually is in the experiment
export default class Rollout extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'ROLLOUT.DESCRIPTION',
        integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'ROLLOUT.NAME',
        options: [
          {
            autocomplete: true,
            description: 'ROLLOUT.OPTIONS.EXPERIMENT.DESCRIPTION',
            name: 'ROLLOUT.OPTIONS.EXPERIMENT.NAME',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'ROLLOUT.OPTIONS.GUILD.DESCRIPTION',
            name: 'ROLLOUT.OPTIONS.GUILD.NAME',
            type: ApplicationCommandOptionType.String,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { client, embed, isEphemeral, localize } = args,
      { experiments } = client;

    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(),
        filteredData = experiments.data.filter(e => e.data.label && e.data.id && e.data.kind === Kind.Guild).reverse(),
        hashFilter = search(focused, filteredData, { keySelector: e => `${e.data.hash}`, threshold: 0.95 }),
        idFilter = search(focused, filteredData, { keySelector: e => e.data.id, threshold: 0.95 });

      return interaction.respond(
        (!focused.length
          ? filteredData
          : hashFilter.length
            ? hashFilter
            : idFilter.length
              ? idFilter
              : search(focused, filteredData, { keySelector: e => e.data.label })
        )
          .slice(0, 25)
          .map(e => ({
            name: truncate(e.data.label, 100),
            value: e.data.id,
          })),
      );
    }

    if (interaction.isChatInputCommand()) {
      const { options } = interaction,
        experimentO = options.getString('experiment'),
        guildO = options.getString('guild');

      await interaction.deferReply({ ephemeral: isEphemeral });

      const guild = await client.fetchGuildGlobally(guildO ?? interaction.guildId);

      if (guildO && !guild) {
        return interaction.editReply({
          embeds: [embed({ type: 'error' }).setDescription(localize('ERROR.GUILD_NOT_FOUND'))],
        });
      }

      const guildId = guild?.id ?? interaction.guildId,
        memberCount = (guild as Guild)?.memberCount ?? guild?.approximateMemberCount;

      if (!experimentO) {
        const embs = [embed({ title: `${AppEmoji.info} Experiments List` })],
          descriptions = [''];
        let counter = 0;

        if (guild)
          embs[0].setAuthor({ iconURL: client.rest.cdn.icon(guildId, guild.icon, imageOptions), name: guild.name });

        for (const exp of experiments.data.filter(e => e.rollout && e.data.label).reverse()) {
          // TODO
          if (exp.data.hash !== 280866660) continue;
          const rPos = guildId && murmurhash.v3(`${exp.data.hash}:${guildId}`) % 10000;
          let inHash = false,
            inFilters = false,
            inOverride = false;

          if (guildId) {
            console.log(exp);
            for (const pop of exp.rollout.populations) {
              for (const [bucket, { rollout }] of Object.entries(pop.buckets).filter(([k]) => Number(k))) {
                console.log('bucket', bucket);
                if (exp.data.buckets?.includes(+bucket)) {
                  inOverride = exp.rollout.overrides[bucket]?.includes(guildId) ?? false;
                  for (const pos of rollout) inHash = pos.start < rPos && rPos < pos.end;
                }
                console.log('hash', inHash);
              }

              inFilters =
                inHash &&
                pop.filters.every(f =>
                  Boolean(
                    guild &&
                      (f.type === PopulationType.GuildHasFeature
                        ? f.features.some(ft => (guild.features as any)?.includes(ft))
                        : f.type === PopulationType.GuildMemberCountRange
                          ? f.min_count <= memberCount && memberCount <= f.max_count
                          : PopulationType.GuildHasVanityURL
                            ? f.has_vanity === !!guild.vanityURLCode
                            : true),
                  ),
                );

              console.log(
                inHash &&
                  pop.filters.every(f =>
                    Boolean(
                      guild &&
                        (f.type === PopulationType.GuildHasFeature
                          ? f.features.some(ft => (guild.features as any)?.includes(ft))
                          : f.type === PopulationType.GuildMemberCountRange
                            ? f.min_count <= memberCount && memberCount <= f.max_count
                            : PopulationType.GuildHasVanityURL
                              ? f.has_vanity === !!guild.vanityURLCode
                              : true),
                    ),
                  ),
                inFilters,
              );

              pop.filters.every(f =>
                console.log(
                  'test',
                  Boolean(
                    guild &&
                      (f.type === PopulationType.GuildHasFeature
                        ? console.log(
                            'feature',
                            f.features.some(ft => (guild.features as any)?.includes(ft)),
                          )
                        : f.type === PopulationType.GuildMemberCountRange
                          ? console.log('member', f.min_count <= memberCount && memberCount <= f.max_count)
                          : PopulationType.GuildHasVanityURL
                            ? console.log('vanity', f.has_vanity === !!guild.vanityURLCode)
                            : console.log('none', true)),
                  ),
                ),
              );
              console.log(pop);
              console.log('infilters', inFilters);
            }
          }

          const text = `${
              guildId
                ? inHash
                  ? guild
                    ? inFilters || inOverride
                      ? AppEmoji.check
                      : AppEmoji.maybe
                    : AppEmoji.neutral
                  : AppEmoji.no
                : AppEmoji.neutral
            } ${exp.data.label}`,
            descLength = descriptions[counter].length;

          if ((descLength && descLength + 2) + text.length < 4096) {
            descriptions[counter] += descLength ? `\n${text}` : text;
          } else {
            embs[counter++].setTimestamp(null).data.footer = null;
            embs.push(embed());
            descriptions.push(text);
          }
        }

        descriptions.forEach((d, i) => embs[i].setDescription(d));
        return interaction.editReply({ embeds: embs });
      }

      const experiment = experiments.data.find(exp => exp.data.id === experimentO || exp.data.hash === +experimentO);

      if (!experiment)
        return interaction.editReply({ embeds: [embed({ type: 'error' }).setDescription('Experiment not found')] });

      const rPos = guildId && murmurhash.v3(`${experiment.data.hash}:${guildId}`) % 10000,
        emb = embed({
          title: `${AppEmoji.info} ${experiment.data.label || experiment.data.id || experiment.data.hash}`,
        });

      if (guild) emb.setAuthor({ iconURL: client.rest.cdn.icon(guildId, guild.icon, imageOptions), name: guild.name });

      if (experiment.data.id) {
        if (experiment.data.kind === Kind.Guild)
          emb.setURL(`https://discordlookup.com/experiments/${experiment.data.id}`);
        emb.addFields({
          inline: true,
          name: `🪪 ${localize('GENERIC.ID')}`,
          value: `\`${experiment.data.id}\``,
        });
      }
      emb.addFields({ inline: true, name: '#️⃣ Hash', value: `\`${experiment.data.hash}\`` });

      if (rPos) emb.addFields({ inline: true, name: '🚩 Position', value: `\`${rPos}\`` });

      // overrides = []

      // for (const o of experiment.rollout[4]) if (o.k.find(g => g === guildId)) overrides.push(o.b);
      console.log(util.inspect(experiment, false, null, true));

      if (experiment.rollout) {
        for (const pop of experiment.rollout.populations) {
          const inFilters = pop.filters.every(
              f =>
                guild &&
                (f.type === PopulationType.GuildHasFeature
                  ? f.features.some(ft => (guild.features as any)?.includes(ft))
                  : f.type === PopulationType.GuildMemberCountRange
                    ? f.min_count <= memberCount && memberCount <= f.max_count
                    : PopulationType.GuildHasVanityURL
                      ? f.has_vanity === !!guild.vanityURLCode
                      : true),
            ),
            fieldValues = [],
            bucketArray = experiment.data.buckets;

          let control = 10000;

          for (const [bucket, { rollout }] of Object.entries(pop.buckets)) {
            if (bucketArray?.includes(+bucket)) {
              const inOverride = experiment.rollout.overrides[bucket]?.includes(guildId) ?? false;
              let inHash = false,
                pr = 0;

              for (const pos of rollout) {
                inHash = pos.start <= rPos && rPos <= pos.end;
                pr += pos.end - pos.start;
              }
              control -= pr;

              fieldValues.push(
                `${
                  guildId
                    ? inHash
                      ? pop.filters.length
                        ? guild
                          ? inFilters || inOverride
                            ? AppEmoji.check
                            : AppEmoji.maybe
                          : AppEmoji.neutral
                        : AppEmoji.check
                      : AppEmoji.no
                    : AppEmoji.neutral
                } **${experiment.data.description.at(bucketArray.indexOf(+bucket))}:** ${pr / 100}%`,
              );
            }
          }

          if (control) fieldValues.unshift(`🔘 **Control:** ${control / 100}%`);

          emb.addFields({
            name: pop.filters.length
              ? pop.filters
                  .map(
                    f =>
                      `${
                        f.type === PopulationType.GuildHasFeature
                          ? f.features.map((f1, i) => (i === 0 ? `Guild has feature ${f1}` : `or ${f1}`)).join(' ')
                          : f.type === PopulationType.GuildInRangeByHash
                            ? `${f.target / 100}% of guilds (hash: \`${f.hash_key}\`)`
                            : f.type === PopulationType.GuildHasVanityURL
                              ? f.has_vanity
                                ? 'Guild has vanity URL'
                                : "Guild doesn't have vanity URL"
                              : f.type === PopulationType.GuildHubTypes
                                ? f.hub_types
                                    .map((h, i) => (i === 0 ? `Guild hub is of type ${h}` : `or ${h}`))
                                    .join(' ')
                                : f.type === PopulationType.GuildMemberCountRange
                                  ? `Member count is in range ${f.min_count}${f.max_count ? `-${f.max_count}` : '+'}`
                                  : 'Unknown filter'
                      }`,
                  )
                  .join(' & ')
              : 'Default',
            value: fieldValues.join('\n'),
          });
        }
      }

      return interaction.editReply({ embeds: [emb] });
    }
  }
}
