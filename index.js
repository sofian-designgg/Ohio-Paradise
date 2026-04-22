require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const deployCommands = async (commands) => {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
    console.warn('[Deploy] Missing DISCORD_TOKEN / CLIENT_ID / GUILD_ID — skipping command deploy.');
    return;
  }
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`[Deploy] Deploying ${commands.length} slash commands...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('[Deploy] Slash commands deployed successfully.');
  } catch (err) {
    console.error('[Deploy] Error deploying commands:', err);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.commands = new Collection();
client.cooldowns = new Collection();

const loadCommands = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if (command?.data?.name) {
        client.commands.set(command.data.name, command);
      }
    }
  }
};

const commandsPath = path.join(__dirname, 'commands');
const commandsJSON = [];
if (fs.existsSync(commandsPath)) loadCommands(commandsPath);
client.commands.forEach(cmd => { if (cmd.data?.toJSON) commandsJSON.push(cmd.data.toJSON()); });

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('[MongoDB] Connected'))
  .catch(err => console.error('[MongoDB] Connection error:', err));

deployCommands(commandsJSON).then(() => {
  client.login(process.env.DISCORD_TOKEN);
});
