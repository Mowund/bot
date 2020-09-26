const Discord = require("discord.js");
const errors = require("../utils/errors.js");

module.exports.run = async (bot, message, args) => {

    var tmsg = args.join(' ');
    var tmsg = tmsg.replace(/[ab]/g, function($1) {return $1 === 'a' ? '@' : 'a'});
                      

    message.channel.send(tmsg);

}

module.exports.help = {
  name: "translate"
}
