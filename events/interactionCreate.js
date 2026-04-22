const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { handleTicketOpen, handleTicketClaim, handleTicketCloseConfirm, handleTicketCloseDirect } = require('../handlers/ticketHandler');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Command Error] ${interaction.commandName}:`, err);
        const msg = { content: '❌ Une erreur est survenue.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id.startsWith('ticket_open_')) {
        const buttonId = id.replace('ticket_open_', '');
        return handleTicketOpen(interaction, buttonId);
      }

      if (id.startsWith('ticket_claim_')) {
        const ticketId = id.replace('ticket_claim_', '');
        return handleTicketClaim(interaction, ticketId);
      }

      if (id.startsWith('ticket_close_direct_')) {
        const ticketId = id.replace('ticket_close_direct_', '');
        return handleTicketCloseDirect(interaction, ticketId);
      }

      if (id.startsWith('ticket_confirm_close_')) {
        const ticketId = id.replace('ticket_confirm_close_', '');
        return handleTicketCloseConfirm(interaction, ticketId);
      }

      if (id.startsWith('ticket_cancel_close_')) {
        await interaction.deferUpdate();
        await interaction.message.delete().catch(() => {});
        return;
      }

      if (id.startsWith('embed_send_')) {
        const channelId = id.replace('embed_send_', '');
        const pending = client._pendingEmbeds?.get(interaction.user.id);
        if (!pending) return interaction.reply({ content: '❌ Session expirée.', ephemeral: true });

        const targetChannel = interaction.guild.channels.cache.get(channelId);
        if (!targetChannel) return interaction.reply({ content: '❌ Channel introuvable.', ephemeral: true });

        const { EmbedBuilder: EB } = require('discord.js');
        const color = pending.embedData.color?.startsWith('#')
          ? parseInt(pending.embedData.color.replace('#', ''), 16) : 0x5865F2;

        const embed = new EB().setColor(color);
        if (pending.embedData.title) embed.setTitle(pending.embedData.title);
        if (pending.embedData.description) embed.setDescription(pending.embedData.description);
        if (pending.embedData.footer) embed.setFooter({ text: pending.embedData.footer });
        if (pending.embedData.thumbnailUrl) embed.setThumbnail(pending.embedData.thumbnailUrl);
        if (pending.embedData.imageUrl) embed.setImage(pending.embedData.imageUrl);

        await targetChannel.send({ embeds: [embed] });
        client._pendingEmbeds.delete(interaction.user.id);
        await interaction.update({ content: `✅ Embed envoyé dans <#${channelId}>`, embeds: [], components: [] });
        return;
      }

      if (id === 'embed_save_template') {
        const pending = client._pendingEmbeds?.get(interaction.user.id);
        if (!pending) return interaction.reply({ content: '❌ Session expirée.', ephemeral: true });

        const modal = new ModalBuilder()
          .setCustomId('embed_save_template_modal')
          .setTitle('Sauvegarder le template');

        const nameInput = new TextInputBuilder()
          .setCustomId('template_name')
          .setLabel('Nom du template')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        return interaction.showModal(modal);
      }

      if (id === 'embed_cancel') {
        client._pendingEmbeds?.delete(interaction.user.id);
        return interaction.update({ content: '❌ Annulé.', embeds: [], components: [] });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'embed_save_template_modal') {
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.fields.getTextInputValue('template_name');
        const pending = client._pendingEmbeds?.get(interaction.user.id);
        if (!pending) return interaction.editReply({ content: '❌ Session expirée.' });

        let config = await GuildConfig.findOne({ guildId: interaction.guildId });
        if (!config) config = new GuildConfig({ guildId: interaction.guildId });

        const existing = config.embedTemplates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
        const templateData = { id: Date.now().toString(), name, embed: pending.embedData };

        if (existing !== -1) {
          config.embedTemplates[existing] = templateData;
        } else {
          config.embedTemplates.push(templateData);
        }

        await config.save();
        return interaction.editReply({ content: `✅ Template **${name}** sauvegardé !` });
      }
    }
  },
};
