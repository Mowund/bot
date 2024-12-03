import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  ChatInputCommandInteraction,
  ButtonInteraction,
  Message,
  ButtonComponent,
  User,
  EmbedBuilder,
  italic,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { sleep } from '../utils.js';

export default class TicTacToe extends Command {
  constructor() {
    super([
      {
        contexts: [InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel],
        description: 'DESC.TICTACTOE',
        integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
        name: 'CMD.TICTACTOE',
        options: [
          {
            description: 'TICTACTOE.DESC.OPPONENT',
            name: 'CMD.OPPONENT',
            required: false,
            type: ApplicationCommandOptionType.User,
          },
          {
            choices: generateSizes(5, 5, 3, 3).map(s => ({ name: s, value: s })),
            description: 'TICTACTOE.DESC.BOARD_SIZE',
            name: 'CMD.BOARD_SIZE',
            required: false,
            type: ApplicationCommandOptionType.String,
          },
          {
            autocomplete: true,
            description: 'TICTACTOE.DESC.BOARD_RULES',
            name: 'CMD.BOARD_RULES',
            required: false,
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'TICTACTOE.DESC.DIAGONALS',
            name: 'CMD.DIAGONALS',
            required: false,
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
    ]);
  }

  async run(args: CommandArgs, interaction: BaseInteraction<'cached'>): Promise<any> {
    const { __, client, embed, integrationTypes, isEphemeral, userData } = args,
      { localize: __dl } = client;

    if (interaction.isAutocomplete()) {
      const { value } = interaction.options.getFocused(),
        rules = value.split('x').map(Number),
        board = (interaction.options.getString('board-size') ?? '3x3').split('x').map(Number);

      if (value && value !== '1x1') {
        const validRow = rules[0] >= 1 && rules[0] <= board[0],
          validCol = rules[1] >= 1 && rules[1] <= board[1];

        return interaction.respond(
          generateSizes(
            validRow ? rules[0] : board[0],
            validCol ? rules[1] : board[1],
            validRow ? null : 1,
            validCol ? null : 1,
          )
            .filter(s => s !== '1x1')
            .slice(0, 25)
            .map(s => ({ name: s, value: s })),
        );
      }

      return interaction.respond(
        generateSizes(board[0], board[1], 1, 1)
          .filter(s => s !== '1x1')
          .map(s => ({ name: s, value: s })),
      );
    }

    if (interaction.isChatInputCommand()) {
      const { memberPermissions, options, user } = interaction,
        opponent = options.getUser('opponent') ?? client.user;

      if (opponent.id === user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.CANNOT_PLAY_AGAINST_SELF'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (
        !opponent.bot &&
        interaction.inGuild() &&
        !integrationTypes.includes(ApplicationIntegrationType.GuildInstall)
      ) {
        const permissions: [bigint, string][] = [
          [PermissionFlagsBits.UseApplicationCommands, 'COMMANDS'],
          [PermissionFlagsBits.UseExternalApps, 'APPS'],
          [PermissionFlagsBits.EmbedLinks, 'EMBEDS'],
        ];

        for (const [flag, error] of permissions) {
          if (!memberPermissions.has(flag)) {
            return interaction.reply({
              embeds: [embed({ type: 'error' }).setDescription(__(`ERROR.EXTERNAL.${error}`))],
            });
          }
        }
      }

      const boardSize = options.getString('board-size') ?? '3x3',
        boardSizeArr = boardSize.split('x').map(Number),
        boardRules = options.getString('board-rules') ?? boardSize;

      if (
        !generateSizes(boardSizeArr[0], boardSizeArr[1], 1, 1)
          .filter(x => x !== '1x1')
          .includes(boardRules)
      ) {
        return interaction.reply({
          embeds: [
            embed({ type: 'error' }).setDescription(
              __('ERROR.INVALID.BOARD_RULES', { maxCol: boardSizeArr[1], maxRow: boardSizeArr[0], size: boardSize }),
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const diagonals = options.getBoolean('diagonals') ?? true,
        opponentData = await client.database.users.fetch(opponent.id),
        players: Player[] = [
          { icon: userData?.gameIcon || '❌', user },
          { icon: opponentData?.gameIcon || '⭕', user: opponent },
        ],
        emb = embed({ title: `${client.useEmoji('tictactoe')} ${__('TICTACTOE.TITLE')}` }).addFields(
          {
            inline: true,
            name: __('PLAYERS'),
            value: `${players[0].icon} ${players[0].user}\n${players[1].icon} ${players[1].user}`,
          },
          {
            inline: true,
            name: __('SETTINGS'),
            value: `**${__('BOARD_SIZE')}:** \`${boardSize}\`\n**${__('BOARD_RULES')}:** \`${boardRules}\`\n**${__('DIAGONALS')}:** ${diagonals ? client.useEmoji('check') : client.useEmoji('no')}`,
          },
        );

      if (opponent.bot) {
        await interaction.reply({
          allowedMentions: { users: [opponent.id] },
          content: opponent.bot ? null : `||${opponent}||`,
          embeds: [emb],
          flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
        });
        const board = createEmptyBoard(boardSizeArr[0], boardSizeArr[1]);
        return updateBoard(board, players[0], emb);
      }

      return interaction.reply({
        allowedMentions: { users: [opponent.id] },
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('tictactoe_accept')
              .setLabel(__('ACCEPT'))
              .setEmoji(client.useEmoji('check'))
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('tictactoe_decline')
              .setLabel(__('DECLINE'))
              .setEmoji(client.useEmoji('no'))
              .setStyle(ButtonStyle.Danger),
          ),
        ],
        content: opponent.bot ? null : `||${opponent}||`,
        embeds: [emb.setDescription(__('GAME.CONFIRM', { player: players[0].user.toString() }))],
      });
    }

    if (interaction.isButton()) {
      const { customId, message } = interaction,
        emb = new EmbedBuilder(message.embeds[0]),
        players: Player[] = await Promise.all(
          emb.data.fields[0].value?.split('\n').map(async line => {
            const u = interaction.client.users.cache.get(line.match(/<@!?(\d+)>/)?.[1]);
            return {
              icon: (await client.database.users.fetch(u.id))?.gameIcon || line.replaceAll('_', '')?.split(' ')[0],
              user: u,
            };
          }),
        ),
        sizes = Array.from(message.embeds[0].fields[1].value.matchAll(/`([^`]+)`/g), m => m[1]).map(s =>
          s.split('x').map(Number),
        ) as [number, number][],
        currentPlayer = players.find(p => p.user.id === emb.data.footer?.icon_url.match(/avatars\/(\d+)\//)?.[1]),
        [action, row, col] = customId.split('_');

      if (
        !players.some(p => p.user.id === interaction.user.id) ||
        (!col && players[0].user.id === interaction.user.id)
      ) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.UNALLOWED.COMMAND'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      switch (customId) {
        case 'tictactoe_accept': {
          return updateBoard(createEmptyBoard(sizes[0][0], sizes[0][1]), players[0], emb.setDescription(null));
        }
        case 'tictactoe_decline': {
          return interaction.update({
            components: [],
            content: null,
            embeds: [emb.setDescription(__('GAME.DECLINED')).setColor(Colors.Red)],
          });
        }
      }

      if (currentPlayer.user.id !== interaction.user.id) {
        return interaction.reply({
          embeds: [embed({ type: 'error' }).setDescription(__('ERROR.NOT_YOUR_TURN'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      const handleMove = async (board: Board, boardRules: [number, number]) => {
        const diagonals = emb.data.fields[1].value.includes('check');

        if (!makeMove(board, parseInt(row), parseInt(col), currentPlayer)) {
          await interaction.update({ embeds: [emb.setDescription('ERROR.INVALID_MOVE').setColor(Colors.Red)] });
          return;
        }

        const winner = checkWinner(board, boardRules, diagonals);

        if (winner) {
          await interaction.update({
            components: disableBoard(board, winner.cells),
            embeds: [
              emb
                .setDescription(__('TICTACTOE.WINNER', { player: winner.player.user.toString() }))
                .spliceFields(0, 1, {
                  ...emb.data.fields[0],
                  value: emb.data.fields[0].value.replaceAll('_', ''),
                })
                .setFooter(null)
                .setColor(Colors.Green),
            ],
          });
          return;
        }

        if (isDraw(board)) {
          await interaction.update({
            components: disableBoard(board),
            embeds: [
              emb
                .setDescription(__('TICTACTOE.DRAW'))
                .spliceFields(0, 1, {
                  ...emb.data.fields[0],
                  value: emb.data.fields[0].value.replaceAll('_', ''),
                })
                .setFooter(null)
                .setColor(Colors.Yellow),
            ],
          });
          return;
        }

        const nextPlayer = players.find(p => p.user.id !== currentPlayer.user.id);

        await updateBoard(board, nextPlayer, emb);

        // Handle AI move
        if (nextPlayer.user.bot) {
          await updateBoard(board, nextPlayer, emb);
          await sleep(500);

          const [aiRow, aiCol] = getAIMove(board, boardRules, nextPlayer, currentPlayer, diagonals);
          makeMove(board, aiRow, aiCol, nextPlayer);
          const aiWinner = checkWinner(board, boardRules, diagonals);

          if (aiWinner) {
            await interaction.editReply({
              components: disableBoard(board, aiWinner.cells),
              embeds: [
                emb
                  .setDescription(__('TICTACTOE.WINNER', { player: aiWinner.player.user.toString() }))
                  .spliceFields(0, 1, {
                    ...emb.data.fields[0],
                    value: emb.data.fields[0].value.replaceAll('_', ''),
                  })
                  .setFooter(null)
                  .setColor(Colors.Green),
              ],
            });
          } else if (isDraw(board)) {
            await interaction.editReply({
              components: disableBoard(board),
              embeds: [
                emb
                  .setDescription(__('TICTACTOE.DRAW'))
                  .spliceFields(0, 1, {
                    ...emb.data.fields[0],
                    value: emb.data.fields[0].value.replaceAll('_', ''),
                  })
                  .setFooter(null)
                  .setColor(Colors.Yellow),
              ],
            });
          } else {
            await updateBoard(board, currentPlayer, emb);
          }
        }
      };

      if (action === 'tictactoe' && row !== undefined && col !== undefined)
        await handleMove(parseBoardFromComponents(message, players), sizes[1]);
    }

    async function updateBoard(board: Board, currentPlayer: Player, emb: EmbedBuilder) {
      const currentMember = interaction.guild?.members.cache.get(currentPlayer.user.id),
        rows = board.map((row, rowIndex) =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            row.map((cell, colIndex) =>
              new ButtonBuilder()
                .setCustomId(`tictactoe_${rowIndex}_${colIndex}`)
                .setEmoji(cell === null ? '<blank:1310238931245334609>' : cell.icon)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(cell !== null),
            ),
          ),
        );
      emb
        .spliceFields(0, 1, {
          ...emb.data.fields[0],
          value: emb.data.fields[0].value
            .replaceAll('_', '')
            .split('\n')
            .map(line => (line.includes(currentPlayer.user.id) ? italic(line) : line))
            .join('\n'),
        })
        .setFooter({
          iconURL: currentMember?.user.displayAvatarURL() || currentPlayer.user.displayAvatarURL(),
          text: `${(currentMember || currentPlayer.user).displayName}'s turn`,
        })
        .setColor(Colors.Blue);

      const opts = {
        allowedMentions: { users: [currentPlayer.user.id] },
        components: rows,
        content: currentPlayer.user.bot ? null : `||${currentPlayer.user}||`,
        embeds: [emb],
      };

      if (
        interaction instanceof ChatInputCommandInteraction ||
        (interaction instanceof ButtonInteraction && interaction.replied)
      )
        await interaction.editReply(opts);
      else await (interaction as ButtonInteraction).update(opts);
    }
  }
}

type Player = {
  icon: string;
  user: User;
};
type Board = Player[][];

function createEmptyBoard(rows: number, cols: number): Board {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
}

function checkWinner(
  board: Board,
  boardRules: [number, number],
  diagonals: boolean,
): { cells: number[][]; player: Player } | null {
  const [boardRows, boardCols] = [board.length, board[0].length],
    [ruleRows, ruleCols] = [Math.min(boardRules[0], boardRows), Math.min(boardRules[1], boardCols)],
    lines = [],
    addLines = (
      startRow: number,
      startCol: number,
      endRow: number,
      endCol: number,
      stepRow: number,
      stepCol: number,
      maxSteps: number,
    ) => {
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cells = Array.from({ length: maxSteps }, (_, i) => [r + i * stepRow, c + i * stepCol]),
            values = cells.map(([r2, c2]) =>
              r2 >= 0 && c2 >= 0 && r2 < boardRows && c2 < boardCols ? board[r2][c2] : null,
            );
          if (values.every(v => v !== null)) lines.push({ cells, values });
        }
      }
    };

  if (ruleRows > 1) addLines(0, 0, boardRows - ruleRows, boardCols - 1, 1, 0, ruleRows);
  if (ruleCols > 1) addLines(0, 0, boardRows - 1, boardCols - ruleCols, 0, 1, ruleCols);

  if (diagonals) {
    const maxSteps = Math.min(
      ruleRows === 1 || ruleCols === 1 ? Math.max(ruleRows, ruleCols) : Math.min(ruleRows, ruleCols),
      boardRows,
      boardCols,
    );
    addLines(0, 0, boardRows - maxSteps, boardCols - maxSteps, 1, 1, maxSteps);
    addLines(0, maxSteps - 1, boardRows - maxSteps, boardCols - 1, 1, -1, maxSteps);
  }

  for (const { cells, values } of lines)
    if (values.every((v: null) => v !== null && v === values[0])) return { cells, player: values[0] };

  return null;
}

function isDraw(board: Board): boolean {
  return board.flat().every(cell => cell !== null);
}

function makeMove(board: Board, row: number, col: number, player: Player): boolean {
  if (board[row][col] !== null) return false;
  board[row][col] = player;
  return true;
}

function getAIMove(
  board: Board,
  boardRules: [number, number],
  aiPlayer: Player,
  humanPlayer: Player,
  diagonals: boolean,
): [number, number] {
  const numRows = board.length,
    numCols = board[0].length,
    simulateMove = (row: number, col: number, player: Player) => {
      const copy = board.map(r => [...r]);
      copy[row][col] = player;
      return copy;
    };

  // Check for winning or blocking moves
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (board[row][col] === null) {
        const simulatedBoard = simulateMove(row, col, aiPlayer);
        if (
          checkWinner(simulatedBoard, boardRules, diagonals)?.player === aiPlayer ||
          checkWinner(simulateMove(row, col, humanPlayer), boardRules, diagonals)?.player === humanPlayer
        )
          return [row, col];
      }
    }
  }

  // Pick a random move
  const emptyCells: [number, number][] = [];
  board.forEach((row, rIdx) =>
    row.forEach((cell, cIdx) => {
      if (cell === null) emptyCells.push([rIdx, cIdx]);
    }),
  );
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function parseBoardFromComponents(message: Message, players: Player[]): Board {
  const rows = message.components.map(row =>
    row.components.map((button: ButtonComponent) =>
      button.emoji.name === 'blank' ? null : players.find(p => p.icon.includes(button.emoji.name)),
    ),
  );
  return rows;
}

function disableBoard(board: Board, winningCells?: number[][]): ActionRowBuilder<ButtonBuilder>[] {
  return board.map((row, rowIndex) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      row.map((cell, colIndex) =>
        new ButtonBuilder()
          .setCustomId(`tictactoe_${rowIndex}_${colIndex}`)
          .setEmoji(cell === null ? '<blank:1310238931245334609>' : cell.icon)
          .setStyle(
            winningCells?.some(c => c[0] === rowIndex && c[1] === colIndex)
              ? ButtonStyle.Success
              : ButtonStyle.Secondary,
          )
          .setDisabled(true),
      ),
    ),
  );
}

function generateSizes(maxRows: number, maxCols: number, minRows = 1, minCols = 1) {
  if (minRows === null && minCols === null) return [`${maxRows}x${maxCols}`];

  const rowRange = minRows === null ? [maxRows] : Array.from({ length: maxRows - minRows + 1 }, (_, i) => i + minRows),
    colRange = minCols === null ? [maxCols] : Array.from({ length: maxCols - minCols + 1 }, (_, i) => i + minCols);

  return rowRange.flatMap(row => colRange.map(col => `${row}x${col}`));
}
