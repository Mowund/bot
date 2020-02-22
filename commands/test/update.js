const Discord = require('discord.js');
const utils = require('../../utils/utils.js');
const client = new Discord.Client();

module.exports.run = async (bot, message, args) => {

    const channel = message.guild.channels.find(c => c.id === '420352343402348544' && c.type === 'news')

    var e1 = new Discord.RichEmbed()
    .setThumbnail(`https://cdn.discordapp.com/icons/420007989261500418/7307c28f2b48677cb35619def07d6e00.png`)
    .setTitle('1.17 — **Revamping Update**')
    .addField("**__Bots__**", "+ Novos bots: <@294882584201003009>, <@348869590958342145>, <@204255221017214977>, <@365975655608745985>, <@285480424904327179>, <@429024440060215296>, <@528019494648414212>, <@618587791546384385>, <@485962834782453762>, <@172002275412279296>, <@416358583220043796> e <@439205512425504771>.\n\nㅤ• <@294882584201003009>:\n\nㅤㅤ• Seu prefixo é: `!g`\n\nㅤㅤ• Disponível somente no chat <#447507151423012865>.\n\nㅤㅤ• Usado para fazer os sorteios.\n\nㅤ• <@348869590958342145> (Hacker Bot):\n\nㅤㅤ• Seu prefixo é: `;`\n\nㅤㅤ• Disponível somente no chat <#522894447810445327>.\n\nㅤㅤ• Usado para a comunicação entre chats tanto do mesmo servidor quanto de servidores diferentes.\n\nㅤ• <@204255221017214977>:\n\nㅤㅤ• Seu prefixo é: `-`\n\nㅤㅤ• Um bot geral.\n\nㅤ• <@365975655608745985>:\n\nㅤㅤ• Seu prefixo é: `/`\n\nㅤㅤ• Bot de jogo, disponível somente no chat <#534499299392749568>.\n\nㅤ• <@285480424904327179>:\n\nㅤㅤ• Seu prefixo é: `bb`\n\nㅤㅤ• Bot NSFW, disponível somente nos chats <#424361799761002506> e <#597182202597343232>.")
    .addField("ㅤ", "ㅤ• <@429024440060215296> (Cards-Against-Humanity):\n\nㅤㅤ• Seu prefixo é: `c!`\n\nㅤㅤ• Bot de jogo, disponível somente no chat <#599984028036366346>.\n\nㅤ• <@528019494648414212>:\n\nㅤㅤ• Seu prefixo é: `1`\n\nㅤㅤ• Bot de jogo, disponível somente no chat <#521772002088845322>.\n\nㅤㅤ• Esse bot é uma substituição permanente do **@Discord Miner#1437**.\n\nㅤ• <@618587791546384385>:\n\nㅤㅤ• Seus prefixos são: `}` e `>`\n\nㅤㅤㅤ• O prefixo `}` é para a versão estável, e o prefixo `>` é para a versão de testes.\n\nㅤㅤ• Bot geral, criado exclusivamente para este servidor. Suas atualizações serão anunciadas no <#602176887166599168>.\n\nㅤ• <@485962834782453762>:\n\nㅤㅤ• Seu prefixo é: `\\`\n\nㅤㅤ• Bot geral, usado para o novo sistema de nível do servidor, substituindo o <@159985870458322944>.\n\nㅤ• <@172002275412279296>:\n\nㅤㅤ• Seu prefixo é: `t!`\n\nㅤㅤ• Bot comum.\n\nㅤ• <@416358583220043796>:\n\nㅤㅤ• Seu prefixo é: `x!`\n\nㅤㅤ• Bot de backup, disponível em todos os chats, mas não pode ser usado.")
    .addField("ㅤ", "ㅤ• <@439205512425504771>:\n\nㅤㅤ• Seu prefixo é: `.`\n\nㅤㅤ• Bot comum.\n\n∗ O bot **@Aki** foi renomeado para <@356065937318871041>.\n\n∗ O prefix do <@235088799074484224> foi alterado de `%` para `/`.\n\n∗ A bot <@213466096718708737> agora está disponível no chat <#424361799761002506> e não está mais disponível nos chats <#420352281486163998> e <#462618031701622784>.\n\n- O bot <@159985870458322944> foi arquivado e não está mais disponível em nenhum chat, sendo substituído pelo <@485962834782453762>.\n\n- O **@Reaction Role#5613** (**Configurador**) foi removido, sendo substituído pelo <@204255221017214977>.\n\n- Os bots **@PacMan#3944** e **@Discord Miner#1437** foram removidos por terem sido descontinuados.")
    .addField("**__Canais de Voz__**", "+ Novos canais de voz: **\\💣 JOGOS MUSICAL \\💣**, **\\💣 JOGOS 1 \\💣** e **\\💣 JOGOS 2 \\💣**.\n\nㅤ• **\\💣 JOGOS MUSICAL \\💣**: o mesmo que o **\\💠 GERAL MUSICAL \\💠**, porém é sobre jogos.\n\nㅤ• **\\💣 JOGOS 1 \\💣** e **\\💣 JOGOS 2 \\💣**: os mesmos que os **\\💠 GERAL 1 \\💠** e **\\💠 GERAL 2 \\💠**, respectivamente, porém são sobre jogos.\n\n∗ Todos os canais de voz tiveram a taxa de bits aumentada para **76kbps**, com excessão do canal de voz **\\🎵 MÚSICA \\🎵**, que continua sendo **96kbps**.")
    .addField("**__Categorias__**", "+ Novas categorias: **\\📡 ATUALIZAÇÕES \\📡**, **\\🚧 DESENVOLVIMENTO \\🚧**, **\\🎮 JOGOS \\🎮** e **\\📁 ARQUIVADOS \\📁**.\n\nㅤ• **\\📡 ATUALIZAÇÕES \\📡**:\n\nㅤㅤ• Nesta categoria estão os chats sobre atualizações do servidor.\n\nㅤㅤ• **Canais**: <#420352343402348544>, <#602176887166599168> e <#541692498624643073>.\n\nㅤ• **\\🚧 DESENVOLVIMENTO \\🚧**:\n\nㅤㅤ• Nesta categoria ficará os chats onde vocês sugerem e reportam coisas para o servidor, além do chat arquivos.\n\nㅤㅤ• **Canais**: <#592066571208491041>, <#422160128016384010>.\n\nㅤㅤ• Fica entre as categorias **\\👾 BOT GAMES \\👾** e **\\💫 EXPERIMENTAL \\💫**.\n\nㅤ• **\\🎮 JOGOS \\🎮**:\n\nㅤㅤ• Nesta categoria estão os canais de voz sobre jogos.\n\nㅤㅤ• **\\💣 JOGOS MUSICAL \\💣**, **\\💣 JOGOS 1 \\💣** e **\\💣 JOGOS 2 \\💣**\n\nㅤ• **\\📁 ARQUIVADOS \\📁**:\n\nㅤㅤ• Nesta categoria ficará os chats e canais de voz que, em vez de serem deletados, serão arquivados, podendo serem desarquivados a qualquer momento.")
	.addField("ㅤ", "ㅤㅤ• Somente quem tem o cargo <@&593212478490542126> pode ver essa categoria.\n\n∗ Algumas categorias foram reorganizadas.\n\n∗ As seguintes categorias foram renomeadas:\n\nㅤ• **\\💻 BOT \\💻** >> **\\🤖 BOT \\🤖**\n\nㅤ• **\\🎮 JOGOS \\🎮** >> **\\👾 BOT GAMES \\👾**\n\nㅤ• **\\🚫 HIDDEN \\🚫** >> **\\❌ OCULTO \\❌**\n\nㅤ• **\\📣 IMPORTANTE \\📣** >> **\\📣 INFORMAÇÕES \\📣**\n\nㅤ• **\\🎈 MISC \\🎈** (Chats) >> **\\🧨 MISCELÂNEAS \\🧨**\n\nㅤ• **\\🎈 MISC \\🎈** (Canais de Voz) >> **\\🔉 OUTROS \\🔉**\n\n- A categoria **\\🏢 PARCEIROS \\🏢** foi deletada.")
    .setColor(65280);
	
    var e2 = new Discord.RichEmbed()
    .addField("**__Cargos__**", "+ Novos cargos staff: <@&533732878463270924>, <@&532317064799715340>, <@&600125882568409089>, <@&600125943754784805>\n\nㅤㅤ• Por enquanto não têm uma função.\n\n+ Novos cargos de configuração: <@&548987673289687041>, <@&584460982726950912>, <@&531265681459773440>, <@&531267169464483860>, <@&531267678564778006>, <@&531267771162689546>, <@&602143940321214475> e <@&593212478490542126>.\n\nㅤ• <@&548987673289687041>:\n\nㅤㅤ• Cargo ganho na configuração **Server Mod Loader**.\n\nㅤㅤ• Por enquanto não tem uma função.\n\nㅤ• <@&584460982726950912>, <@&531265681459773440>, <@&531267169464483860>, <@&531267678564778006>, <@&531267771162689546> e <@&602143940321214475>:\n\nㅤㅤ• Cargos de atualizações ganhos na configuração **Menção de Atualização**.\n\nㅤㅤ• Cada cargo serve para ser mencionado no <#420352343402348544> quando seu respectivo tipo de atualização for lançado.\n\nㅤ• <@&593212478490542126>:\n\nㅤㅤ• Cargo ganho na configuração **Arquiviewer**.")
	.addField("ㅤ", "ㅤㅤ• Este cargo serve para poder ver os chats e canais de voz arquivados e ler as mensagens deles.\n\n+ Novos cargos de registro: <@&462672934784466966>, <@&531308539642380289>, <@&531350086173851648>, <@&531349878199287828>, <@&531350342781370389>, <@&531350971167801346>, <@&531350472720646144> e <@&566002609568088103>.\n\nㅤ• <@&462672934784466966>, <@&531308539642380289>, <@&531350086173851648>, <@&531349878199287828>, <@&531350342781370389>, <@&531350971167801346>, <@&531350472720646144>:\n\nㅤㅤ• Cargos ganhos na 2ª etapa (Sexualidade).\n\nㅤ• <@&566002609568088103>:\n\nㅤㅤ• Cargo readicionado, ganho na 7ª etapa (NSFW).\n\nㅤㅤ• Usado para ter acesso aos chats <#424361799761002506> e <#597182202597343232>.\n\n+ Novo cargo de código: <@&600010701632831521>.\n\nㅤㅤ• Ganho ao usar um novo código no chat <#523920339991003163> e te dá acesso ao chat <#592066571208491041>.\n\n+ Novos cargos elementais:\n\nㅤ• **Vácuo:** <@&665396695588143127>.\n\nㅤㅤ• Novo cargo de nível ganho no nível **0**, após fazer o <#462669344841924618>.")
	.addField("ㅤ", "ㅤ• **Água:** <@&620644424178991115>, <@&619703409955700738>, <@&619704548914626590>, <@&619704550797869076>, <@&619704553327034388>, <@&619704555894210579>.\n\nㅤㅤ• Novos cargos de nível, ganhos nos níveis **5**, **10**, **20**, **30** e **40**, respectivamente. O cargo <@&619704555894210579> ainda não é usado para nível nenhum.\n\nㅤ• **Fogo:** <@&620645085737910321>, <@&619706112287047680>, <@&619706114220621824>, <@&619706663099826176>, <@&619706834990923789>, <@&620647171095527425> \n\n<@&619707386633912341>.\n\nㅤㅤ• Nenhum dos cargos são usados para nível nenhum, mas ainda serão usados no futuro.\n\n∗ O cargo <@&488321116725706772> teve a cor alterada e agora é ganho ao chegar no nível **15**.\n\nㅤ• Agora é um cargo elemental de **Água**.\n\n∗ Os seguintes cargos foram renomeados:\n\nㅤ• **@Saikin** >> <@&460504608016433162>\nㅤ• **@Esquerdistas** >> <@&447739272137801749>")
	.addField("ㅤ", "∗ Os <@&422226630841335819> agora ficam abaixo dos <@&447739272137801749> e acima dos <@&462734920058667038>.\n\n∗ O cargo **@Apelidador** foi mesclado com os cargos de nível a partir do nível 10.\n\nㅤ• Quem tinha esse cargo foi reembolsado.\n\n∗ O cargo **Quest SC** recebeu algumas mudanças:\n\nㅤ• Foi renomeado para <@&510265939086934019>.\n\nㅤ• Agora pode ser ganho ao descobrir um novo código.\n\n∗ O cargo <@&490590315430936588> agora pode ser ganho ao descobrir um novo código.\n\n∗ A opção de mencionar o cargo por todos foi desativada em todos os cargos.\n\n∗ O cargo **@LGBT** foi separado nos novos cargos de sexualidade.\n\n- Os cargos **@Robô**, **@Marvel** e **@DC** foram removidos.\n\n- Todos os cargos de idade foram removidos e substituídos pelo <@&566002609568088103> novamente.\n\n- Todos os cargos de níveis antigos (exceto o <@&488321116725706772>) foram removidos.")
    .addField("**__Chats__**", "+ Novos chats: <#523923194269138974>, <#522894447810445327>, <#523920339991003163>, <#530867109505269781>, <#541692498624643073>, <#592066571208491041>, <#602176887166599168>, <#599984028036366346>, <#534499299392749568> e <#597182202597343232>.\n\nㅤ• <#523923194269138974>: \n\nㅤㅤ• Com a separação do **#\\📖regras-e-info\\📖**  em dois chats, neste chat estarão as informações do servidor.\n\nㅤ• <#522894447810445327>:\n\nㅤㅤ• Usa o <@348869590958342145>.\n\nㅤㅤ• Neste chat você poderá conversar com membros de outro servidor e vice-versa.\n\nㅤㅤㅤ• Por enquanto não tem nenhum servidor conectado com este chat, mas no futuro terá.\n\nㅤㅤ• O chat atualmente está na categoria **\\📁 ARQUIVADOS \\📁**\n\nㅤ• <#523920339991003163>:\n\nㅤㅤ• Neste chat você digita os códigos que achar pelo servidor e ganha recompensas.\n\nㅤㅤㅤ• Por enquanto existem `3` códigos válidos, cada um tem sua função:\n\nㅤㅤㅤㅤ• Um deles te dá o cargo <@&510265939086934019>, fazendo você ter acesso ao chat <#510203957939798018>.")
    .addField("ㅤ", "ㅤㅤㅤㅤ• Outro te dá o cargo <@&600010701632831521>, fazendo você ter acesso ao chat <#592066571208491041>.\n\nㅤㅤㅤㅤ• E outro te dá o cargo <@&490590315430936588>.\n\nㅤㅤ• O bot usado no chat é o <@204255221017214977>.\n\nㅤㅤ• Chat disponível somente para membros registrados, na categoria **\\🧨 MISCELÂNEAS \\🧨**\n\nㅤ• <#530867109505269781>:\n\nㅤㅤ• Neste chat você pode personalizar o servidor para uma melhor experiência, por enquanto existem 4 configurações:\n\nㅤㅤㅤ• **Server Mod Loader**:\n\nㅤㅤㅤㅤ• Ela ainda não tem uma função, mas caso queira pegar o cargo <@&548987673289687041>, você pode.\n\nㅤㅤㅤㅤ• O cargo recebível nessa configuração é o .\n\nㅤㅤㅤ• **Menção de Atualização**:\n\nㅤㅤㅤㅤ• Nela você pode configurar se quer ser mencionado no <#420352343402348544> quando fora lançada uma Live, um Trailer, uma Snapshot, uma Pre-Release uma Major e/ou Minor Release.\n\nㅤㅤㅤㅤ• Os cargos recebíveis respectíveis para cada tipo de menção são:")
    .setColor(65280);
    
    var e3 = new Discord.RichEmbed()
    .setDescription("ㅤㅤㅤㅤㅤ• Live: <@&584460982726950912>\nㅤㅤㅤㅤㅤ• Trailer: <@&531265681459773440>\nㅤㅤㅤㅤㅤ• Snapshot: <@&531267169464483860>\nㅤㅤㅤㅤㅤ• Pre-Release: <@&531267678564778006>\nㅤㅤㅤㅤㅤ• Major Release: <@&531267771162689546>\nㅤㅤㅤㅤㅤ• Minor Release: <@&602143940321214475>\n\nㅤㅤㅤ• **Testador Experimental**:\n\nㅤㅤㅤㅤ• Nela você pode configurar se quer ter acesso aos canais experimentais do servidor, recebendo o cargo <@&447409833361014804>.\n\nㅤㅤㅤ• **Arquiviewer**:\n\nㅤㅤㅤㅤ• Nela você pode configurar se quer ter acesso aos canais arquivados do servidor, recebendo o cargo <@&593212478490542126>.\n\nㅤㅤ• Esse chat usa o <@204255221017214977>.\n\nㅤ• <#541692498624643073>:\n\nㅤㅤ• Neste chat serão anunciadas qualquer tipo de coisa.\n\nㅤㅤ• É um canal de anúncios.\n\nㅤ• <#592066571208491041>:\n\nㅤㅤ• O chat funciona com pastas e arquivos. A pasta é aonde se localiza tais arquivos.\n\nㅤㅤㅤ• Ele contém atualmente 1 pasta, a **Canais**.")
    .addField("ㅤ", "ㅤㅤㅤㅤ• Contém todas as categorias de canais do servidor, e dentro das categorias contém todos os chats e canais de voz desta categoria. Dentro dessa pasta pode conter categorias, chats ou canais de voz que não são visíveis ou que não existem, mas se não existem e estão ali, com certeza serão adicionados no futuro.\n\nㅤ• <#602176887166599168>:\n\nㅤㅤ• É a mesma coisa que o <#420352343402348544>, porém é para anunciar as atualizações do <@618587791546384385>.\n\nㅤㅤ• É um canal de anúncios.\n\nㅤ• <#599984028036366346>:\n\nㅤㅤ• Chat de jogo, usado pelo <@429024440060215296>.\n\nㅤ• <#534499299392749568>:\n\nㅤㅤ• Chat de jogo que é a mesma coisa que o antigo chat do <@365975655608745985>.\n\nㅤ• <#597182202597343232>:\n\nㅤㅤ• É a mesma coisa que o <#424361799761002506>.\n\n∗ O chat <#462669344841924618> recebeu uma grande mudança:\n\nㅤ• Agora o chat é automatizado, ele utiliza o @YAGPDB.xyz#8760 para a automatização. Basta clicar na reação que você irá receber o cargo.\n\nㅤ• Não é mais necessário colocar o nick padrão.")
    .addField("ㅤ", "ㅤ• A parte de Marvel e DC foi removida.\n\nㅤ• A 7ª etapa agora funciona com o cargo <@&566002609568088103> novamente.\n\nㅤ• Quando você pega qualquer cargo de registro, após 1 minuto você vai receber o cargo <@&447739272137801749>. Caso você já tenha se registrado e ainda ter o cargo <@&462734920058667038>, é só enviar uma mensagem em qualquer chat que você irá perde-lo.\n\n∗ O chat <#422160128016384010> foi completamente retrabalhado, usando agora um próprio sistema do servidor.\n\nㅤ• Nesse sistema é usado os comandos customizáveis do <@204255221017214977>.\n\nㅤ• Existem 6 marcações diferentes para uma sugestão:")
    .addField("ㅤ", "ㅤㅤ• **Novo**: Significa que é uma nova sugestão, ainda não comandada por um staff. Sua cor é **Branca**.\nㅤㅤ• **Aprovado**: Significa que sua sugestão foi aprovada e será implementada. Sua cor é **Verde**.\nㅤㅤ• **Potencial**: Significa que sua sugestão pode ou não ser aprovada, ainda não decidida, normalmente depende da votação. Sua cor é **Amarela**.\nㅤㅤ• **Recusado**: Significa que sua sugestão foi recusada e não será implementada. Sua cor é **Vermelha**.\nㅤㅤ• **Inválido**: Significa que sua sugestão é inválida, não é considerada uma sugestão válida. Sua cor é **Cinza**.\nㅤㅤ• **Duplicado**: Significa que sua sugestão é duplicada, não é original, já existe uma sugestão anterior parecida a esta. A sugestão original será mencionada. Sua cor é **Azul**.\n\nㅤ• Em todas as marcações, com excessão do **Novo**, terá uma parte chamada **Cessionário**, abaixo dessa palavra terá um staff, esse staff é quem está comandando a sua sugestão, podendo mudar a marcação ou deletar a sugestão.")
    .addField("ㅤ", "ㅤㅤ• Além disso, com excessão das marcações **Novo** e **Duplicado**, também terá uma parte chamada **Motivo|Resposta do Cessionário**, que é uma resposta que o cessionário dá para a sua sugestão.\n\nㅤ• Agora existe um cooldown de **10 minutos** por usuário para poder enviar uma nova sugestão\n\nㅤ• É possível editar ou deletar sua sugestão, para isso é preciso usar o comando `-edits` ou `-dels`, respectivamente.\n\nㅤㅤ• Você só pode editar sua sugestão se ela não ter um cessionário.")
    .addField("ㅤ", "∗ Os seguintes chats foram renomeados:\n\nㅤ• **#\\📖regras\\📖** >> <#508445873219305502>\nㅤ• **#\\🌐sus-1\\🌐** >> <#420352281486163998>\nㅤ• **#\\🌐sus-2\\🌐** >> <#462618031701622784>\nㅤ• **#\\👽memes-e-menes\\👽** >> <#458742137635209236>\nㅤ• **#\\🎴arte-da-comunidade\\🎴** >> <#458742603454611476>\nㅤ• **#\\🔇flood-e-spam\\🔇** >> <#508439442575327233>\nㅤ• **#\\📝idéias-e-planejamentos\\📝** >> <#510203957939798018>\nㅤ• **#\\🔨minerador\\🔨** >> <#521772002088845322>\nㅤ• **#\\📼outros\\📼** >> <#461631159965581312>\nㅤ• **#\\🔥nsfw\\🔥** >> <#424361799761002506>\n\n∗ Os chats <#467105280799539210>, <#454395189394407425>, <#422236981586690048>, <#460762542260748288> e <#521772002088845322> agora utilizam outros bots:")
    .addField("ㅤ", "ㅤ• <#467105280799539210>: <@204255221017214977>\n\nㅤ• <#454395189394407425>: <@204255221017214977>\n\nㅤ• <#422236981586690048>: <@618587791546384385>\n\nㅤㅤ• Os comandos e suas informações estão nas instruções do chat, nas mensagens fixadas.\n\nㅤ• <#460762542260748288>: <@485962834782453762>\n\nㅤ• <#521772002088845322>: <@528019494648414212>\n\n∗ O chat <#447507151423012865> agora funciona com um bot, esse bot é o <@294882584201003009>.\n\nㅤ• Agora o bot vai enviar uma mensagem e o sorteio terá uma duração, você tem que apertar em uma reação para participar do sorteio, quando o tempo acabar, o vencedor será escolhido randomicamente.\n\n∗ Os chats de servidores parceiros agora são só um, sendo o <#534175214422982657>.\n\nㅤ• O chat agora está disponível na categoria **\\📣 INFORMAÇÕES \\📣**.\n\n∗ O chat **#\\🎂aniversários\\🎂** foi mesclado com o <#503218091929501717>.\n\nㅤ• Quando alguém der boost no servidor, agora será falado neste chat.")
    .setColor(65280);
    
    var e4 = new Discord.RichEmbed()
    .setDescription("∗ O chat **#\\📖regras-e-info\\📖** foi separado em dois chats, sendo esse para as <#508445873219305502> e o outro para as <#523923194269138974>.\n\n∗ O chat <#462618031701622784> agora está disponível somente a partir do nível **5**.\n\n∗ Os chats <#420352343402348544>, <#602176887166599168> e <#541692498624643073> são canais de anúncios, em vez de textos.\n\nㅤ• Ou seja, você agora pode seguir o canal para receber as atualizações nos seus servidores.\n\nㅤㅤ• **Observação:** cargos mencionados no changelog sempre aparecerão como **@deleted-role** nos servidores seguidores.\n\n∗ O chat <#510203957939798018> agora está na categoria **\\🧨 MISCELÂNEAS \\🧨**.\n\n- Os chats **#\\⛔rejeitado\\⛔** e **#\\👻pacman\\👻** foram deletados.\n\n- O servidor **um server pra amigar** não é mais parceiro e teve seu chat deletado.")
    .addField("**__Comandos__**" ,"+ Novos comandos:  `SCLM` , `-squote`, `-suggest`, `-edits`, `-dels` e `-sa`\n\nㅤ• `SCLM`: \n\nㅤㅤ• Não é bem um comando com um prefixo, na verdade ao enviar o link de uma mensagem você vai ativar esse comando.\n\nㅤㅤㅤ• Enviando o link de uma mensagem, o <@204255221017214977> irá citá-la, com uma interface diferente.\n\nㅤㅤㅤ• Se você enviar somente o link da mensagem, sua mensagem será deletada, mas caso tenho algo a mais do que o link na sua mensagem, ela não será deletada.\n\nㅤ• `-squote`:\n\nㅤㅤ• Comando usado para citar uma sugestão, tendo uma interface semelhante à do SCLM.\n\nㅤㅤ• Uso correto: `-squote {ID da Mensagem da Sugestão}`.\n\nㅤ• `-suggest`\n\nㅤㅤ• Comando usado para enviar uma sugestão.\n\nㅤㅤ• Uso correto: `-suggest {Sugestão}`.\n\nㅤ• `-edits`:\n\nㅤㅤ• Comando usado para editar uma sugestão no chat <#422160128016384010>.\n\nㅤㅤㅤ• A sua sugestão deve estar marcada como **Novo**, caso contrário, se ter um cessionário e for marcada como outra coisa, você não pode editar sua sugestão.")
	.addField("ㅤ", "ㅤㅤ• Uso correto: `&edits {ID da Sugestão} {Nova Descrição}`.\n\nㅤ• `-dels`\n\nㅤㅤ• Comando usado para deletar uma sugestão.\n\nㅤㅤ• Uso correto: `-dels {ID da Sugestão}`.\n\nㅤㅤ• Só é possível deletar sua própria sugestão.\n\nㅤ• `-sa`\n\nㅤㅤ• Comando usado exclusivamente para os staffs usado para moderar uma sugestão.\n\nㅤㅤ• Uso correto: `-sa {Tipo de Marcação} {ID da Sugestão} {Motivo}`.")
    .addField("**__Emojis__**", "+ Novos emojis:\n\nㅤ• <:fuck:523846163057737728> **(fuck)**\nㅤ• <:smidul:534147163303837707> **(smidul)**\nㅤ• <:update:593220375320723466> **(update)**\nㅤ• <:mememan:676120579044278272> **(mememan)**\n\n+ Novos emojis animados:\n\nㅤ• <a:pedreiro:565532910975713295> **(pedreiro)**\nㅤ• <a:jotaro:565677487422570496> **(jotaro)**")
	.addField("**__Geral__**", "+ O servidor agora tem licença de desenvolvedor, o que significa que agora pode ter canais de anúncios e de loja, para no futuro, poder ter jogos e coisas relacionadas, além de o servidor poder ser verificado no futuro.\n\n∗ O changelog foi totalmente atualizado.\n\nㅤ• Ele agora é escrito em embed, usando o <@618587791546384385>.\n\nㅤ• Todos os changelogs agora vão ter uma *Thumbnail*, que é essa imagem no começo do changelog.\n\nㅤ• Agora existem categorias nos changelogs, como uma categoria que fala sobre os chats, outra sobre os canais de voz, outra para as categorias de canais, outra para coisas gerais etc.\n\nㅤㅤ• As categorias são um *field*, o que significa que os changelogs agora suporta muitos mais caracteres, diminuindo a quantidade de mensagens separados para um changelog completo.\n\nㅤ• Agora os emojis no nome dos chats, categorias e canais de voz serão do próprio sistema, e não do Discord. Os emojis animados agora aparecem no changelog, em vez de ser só o nome.")
    .addField("ㅤ", "ㅤ• Toda atualização agora terá uma reação (<:update:593220375320723466>) no final.\n\nㅤㅤ• O <@204255221017214977> vai detectar quando alguém reagir com <:update:593220375320723466>, mas isso ainda não tem nenhuma função.\n\nㅤ• Agora a menção de atualização é a primeira mensagem do changelog, ao invés de ser a última.\n\nㅤ• As informações sobre a versão são o *footer* do embed.\n\nㅤ• O símbolo de mudança foi alterado de `*` para `∗`.\n\nㅤ• Os erros corrigidos agora são considerados mudanças, e não adições.\n\nㅤ• Cada tipo de atualização vai mencionar um cargo diferente e ter uma cor diferente na barra esquerda do changelog. Aqui está as explicações de cada tipo de atualização, qual cargo mencionam e que cor têm no changelog:\n\nㅤㅤ• **Live**:\n\nㅤㅤㅤ• Será anunciado no changelog a live do servidor que ocorrerá em algum site externo, depois que a live acontecer, será falado no changelog tudo anunciado na live.\n\nㅤㅤㅤ• Menciona o cargo <@&584460982726950912>.\n\nㅤㅤㅤ• Sua cor é **azul**.\n\nㅤㅤ• **Trailer**:")
    .addField("ㅤ", "ㅤㅤㅤ• Será anunciado no changelog o vídeo do trailer, mostrando algumas coisas que vão vir na próxima atualização.\n\nㅤㅤㅤ• Menciona o cargo <@&531265681459773440>.\n\nㅤㅤㅤ• Sua cor é **roxa**.\n\nㅤㅤ• **Snapshot**: \n\nㅤㅤㅤ• São as versões grandes, que são numeradas neste formato: **AAwSSn**\n\nㅤㅤㅤㅤ• `AA`: Ano em dois dígitos.\nㅤㅤㅤㅤ• `w`: Simplesmente *week*.\nㅤㅤㅤㅤ• `SS`: Semana do ano.\nㅤㅤㅤㅤ• `n`: Contagem de quantas snapshots em uma única semana, sendo `a` para a primeira, `b` para a segunda...\n\nㅤㅤㅤ• Menciona o cargo <@&531267169464483860>.\n\nㅤㅤㅤ• Sua cor é **vermelha**.\n\nㅤㅤ• **Pre-Release**: \n\nㅤㅤㅤ• São as versões de desenvolvimento finais pequenas, que são numeradas neste formato: **v Pre-Release x**\n\nㅤㅤㅤㅤ• `v` = Versão.\nㅤㅤㅤㅤ• `x` = Contagem de pre-releases.\n\nㅤㅤㅤ• Menciona o cargo <@&531267678564778006>.\n\nㅤㅤㅤ• Sua cor é **amarela**.")
    .setColor(65280);

    var e5 = new Discord.RichEmbed()
    .setDescription("ㅤㅤ• **Major Release**: \n\nㅤㅤㅤ• São as versões grandes, que são numeradas neste formato: **E.VV**.\n\nㅤㅤㅤㅤ• `E` = Era (Versão que redefine o servidor).\nㅤㅤㅤㅤ• `VV` = Versão.\n\nㅤㅤㅤ• Menciona o cargo <@&531267771162689546>.\n\nㅤㅤㅤ• Sua cor é **verde claro**.\n\nㅤㅤ• **Minor Release**: \n\nㅤㅤㅤ• São as versões pequenas, que são numeradas neste formato: **E.VV.R**.\n\nㅤㅤㅤㅤ• `E` = Era (Versão que redefine o servidor).\nㅤㅤㅤㅤ• `VV` = Versão.\nㅤㅤㅤㅤ• `R` = Revisão da versão.\n\nㅤㅤㅤ• Menciona o cargo <@&602143940321214475>.\n\nㅤㅤㅤ• Sua cor é **verde escuro**.\n\n∗ O sistema de níveis foi reformado:\n\nㅤ• Agora usa o <@485962834782453762> em vez do <@159985870458322944>.\n\nㅤ• Agora usa cargos elementais, sendo o <@&665396695588143127> o cargo de nível ganho após fazer o <#462669344841924618> e os outros cargos de **Água**, exceto os de **Fogo** e <@&619704555894210579>, sendo ganhos nos seus respectivos níveis.")
    .addField("ㅤ", "ㅤ• Agora a cada 2 minutos sua próxima mensagem pode dar de **1** à **10** de xp, e a cada 4 minutos num canal de voz (sem estar sozinho), você ganha de **1** à **10** de xp.\n\nㅤ• Só é possível ganhar xp nos seguintes canais:\n\nㅤㅤ• **Chats:**\n\nㅤㅤㅤ• <#420352281486163998>, <#462618031701622784> e <#514120331456151553>.\nㅤㅤㅤ• <#458742137635209236> e <#458742603454611476>.\nㅤㅤㅤ• <#461584830925242399>, <#599984028036366346>, <#521772002088845322>, <#461631159965581312>, <#534499299392749568> e <#521719438613938177>.\nㅤㅤㅤ• <#522436531617660929>.\n\nㅤㅤ• **Canais de voz:**\n\nㅤㅤㅤ• **\\💎 EXCLUSIVO \\💎**, **\\💠 GERAL MUSICAL \\💠**, **\\💠 GERAL 1 \\💠** e **\\💠 GERAL 2 \\💠**\nㅤㅤㅤ• **\\💣 JOGOS MUSICAL \\💣**, **\\💣 JOGOS 1 \\💣** e **\\💣 JOGOS 2 \\💣**.\n\nㅤ• Os comandos para ver o seu nível e a leaderboard do servidor agora são, respectivamente, \`\\level\` e \`\\leaderboard\`.\n\nㅤㅤ• Só é possível usá-los no chat <#422207224228872192>")
    .addField("ㅤ", "∗ Agora só tem como alterar o próprio apelido a partir do nível **15**.\n\n∗ O servidor foi renomeado de **Esquerdistas** para **Mowund** e o ícone foi alterado.\n\nㅤ• Esse não é o ícone final, mudanças ainda vão acontecer no ícone.\n\n∗ O símbolo `-` no nome do servidor foi alterado para `—`.\n\n∆ Todos os membros tiveram o nível resetado")
    .setFooter("Essa é a 1ª release da 1.17 e de 2020!")
    .setColor(65280);

    if(args[0] === 'release') {
        if(message.member.roles.has('420008165762138124')) {
            utils.mentionRole(message, '531267771162689546', channel);
            channel.send(e1).then(
                channel.send(e2).then(
                    channel.send(e3).then(
                        channel.send(e4).then(
                            channel.send(e5).then(sent => {
                                sent.react('update:593220375320723466');
          })))))
        } else {
            message.channel.send('Você precisa ter o cargo **Fundador** para poder lançar uma versão.')
        }
    } else if(args[0] === 'old') {
        /*utils.msgEdit(channel, '680794832071163938', e1);
        utils.msgEdit(channel, '680794833778245657', e2);
        utils.msgEdit(channel, '680794835388727296', e3);
        utils.msgEdit(channel, '680794837498462233', e4);*/
        utils.msgEdit(channel, '680794858725703683', e5);
        message.channel.send('Changelog editado.')
    } else {
        message.channel.send(e1).then(
            message.channel.send(e2).then(
                message.channel.send(e3).then(
                    message.channel.send(e4).then(
                        message.channel.send(e5).then(sent => {
                            sent.react('update:593220375320723466')
    })))))
    }
    
}

module.exports.help = {
  name:'update'
}
