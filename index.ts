import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

// Emoji configuration
const EMOJIS = {
  actions: {
    create: '🆕',
    update: '✏️',
    delete: '🗑️',
    default: '🔔'
  },
  priority: {
    Urgent: '🚨',
    High: '🔴',
    Medium: '🟡',
    Low: '🟢',
    default: '⚪'
  },
  status: {
    Done: '✅',
    Canceled: '🚫',
    InProgress: '🚧',
    Review: '👀',
    default: '📋'
  }
};

const labels = [
  ["title", "📝 Title"],
  ["description", "📄 Description"],
  ["body", "📋 Body"],
  ["priorityLabel", "🚩 Priority"],
  ["assignee?.name", "👤 Assignee"],
  ["project?.name", "📂 Project"],
  ["state?.name", "🔄 State"],
];

function getFieldData(obj: any, path: string): any {
  return path.split('?.')
    .reduce((acc, part) => acc?.[part], obj);
}

const handler: Handler = async (request: Request): Promise<Response> => {
  try {
    const message = await request.json();
    console.log("New request:", JSON.stringify(message, null, 2));

    // Build fields with emojis
    const fields = [];
    for (const [field, label] of labels) {
      const fieldData = getFieldData(message.data, field);
      if (fieldData) {
        let formattedValue = fieldData.toString();
        
        // Add emojis for specific fields
        if (field === 'priorityLabel') {
          formattedValue = `${EMOJIS.priority[fieldData] || EMOJIS.priority.default} ${formattedValue}`;
        }
        if (field === 'state?.name') {
          formattedValue = `${EMOJIS.status[fieldData] || EMOJIS.status.default} ${formattedValue}`;
        }

        fields.push({
          name: label,
          value: formattedValue,
          inline: formattedValue.length <= 30
        });
      }
    }

    // Build main title with action emoji
    const actionEmoji = EMOJIS.actions[message.action] || EMOJIS.actions.default;
    const teamName = message.data?.team?.name || "Unknown Team";
    const embedTitle = `${actionEmoji} ${message.type} ${message.action}d in ${teamName}`;

    // Build author information
    const author = message.createdBy?.name || "Unknown User";
    const authorAvatar = message.createdBy?.avatarUrl || "https://cdn.linearicons.com/free/110/linear-logo.png";

    const discordPayload = {
      embeds: [{
        color: 0x5F6AD4, // Linear's brand color
        title: embedTitle,
        url: message.url,
        author: {
          name: `Triggered by ${author}`,
          icon_url: authorAvatar
        },
        fields: fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: "Linear → Discord Webhook",
          icon_url: "https://cdn.linearicons.com/free/110/linear-logo.png"
        }
      }],
    };

    console.log("Sending to Discord:", JSON.stringify(discordPayload, null, 2));

    if (!webhook) throw new Error("DISCORD_WEBHOOK_URL is not set.");

    const discordResponse = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    const responseBody = await discordResponse.text();
    if (!discordResponse.ok) {
      throw new Error(`Discord error: ${responseBody}`);
    }

    return new Response(`Message sent to Discord: ${responseBody}`, { status: 200 });

  } catch (e) {
    console.error("Error handling request:", e);
    return new Response(`Error: ${e.message}`, { status: 400 });
  }
};

console.log(`HTTP server running on port ${port}`);
await serve(handler, { port });
