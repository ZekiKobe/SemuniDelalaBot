/** Telegram slash-command menu ('Menu'button left of the input). Descriptions are localized. */
const COMMANDS_BY_LANG = {
  en: [
    { command: 'start', description: 'Welcome & get started' },
    { command: 'menu', description: 'Open main menu' },
    { command: 'browse', description: 'Browse listings' },
    { command: 'search', description: 'Search by area' },
    { command: 'post', description: 'Post property or product' },
    { command: 'mylistings', description: 'My listings' },
    { command: 'help', description: 'Help & support' },
    { command: 'cancel', description: 'Cancel current action' },
  ],
  am: [
    { command: 'start', description: 'እንኳን ደህና መጡ' },
    { command: 'menu', description: 'ዋና menu ክፈት' },
    { command: 'browse', description: 'ልጥፎችን ይመልከቱ' },
    { command: 'search', description: 'በአካባቢ ይፈልጉ' },
    { command: 'post', description: 'ንብረት ወይም ዕቃ ይለጥፉ' },
    { command: 'mylistings', description: 'የእኔ ልጥፎች' },
    { command: 'help', description: 'እርዳታ' },
    { command: 'cancel', description: 'ሂደቱን ይቋርጡ' },
  ],
  or: [
    { command: 'start', description: 'Baga nagaan dhufte' },
    { command: 'menu', description: 'Menu guddaa bani' },
    { command: 'browse', description: 'Maxxansota ilaali' },
    { command: 'search', description: 'Bakkaan barbaadi' },
    { command: 'post', description: 'Qabeenya ykn meeshaa maxxansi' },
    { command: 'mylistings', description: 'Maxxansota koo' },
    { command: 'help', description: 'Gargaarsa' },
    { command: 'cancel', description: 'Hojii haqii' },
  ],
};

async function registerBotCommandMenu(bot) {
  for (const [code, commands] of Object.entries(COMMANDS_BY_LANG)) {
    try {
      const languageCode = code === 'or' ? 'om' : code;
      if (code === 'en') {
        await bot.setMyCommands(commands);
      } else {
        await bot.setMyCommands(commands, { language_code: languageCode });
      }
    } catch {
      // Some language codes may not be supported on all clients
    }
  }

  try {
    await bot.setChatMenuButton({ menu_button: { type: 'commands' } });
  } catch {
    await bot.setChatMenuButton(null, { type: 'commands' }).catch(() => {});
  }
}

module.exports = { registerBotCommandMenu, COMMANDS_BY_LANG };
