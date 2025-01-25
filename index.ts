import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");

const labels = [
  ["title", "Title"],
  ["description", "Description"],
  ["body", "Body"],
  ["priorityLabel", "Priority"],
  ["assignee?.name", "Assignee"], // Corrected typo
  ["project?.name", "Project"],
  ["state?.name", "State"],
];

// Safely access nested properties
function getFieldData(obj: any, path: string): any {
  return path.split('?.')
    .reduce((acc, part) => acc?.[part], obj);
}

const handler: Handler = async (request: Request): Promise<Response> => {
  try {
    const message = await request.json();
    console.log("New request:", JSON.stringify(message, null, 2));

    const fields = [];
    for (const [field, label] of labels) {
      const fieldData = getFieldData(message.data, field);
      if (fieldData) {
        fields.push({
          name: label,
          value: fieldData.toString(),
          inline: fieldData.toString().length <= 50,
        });
      }
    }

    // Ensure fields is not empty
    if (fields.length === 0) {
      fields.push({
        name: "Details",
        value: "No additional information available.",
        inline: false,
      });
    }

    const teamName = message.data?.team?.name || "Unknown Team";
    const actionPastTense = message.action ? `${message.action}d` : "processed";
    const embedTitle = `${message.type} ${actionPastTense} on ${teamName}'s Linear`;

    const discordPayload = {
      embeds: [{
        color: 6021786,
        title: embedTitle,
        url: message.url,
        fields: fields,
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
