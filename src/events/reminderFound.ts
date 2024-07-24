import {
  SnowflakeUtil,
  Colors,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Snowflake,
  APIEmbedField,
} from 'discord.js';
import { toUTS } from '../utils.js';
import { AppEvents, Event } from '../../lib/structures/Event.js';
import { App } from '../../lib/App.js';
import { ReminderData } from '../../lib/structures/ReminderData.js';

export default class ReminderFoundEvent extends Event {
  constructor() {
    super(AppEvents.ReminderFound);
  }

  async run(client: App, reminder: ReminderData): Promise<any> {
    const { database, isMainShard, users } = client,
      { content, id, isRecursive, msTime, timestamp, userId } = reminder;

    if (!isMainShard) return;

    const userData = await database.users.fetch(userId);
    await userData.reminders.delete(id);

    const locale = userData?.locale || 'en-US',
      localize = (phrase: string, replace?: Record<string, any>) => client.localize({ locale, phrase }, replace),
      user = await users.fetch(userId),
      idTimestamp = SnowflakeUtil.timestampFrom(id),
      row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel(localize('REMINDER.COMPONENT.LIST'))
          .setEmoji('🗒️')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('reminder_list'),
      ),
      fields: APIEmbedField[] = [
        {
          inline: true,
          name: `🪪 ${localize('GENERIC.ID')}`,
          value: `\`${id}\``,
        },
        {
          inline: true,
          name: `📅 ${localize('GENERIC.CREATED')}`,
          value: toUTS(idTimestamp),
        },
      ],
      params: { messageOwners: Snowflake; reminderId?: Snowflake } = { messageOwners: userId };

    if (isRecursive) {
      const recReminderId = SnowflakeUtil.generate().toString(),
        recReminder = await userData.reminders.set(recReminderId, {
          content: content,
          isRecursive,
          msTime,
          timestamp: SnowflakeUtil.timestampFrom(recReminderId) + msTime,
          userId: user.id,
        });

      params.reminderId = recReminderId;
      fields.push({
        name: `🔁 ${localize('GENERIC.RECURSIVE')}`,
        value: localize('REMINDER.RECURSIVE.ON', { timestamp: toUTS(recReminder.timestamp) }),
      });

      row.addComponents(
        new ButtonBuilder()
          .setLabel(localize('GENERIC.EDIT'))
          .setEmoji('📝')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('reminder_edit'),
      );
    }

    const emb = client
      .embedBuilder({
        addParams: params,
        color: Colors.Yellow,
        localizer: localize,
        timestamp,
        title: `${client.useEmoji('bellRinging')} ${localize('REMINDER.NEW')}`,
        user,
      })
      .setDescription(content)
      .addFields(fields);

    return user.send({
      components: [row],
      embeds: [emb],
    });
  }
}
