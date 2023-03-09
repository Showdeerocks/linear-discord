import { Handler, serve } from "https://deno.land/std@0.178.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const port = 8080;
const webhook = Deno.env.get("DISCORD_WEBHOOK_URL");
// Array of [<field to scan Linear webhook for>, <label for that field in a Discord message>]. Ordered from top to bottom.
const labels = [
	['title', 'Title'],
	['description', 'Description'],
	['body', 'Body'],
	['priorityLabel', 'Priority'],
]

const handler: Handler = async (request: Request): Promise<Response> => {
  const message = await request.json();
	console.log('New request: ', JSON.stringify(message))

	const fields = []
	for(const [field, label] of labels)
		if(message.data[field]) fields.push({name: label, value: message.data[field], inline: false})

	let body;
  try {
    if (webhook) {
      body = await fetch(webhook, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          embeds: [{
							color: 6021786,
              title: `${message.type} ${message.action}d on ${message.data.team.name}'s Linear`,
              fields,
            }],
        }),
      }).then(res => res.text())
			.then(json => `Sent message! Discord responded with: ` + JSON.stringify(json));
		} else { throw new Error('Could not find webhook env var') }
  } catch (e) {
    console.error(e);
		return new Response(`Improperly formatted webhook request, ${e}`, { status: 400})
  }

  return new Response(body, { status: 200 });
};

console.log(`HTTP server running on port ${port}`);
await serve(handler, { port });
