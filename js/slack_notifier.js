// Module d'envoi de notifications Slack riches (Block Kit & Papayoubot)
class SlackNotifier {
  constructor() {
    this.storageKey = "mtg_slack_webhook_custom";
    this.customWebhook = localStorage.getItem(this.storageKey) || "";
  }

  setWebhookUrl(url) {
    this.customWebhook = url.trim();
    localStorage.setItem(this.storageKey, this.customWebhook);
    showToast("✓ Webhook Slack enregistré");
  }

  sendDraftRecord(record, draftDurationSec = 0) {
    const mins = Math.floor(draftDurationSec / 60);
    const secs = draftDurationSec % 60;
    const timeStr = `${mins}m ${String(secs).padStart(2, '0')}s`;

    // Citations Papayoubot humoristiques
    const papayouQuotes = [
      "« Cédric est en sueur devant un tel niveau de jeu. »",
      "« Un deck si propre qu'il mériterait d'être posé sur le tapis officiel de Tristan. »",
      "« Un chef-d'œuvre de tempo digne d'un triathlon olympique. »",
      "« Hugues tente encore de comprendre comment faire autant de value sans faire Turbo Rien. »",
      "« Même les dieux de Theros n'auraient pas osé une telle courbe de mana. »"
    ];
    const quote = papayouQuotes[Math.floor(Math.random() * papayouQuotes.length)];

    const payload = {
      text: `🏆 Nouveau Record de Draft de ${record.playerName} (${record.score}/100) sur ${record.cubeName} !`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🏆 NOUVEAU RECORD DE DRAFT — CUBE MASTERY ! 🎴",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `👤 *Drafter :* *${record.playerName}*\n🏆 *Cube :* *${record.cubeName}*\n🎨 *Archétype :* *${record.archetype}*\n⏱️ *Chrono :* *${timeStr}*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `⚡ *Score Global :*\n*${record.score}/100*`
            },
            {
              type: "mrkdwn",
              text: `👑 *Puissance Menaces :*\n*${record.scores.rawPower}/100*`
            },
            {
              type: "mrkdwn",
              text: `🧬 *Synergie Moteurs :*\n*${record.scores.synergy}/100*`
            },
            {
              type: "mrkdwn",
              text: `📈 *Courbe & Tempo :*\n*${record.scores.curve}/100*`
            },
            {
              type: "mrkdwn",
              text: `🏔️ *Stabilité Mana :*\n*${record.scores.mana}/100*`
            },
            {
              type: "mrkdwn",
              text: `⚔️ *Interaction :*\n*${record.scores.interaction}/100*`
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🧙‍♂️ *Papayoubot :* _${quote}_`
            }
          ]
        }
      ]
    };

    // Envoi via le relais backend /api/slack
    fetch("/api/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook_url: this.customWebhook || null,
        payload: payload
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast("📢 Notification envoyée sur Slack avec succès !");
      } else {
        showToast("⚠️ Envoi Slack impossible (vérifiez le webhook)");
      }
    })
    .catch(err => {
      // Si on tourne en pur fichier HTML local sans serveur python
      if (this.customWebhook) {
        fetch(this.customWebhook, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).then(() => showToast("📢 Notif Slack envoyée en direct !"))
          .catch(() => showToast("⚠️ Erreur réseau Slack"));
      } else {
        showToast("💡 Astuce : Lancez via 'python server.py' pour relayer sur Slack !");
      }
    });
  }
}

const slackNotifier = new SlackNotifier();
