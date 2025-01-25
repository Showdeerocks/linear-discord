import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = parseInt(Deno.env.get("PORT") || "8080");
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

const labels = [
  ["identifier", "Issue ID"],
  ["title", "Title"],
  ["description", "Description"],
  ["priorityLabel", "Priority"],
  ["state?.name", "State"],
  ["assignee?.name", "Assignee"],
  ["labels", "Labels"],
  ["comment?.body", "Comment"],
];

const priorityColors: Record<string, number> = {
  "Urgent": 0xFF0000,
  "High": 0xFFA500,
  "Medium": 0xFFFF00,
  "Low": 0x00FF00,
};

const actionPastTense: Record<string, string> = {
  "create": "created",
  "update": "updated",
  "delete": "deleted",
  "comment": "commented",
};

function getFieldData(obj: any, path: string): any {
  return path.split(/\.?\?\./g).reduce((acc, part) => acc?.[part], obj);
}

function formatFieldValue(data: any): string {
  if (Array.isArray(data)) return data.map((item) => item.name || item).join(", ");
  if (data && typeof data === "object") return JSON.stringify(data).substring(0, 1000);
  return data?.toString() || "";
}

const handler: Handler = async (request: Request): Promise<Response> => {
  try {
    const message = await request.json();
    
    const fields = [];
    for (const [field, label] of labels) {
      const fieldData = getFieldData(message.data, field);
      if (fieldData) {
        fields.push({
          name: label,
          value: formatFieldValue(fieldData).substring(0, 1024),
          inline: !["Description", "Comment", "Labels"].includes(label),
        });
      }
    }

    if (fields.length === 0) {
      fields.push({
        name: "Details",
        value: "No additional information available.",
        inline: false,
      });
    }

    const priority = getFieldData(message.data, "priorityLabel");
    const color = priorityColors[priority] || 0x5BE0DA;
    const action = actionPastTense[message.action] || `${message.action}d`;
    const teamName = getFieldData(message.data, "team?.name") || "Unknown Team";

    const discordPayload = {
      embeds: [{
        color: color,
        title: `${message.type} ${action} on ${teamName}'s Linear`,
        url: message.url,
        fields: fields,
      }],
    };

    if (!webhook) throw new Error("DISCORD_WEBHOOK_URL not set");
    
    const discordResponse = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload),
    });

    const responseBody = await discordResponse.text();
    return new Response(`Discord response: ${responseBody}`, { status: 200 });

  } catch (e) {
    console.error(e);
    return new Response(`Error: ${e.message}`, { status: 400 });
  }
};

await serve(handler, { port });
