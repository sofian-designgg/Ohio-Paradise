# ⚡ Ohio Paradise — Discord Bot

Bot Discord professionnel pour shop, avec système de tickets, exchange, paiements, reviews, orders, vouches et annonces.

## 🚀 Déploiement Railway

### Variables d'environnement à configurer sur Railway :
| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Token de ton bot Discord |
| `CLIENT_ID` | ID de l'application Discord |
| `GUILD_ID` | ID de ton serveur (pour deploy des slash commands) |
| `MONGO_URL` | Connexion MongoDB (ex: Atlas) |

### Étapes :
1. Push ce repo sur GitHub
2. Crée un nouveau projet sur Railway → "Deploy from GitHub repo"
3. Ajoute les variables d'environnement ci-dessus
4. Railway détecte automatiquement `railway.toml` et lance `node index.js`
5. Dans un terminal local, lance `node deploy-commands.js` pour enregistrer les slash commands

---

## 🖥️ Dashboard HTML (preview.html)

Ouvre `preview.html` dans ton navigateur pour :
- **Configurer** le panneau de tickets (boutons, couleurs, labels)
- **Simuler** les calculs d'exchange
- **Configurer** les fiches de paiement
- **Builder** des embeds avec prévisualisation
- **Consulter** toutes les commandes Discord à copier

Les configs sont sauvegardées en `localStorage`. Reporte les IDs dans Discord via les commandes `/config`.

---

## 📋 Commandes principales

### 🎫 Tickets
| Commande | Description |
|---|---|
| `/ticket-panel #channel` | Déploie le panneau de tickets |
| `/ticket-close [raison]` | Ferme le ticket actuel |
| `/ticket-add @user` | Ajoute un membre |
| `/ticket-remove @user` | Retire un membre |
| `/ticket-note [texte]` | Note interne staff |

### 💱 Exchange
| Commande | Description |
|---|---|
| `/exchange-calc [from] [to] [amount]` | Calcul avec taux réel CoinGecko |
| `/exchange-rates` | Affiche tous les taux |

### 💳 Paiements
| Commande | Description |
|---|---|
| `/payment-show [méthode]` | Affiche la fiche en embed |
| `/payment-show [méthode] user:@user` | Envoie en DM |

### 🎨 Embed Builder
| Commande | Description |
|---|---|
| `/embed-create #channel ...` | Crée un embed |
| `/embed-template list` | Liste les templates |
| `/embed-template delete [nom]` | Supprime un template |

### 📦 Orders
| Commande | Description |
|---|---|
| `/order-create @user [produit]` | Crée une commande |
| `/order-status [id] [statut]` | Met à jour le statut |
| `/order-history [@user]` | Historique des commandes |

### ⭐ Reviews & ✅ Vouches
| Commande | Description |
|---|---|
| `/review [stars] [comment]` | Laisser un avis |
| `/vouch @user [comment]` | Laisser un vouch |
| `/vouches [@user]` | Voir les vouches |

### 📣 Annonces
| Commande | Description |
|---|---|
| `/announce #channel [title] [desc]` | Annonce immédiate |
| `/announce #channel ... cron:"..."` | Annonce planifiée |

### ⚙️ Config
| Commande | Description |
|---|---|
| `/config set-log #channel` | Channel de logs |
| `/config set-staff-role @role` | Rôle staff |
| `/config set-ticket-category` | Catégorie tickets |
| `/config view` | Voir la config |

---

## 📁 Structure
```
ohio-paradise/
├── index.js              # Entry point
├── deploy-commands.js    # Deploy slash commands
├── preview.html          # Dashboard de configuration
├── railway.toml          # Config Railway
├── commands/
│   ├── ticket/
│   ├── exchange/
│   ├── payment/
│   ├── embed/
│   ├── order/
│   ├── review/
│   ├── vouch/
│   ├── announce/
│   └── config/
├── events/
│   ├── ready.js
│   └── interactionCreate.js
├── handlers/
│   └── ticketHandler.js
└── models/
    ├── GuildConfig.js
    ├── Ticket.js
    ├── Order.js
    ├── Review.js
    ├── Vouch.js
    └── Announcement.js
```
