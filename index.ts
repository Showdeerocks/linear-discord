import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

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
  },
  unknowns: {
    user: '👤',
    team: '❔',
    default: '〰️'
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

    // Handle unknown team
    const teamName = message.data?.team?.name 
      ? `${message.data.team.name}`
      : `${EMOJIS.unknowns.team} Unknown Team`;

    // Handle unknown user
    const author = message.createdBy?.name 
      ? `${message.createdBy.name}`
      : `${EMOJIS.unknowns.user} Unknown User`;
    
    const authorAvatar = message.createdBy?.avatarUrl 
      ? message.createdBy.avatarUrl
      : `https://avatars.dicebear.com/api/identicon/${Date.now()}.svg`;

    // Build fields with enhanced handling
    const fields = [];
    for (const [field, label] of labels) {
      const fieldData = getFieldData(message.data, field);
      if (fieldData) {
        let formattedValue = fieldData.toString();

        // Special formatting for specific fields
        switch (field) {
          case 'priorityLabel':
            formattedValue = `${EMOJIS.priority[fieldData] || EMOJIS.priority.default} ${formattedValue}`;
            break;
          case 'state?.name':
            formattedValue = `${EMOJIS.status[fieldData] || EMOJIS.status.default} ${formattedValue}`;
            break;
          case 'assignee?.name':
            formattedValue = formattedValue === 'undefined' 
              ? `${EMOJIS.unknowns.user} Unassigned`
              : `👤 ${formattedValue}`;
            break;
          case 'project?.name':
            formattedValue = formattedValue === 'undefined'
              ? `${EMOJIS.unknowns.default} No Project`
              : `📂 ${formattedValue}`;
            break;
        }

        fields.push({
          name: label,
          value: formattedValue,
          inline: formattedValue.length <= 30
        });
      }
    }

    // Handle unknown action/type
    const actionPastTense = message.action ? `${message.action}d` : 'processed';
    const actionEmoji = message.action 
      ? EMOJIS.actions[message.action] || EMOJIS.actions.default
      : EMOJIS.unknowns.default;

    const embedTitle = message.type 
      ? `${actionEmoji} ${message.type} ${actionPastTense} in ${teamName}`
      : `${EMOJIS.unknowns.default} Unknown Activity in ${teamName}`;

    const discordPayload = {
      embeds: [{
        color: 0x5F6AD4,
        title: embedTitle,
        url: message.url || undefined,
        author: {
          name: author.startsWith(EMOJIS.unknowns.user) 
            ? `Triggered by ${author}` 
            : `👤 ${author}`,
          icon_url: authorAvatar
        },
        fields: fields.length > 0 ? fields : [{
          name: `${EMOJIS.unknowns.default} No Details`,
          value: "Could not retrieve issue information",
          inline: false
        }],
        timestamp: new Date().toISOString(),
        footer: {
          text: teamName.includes("Unknown") 
            ? "Unknown Team Activity" 
            : "Linear → Discord Webhook",
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
