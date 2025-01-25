import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

const EMOJIS = {
  types: {
    Issue: '📌',
    Comment: '💬',
    Reaction: '🎯',
    default: '🔔'
  },
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

const handler: Handler = async (request: Request): Promise<Response> => {
  try {
    const message = await request.json();
    console.log("New request:", JSON.stringify(message, null, 2));

    // Get event type and action
    const eventType = message.type || 'Unknown';
    const action = message.action || 'create';

    // Get user information from multiple possible locations
    const getUserInfo = () => {
      return {
        name: message.createdBy?.name || 
              message.user?.name || 
              message.actor?.name || 
              "Unknown User",
        avatar: message.createdBy?.avatarUrl || 
                message.user?.avatarUrl || 
                message.actor?.avatarUrl || 
                "https://cdn.linearicons.com/free/110/linear-logo.png"
      };
    };

    // Get team name from multiple possible locations
    const getTeamInfo = () => {
      return message.data?.team?.name || 
             message.data?.issue?.team?.name || 
             message.data?.project?.team?.name || 
             "Unknown Team";
    };

    // Build dynamic fields based on event type
    const buildFields = () => {
      const fields = [];
      const baseData = message.data || {};

      // Common fields
      if (baseData.title) fields.push({ name: '📝 Title', value: baseData.title });
      if (baseData.body) fields.push({ name: '📄 Body', value: baseData.body });

      // Reaction-specific fields
      if (eventType === 'Reaction') {
        fields.push(
          { name: '🎯 Emoji', value: baseData.emoji || 'Unknown', inline: true },
          { name: '📌 Parent', value: `[${baseData.parent?.title}](${baseData.parent?.url})` || 'Unknown', inline: true }
        );
      }

      // Comment-specific fields
      if (eventType === 'Comment') {
        fields.push(
          { name: '📌 Issue', value: `[${baseData.issue?.title}](${baseData.issue?.url})` || 'Unknown' }
        );
      }

      // Issue-specific fields
      if (eventType === 'Issue') {
        if (baseData.priorityLabel) {
          fields.push({
            name: '🚩 Priority',
            value: `${EMOJIS.priority[baseData.priorityLabel] || EMOJIS.priority.default} ${baseData.priorityLabel}`,
            inline: true
          });
        }
        if (baseData.state?.name) {
          fields.push({
            name: '🔄 State',
            value: `${EMOJIS.status[baseData.state.name] || EMOJIS.status.default} ${baseData.state.name}`,
            inline: true
          });
        }
        if (baseData.assignee?.name) {
          fields.push({ name: '👤 Assignee', value: baseData.assignee.name, inline: true });
        }
      }

      return fields.length > 0 ? fields : [{
        name: 'ℹ️ Details',
        value: 'No additional information available'
      }];
    };

    // Build the embed title
    const { name: userName, avatar: userAvatar } = getUserInfo();
    const teamName = getTeamInfo();
    const typeEmoji = EMOJIS.types[eventType] || EMOJIS.types.default;
    const actionEmoji = EMOJIS.actions[action] || EMOJIS.actions.default;

    const embedTitle = `${typeEmoji} ${eventType} ${action}d in ${teamName}`;

    // Construct Discord payload
    const discordPayload = {
      embeds: [{
        color: 0x5F6AD4,
        title: embedTitle,
        url: message.url || message.data?.url,
        author: {
          name: `Triggered by ${userName}`,
          icon_url: userAvatar
        },
        fields: buildFields(),
        timestamp: new Date().toISOString(),
        footer: {
          text: `Linear • ${teamName}`,
          icon_url: "https://cdn.linearicons.com/free/110/linear-logo.png"
        }
      }]
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
