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
  ButtonComponent,
  User,
  EmbedBuilder,
  italic,
  PermissionFlagsBits,
} from 'discord.js';
import { Command, CommandArgs } from '../../lib/structures/Command.js';
import { sleep } from '../utils.js';
import { imageOptions } from '../defaults.js';

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
            type: ApplicationCommandOptionType.User,
          },
          {
            choices: generateSizes(5, 5, 3, 3).map(s => ({ name: s, value: s })),
            description: 'TICTACTOE.DESC.BOARD_SIZE',
            name: 'CMD.BOARD_SIZE',
            type: ApplicationCommandOptionType.String,
          },
          {
            autocomplete: true,
            description: 'TICTACTOE.DESC.BOARD_RULES',
            name: 'CMD.BOARD_RULES',
            type: ApplicationCommandOptionType.String,
          },
          {
            description: 'TICTACTOE.DESC.COMBINATIONS',
            minValue: 1,
            name: 'CMD.COMBINATIONS',
            type: ApplicationCommandOptionType.Integer,
          },
          {
            description: 'TICTACTOE.DESC.DIAGONALS',
            name: 'CMD.DIAGONALS',
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
        combinations = options.getInteger('combinations') ?? 1,
        opponentData = await client.database.users.fetch(opponent.id),
        players: PlayerCell[] = [
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
            value: `**${__('BOARD_SIZE')}:** \`${boardSize}\`\n**${__('BOARD_RULES')}:** \`${boardRules}\`\n**${__('COMBINATIONS')}:** \`${combinations}\`\n**${__('DIAGONALS')}:** ${diagonals ? client.useEmoji('check') : client.useEmoji('no')}`,
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
      const { customId, guild, message } = interaction,
        emb = new EmbedBuilder(message.embeds[0]),
        players: PlayerCell[] = await Promise.all(
          emb.data.fields[0].value?.split('\n').map(async line => {
            const u = interaction.client.users.cache.get(line.match(/<@!?(\d+)>/)?.[1]);
            return {
              icon: (await client.database.users.fetch(u.id))?.gameIcon || line.replaceAll('_', '')?.split(' ')[0],
              user: u,
            };
          }),
        ),
        currentPlayer = players.find(
          p => p.user.id === emb.data.footer?.icon_url.match(/(?:users|avatars)\/(\d+)\//)?.[1],
        ),
        settings = Array.from(message.embeds[0].fields[1].value.matchAll(/`([^`]+)`/g), m => m[1]).map((v, i) =>
          i < 2 ? v.split('x').map(Number) : Number(v),
        ) as [[number, number], [number, number], number],
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
          await updateBoard(createEmptyBoard(settings[0][0], settings[0][1]), players[0], emb.setDescription(null));
          // Notify the player if the opponent doesn't respond in 2 minutes
          if (Date.now() - message.createdTimestamp >= 120000) {
            await interaction
              .followUp({
                allowedMentions: { users: [players[0].user.id] },
                content: `${players[0].user}`,
              })
              .then(i => i.delete());
          }
          return;
        }
        case 'tictactoe_decline': {
          const opponent = guild?.members.cache.get(players[1].user.id) ?? players[1].user;
          return interaction.update({
            components: [],
            content: null,
            embeds: [
              emb
                .setFooter({
                  iconURL: opponent.displayAvatarURL(imageOptions),
                  text: __('INTERACTED_BY', { userName: opponent.displayName }),
                })
                .setDescription(__('GAME.DECLINED'))
                .setColor(Colors.Red),
            ],
          });
        }
      }

      if (currentPlayer.user.id !== interaction.user.id) {
        return interaction
          .reply({
            embeds: [embed({ type: 'error' }).setDescription(__('ERROR.NOT_YOUR_TURN'))],
            flags: MessageFlags.Ephemeral,
          })
          .then(i => setTimeout(() => i.delete(), 3000));
      }

      const handleMove = async (board: Board, boardRules: [number, number]) => {
        const numRows = board.length,
          numCols = board[0].length,
          diagonals = emb.data.fields[1].value.includes('check');

        if (!makeMove(board, parseInt(row), parseInt(col), currentPlayer)) {
          await interaction.update({ embeds: [emb.setDescription('ERROR.INVALID_MOVE').setColor(Colors.Red)] });
          return;
        }

        let winner: PlayerCell;
        ({ board, winner } = checkCombinations(board, boardRules, diagonals, settings[2]));

        if (winner) {
          await interaction.update({
            components: generateComponents(board, winner),
            embeds: [
              emb
                .setDescription(__('TICTACTOE.WINNER', { player: winner.user.toString() }))
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
            components: generateComponents(board),
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

          function getAIMove(): [number, number] {
            const simulateMove = (r: number, c: number, player: PlayerCell) => {
              const copy = board.map(bR => [...bR]);
              copy[r][c] = player;
              return copy;
            };

            // Check for winning or blocking moves
            for (let r = 0; r < numRows; r++) {
              for (let c = 0; c < numCols; c++) {
                if (board[r][c] === null) {
                  if (
                    checkCombinations(simulateMove(r, c, nextPlayer), boardRules, diagonals, settings[2], true)
                      ?.winner === nextPlayer ||
                    checkCombinations(simulateMove(r, c, currentPlayer), boardRules, diagonals, settings[2], true)
                      ?.winner === currentPlayer
                  )
                    return [r, c];
                }
              }
            }

            // Pick a random move
            const emptyCells: [number, number][] = [];
            board.forEach((r, rIdx) =>
              r.forEach((c, cIdx) => {
                if (c === null) emptyCells.push([rIdx, cIdx]);
              }),
            );
            return emptyCells[Math.floor(Math.random() * emptyCells.length)];
          }

          const [aiRow, aiCol] = getAIMove();

          makeMove(board, aiRow, aiCol, nextPlayer);

          ({ board, winner } = checkCombinations(board, boardRules, diagonals, settings[2]));

          if (winner) {
            await interaction.editReply({
              components: generateComponents(board, winner),
              embeds: [
                emb
                  .setDescription(__('TICTACTOE.WINNER', { player: winner.user.toString() }))
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
              components: generateComponents(board),
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

      if (action === 'tictactoe' && row !== undefined && col !== undefined) {
        const board = message.components.map(r =>
          r.components.map((button: ButtonComponent) =>
            button.emoji.name === 'blank' ? null : players.find(p => p.icon.includes(button.emoji.name)),
          ),
        );
        await handleMove(board, settings[1]);
      }
    }

    async function updateBoard(board: Board, currentPlayer: PlayerCell, emb: EmbedBuilder) {
      const currentMember = interaction.guild?.members.cache.get(currentPlayer.user.id),
        rows = generateComponents(board);
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
          iconURL: (currentMember ?? currentPlayer.user).displayAvatarURL(),
          text: `${(currentMember ?? currentPlayer.user).displayName}'s turn`,
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

    function generateComponents(board: Board, winner?: PlayerCell): ActionRowBuilder<ButtonBuilder>[] {
      return board.map((row, rowIndex) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          row.map((cell, colIndex) =>
            new ButtonBuilder()
              .setCustomId(`tictactoe_${rowIndex}_${colIndex}`)
              .setEmoji(cell?.icon ?? client.useEmoji('blank'))
              .setStyle(
                cell?.matched
                  ? winner && cell.user.id === winner.user.id
                    ? ButtonStyle.Success
                    : ButtonStyle.Primary
                  : ButtonStyle.Secondary,
              )
              .setDisabled(!!cell || !!winner),
          ),
        ),
      );
    }

    function checkCombinations(
      board: Board,
      boardRules: [number, number],
      diagonals: boolean = true,
      requiredCombinations: number = 1,
      isAI: boolean = false,
    ): { board: Board; winner: PlayerCell | null } {
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
              const cells = [];
              for (let i = 0; i < maxSteps; i++) {
                const nr = r + i * stepRow,
                  nc = c + i * stepCol;
                if (nr < 0 || nc < 0 || nr >= boardRows || nc >= boardCols) break;
                cells.push([nr, nc]);
              }
              if (cells.length === maxSteps) lines.push(cells);
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

      const matchCount = new Map<PlayerCell, number>(),
        matchedPositions = new Set<string>();

      for (const cells of lines) {
        const firstValue = board[cells[0][0]][cells[0][1]];
        if (firstValue !== null && cells.every(([r, c]) => board[r][c] === firstValue)) {
          const player = firstValue as PlayerCell;
          matchCount.set(player, (matchCount.get(player) || 0) + 1);
          cells.forEach(([r, c]) => matchedPositions.add(`${r},${c}`));
        }
      }

      const winner =
          Array.from(matchCount.entries()).reduce(
            (highest, [player, count]) =>
              count >= (isAI ? 1 : requiredCombinations) && (highest === null || count > highest[1])
                ? [player, count]
                : highest,
            null,
          )?.[0] || null,
        resultBoard = board.map((row, r) =>
          row.map((cell, c) => (matchedPositions.has(`${r},${c}`) ? { ...cell, matched: true } : cell)),
        );

      return { board: resultBoard, winner };
    }

    function createEmptyBoard(rows: number, cols: number): Board {
      return Array(rows)
        .fill(null)
        .map(() => Array(cols).fill(null));
    }

    function isDraw(board: Board): boolean {
      return board.flat().every(cell => cell !== null);
    }

    function makeMove(board: Board, row: number, col: number, player: PlayerCell): boolean {
      if (board[row][col] !== null) return false;
      board[row][col] = player;
      return true;
    }
  }
}

type PlayerCell = {
  icon: string;
  matched?: boolean;
  user: User;
};
type Board = PlayerCell[][];

function generateSizes(maxRows: number, maxCols: number, minRows = 1, minCols = 1) {
  if (minRows === null && minCols === null) return [`${maxRows}x${maxCols}`];

  const rowRange = minRows === null ? [maxRows] : Array.from({ length: maxRows - minRows + 1 }, (_, i) => i + minRows),
    colRange = minCols === null ? [maxCols] : Array.from({ length: maxCols - minCols + 1 }, (_, i) => i + minCols);

  return rowRange.flatMap(row => colRange.map(col => `${row}x${col}`));
}
