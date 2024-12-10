import {
  SnowflakeUtil,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Snowflake,
  APIEmbedField,
  DiscordAPIError,
} from 'discord.js';
import { toUTS } from '../utils.js';
import { AppEvents, Event } from '../../lib/structures/Event.js';
import { App } from '../../lib/App.js';
import { ReminderData } from '../../lib/structures/ReminderData.js';
import { defaultLocale } from '../defaults.js';

export default class ReminderFoundEvent extends Event {
  constructor() {
    super(AppEvents.ReminderFound);
  }

  async run(client: App, reminder: ReminderData): Promise<any> {
    const { __dl, users } = client,
      { content, id, recursive, timestamp, user: userData } = reminder,
      user = await users.fetch(userData.id);

    if (await user.send('').catch((e: DiscordAPIError) => e.code === 50007))
      return userData.set({ $set: { disabledDM: true } });

    await reminder.delete();

    const locale = userData.locale || defaultLocale,
      __ = (phrase: string, replace?: Record<string, any>) => client.__dl({ locale, phrase }, replace),
      idTimestamp = SnowflakeUtil.timestampFrom(id),
      msTime = timestamp - idTimestamp,
      row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(__('REMINDER.COMPONENT.LIST'))
          .setEmoji('🗒️')
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`${__dl('CMD.REMINDER')}_list`),
      ),
      fields: APIEmbedField[] = [
        {
          inline: true,
          name: `🪪 ${__('ID')}`,
          value: `\`${id}\``,
        },
        {
          inline: true,
          name: `📅 ${__('CREATED')}`,
          value: toUTS(idTimestamp),
        },
      ],
      params: { messageOwners: Snowflake; reminderId?: Snowflake } = { messageOwners: userData.id };

    if (recursive) {
      const currentTime = Date.now();
      let nextTimestamp = timestamp + msTime;
      if (nextTimestamp < currentTime) nextTimestamp += Math.ceil((currentTime - nextTimestamp) / msTime) * msTime;

      const recReminderId = SnowflakeUtil.generate({ timestamp: nextTimestamp - msTime }).toString(),
        recReminder = await userData.reminders.set(recReminderId, {
          content,
          recursive,
          timestamp: nextTimestamp,
        });

      params.reminderId = recReminderId;
      fields.push({
        name: `🔁 ${__('RECURSIVE')}`,
        value: __('REMINDER.RECURSIVE.ON', { timestamp: toUTS(recReminder.timestamp) }),
      });

      row.addComponents(
        new ButtonBuilder()
          .setLabel(__('EDIT'))
          .setEmoji('📝')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(`${__dl('CMD.REMINDER')}_edit`),
      );
    }

    const emb = client
      .embedBuilder({
        addParams: params,
        color: Colors.Yellow,
        localizer: __,
        title: `${client.useEmoji('bellRinging')} ${__('REMINDER.NEW')}`,
        user,
      })
      .setTimestamp(timestamp)
      .setDescription(content)
      .addFields(fields);

    return user.send({
      components: [row],
      embeds: [emb],
    });
  }
}
