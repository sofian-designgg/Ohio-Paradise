require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

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

const startApiServer = () => {
  const app = express();
  const API_SECRET = process.env.DASHBOARD_SECRET || 'ohio-secret';
  const PORT = process.env.PORT || 3000;

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  }));
  app.options('*', cors());
  app.use(express.json());

  const auth = (req, res, next) => {
    const token = req.headers['x-api-key'] || req.query.key;
    if (token !== API_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    next();
  };

  app.get('/api/health', (req, res) => res.json({ status: 'ok', bot: client.user?.tag || 'not ready' }));

  app.post('/api/send-embed', auth, async (req, res) => {
    try {
      const { channelId, embed: embedData } = req.body;
      if (!channelId || !embedData) return res.status(400).json({ error: 'channelId and embed required' });
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const color = embedData.color
        ? parseInt(String(embedData.color).replace('#', ''), 16)
        : 0x5865F2;

      const embed = new EmbedBuilder().setColor(color);
      if (embedData.title) embed.setTitle(embedData.title);
      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.footer) embed.setFooter({ text: embedData.footer });
      if (embedData.thumbnailUrl) embed.setThumbnail(embedData.thumbnailUrl);
      if (embedData.imageUrl) embed.setImage(embedData.imageUrl);
      if (embedData.timestamp) embed.setTimestamp();
      if (Array.isArray(embedData.fields)) {
        embedData.fields.forEach(f => embed.addFields({ name: f.name, value: f.value, inline: !!f.inline }));
      }

      const content = embedData.content || null;
      const msg = await channel.send({ content, embeds: [embed] });
      return res.json({ success: true, messageId: msg.id, channelId });
    } catch (err) {
      console.error('[API] send-embed error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/channels', auth, async (req, res) => {
    try {
      const guildId = process.env.GUILD_ID;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });
      const channels = guild.channels.cache
        .filter(c => c.isTextBased())
        .map(c => ({ id: c.id, name: c.name, parentName: c.parent?.name || null }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return res.json(channels);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/stats', auth, async (req, res) => {
    try {
      const Ticket = require('./models/Ticket');
      const Order = require('./models/Order');
      const Review = require('./models/Review');
      const Vouch = require('./models/Vouch');
      const GuildConfig = require('./models/GuildConfig');
      const guildId = process.env.GUILD_ID;
      const [tickets, orders, reviews, vouches, config] = await Promise.all([
        Ticket.countDocuments({ guildId, status: { $in: ['open', 'claimed'] } }),
        Order.countDocuments({ guildId, status: { $in: ['pending', 'processing'] } }),
        Review.countDocuments({ guildId }),
        Vouch.countDocuments({ guildId }),
        GuildConfig.findOne({ guildId }),
      ]);
      return res.json({
        tickets, orders, reviews, vouches,
        paymentMethods: config?.paymentMethods?.length || 0,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => console.log(`[API] Dashboard API running on port ${PORT}`));
};

deployCommands(commandsJSON).then(() => {
  mongoose.connect(process.env.MONGO_URL)
    .then(() => {
      console.log('[MongoDB] Connected');
      return client.login(process.env.DISCORD_TOKEN);
    })
    .then(() => {
      startApiServer();
    })
    .catch(err => console.error('[MongoDB] Connection error:', err));
});
