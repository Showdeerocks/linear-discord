# Linear → Discord Webhook Integration

Sync Linear issue updates to a Discord channel via webhooks. Automatically post notifications when issues are created, updated, or resolved.

## Features
- Forward Linear issues/updates to Discord as embeds
- Customizable fields (title, description, assignee, priority, etc.)
- Error handling and logging
- Safe nested property access with optional chaining
- Fallback for missing data

## Prerequisites
- [Deno Runtime](https://deno.land/) (for local testing)
- [Deno Deploy](https://deno.com/deploy) account (for hosting)
- Linear workspace with admin permissions
- Discord server with webhook permissions

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-repo/linear-discord-webhook.git
cd linear-discord-webhook
```

### 2. Environment Setup
Create `.env` file:
```env
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

### 3. Deploy to Deno Deploy
1. Create new project at [Deno Deploy](https://dash.deno.com/new)
2. Paste contents of `index.ts`
3. Add environment variable:
   - Key: `DISCORD_WEBHOOK_URL`
   - Value: Your Discord webhook URL

## Configuration

### Linear Setup
1. Go to your Linear workspace settings
2. Navigate to **Integrations** → **Webhooks**
3. Create new webhook:
   - URL: `https://your-deno-deploy-project.deno.dev`
   - Triggers: Select desired events (Issues: Create/Update)

### Discord Setup
1. Right-click target channel → **Edit Channel**
2. Go to **Integrations** → **Webhooks**
3. Create new webhook or copy existing one

## Usage

### Supported Events
- Issue created
- Issue updated
- Issue resolved
- Issue reopened

### Message Structure
Discord embeds will show:
```yaml
Title: [Event Type] [Action] on [Team]'s Linear
Fields:
  - Title
  - Description
  - Priority
  - Assignee
  - Project
  - State
  - Body (if available)
```

## Troubleshooting

### Common Issues
**1. "Cannot send empty message" Error**
- Ensure at least one field contains data
- Check for typos in field paths (e.g., `assignee` vs `asignee`)
- Verify Linear payload contains expected data

**2. Webhook Not Triggering**
- Confirm Deno Deploy URL matches Linear webhook URL
- Check Deno Deploy logs for errors
- Verify Discord channel permissions

**3. Missing Fields**
- Update `labels` array in code to match your Linear schema
- Add optional chaining (`?.`) for nested properties

### Logging
Access logs through:
1. Deno Deploy dashboard → your project → "Logs" tab
2. Console.log statements in code:
   ```ts
   console.log("New request:", JSON.stringify(message, null, 2));
   console.log("Sending to Discord:", JSON.stringify(discordPayload, null, 2));
   ```

## Customization

### Modify Embed Appearance
Edit the embed object in `index.ts`:
```ts
embeds: [{
  color: 6021786, // Change hex color
  title: embedTitle,
  url: message.url,
  fields: fields,
  timestamp: new Date().toISOString() // Add timestamps
}]
```

### Add/Remove Fields
Update the `labels` array:
```ts
const labels = [
  ["newField.path", "Display Name"],
  // ...existing fields
];
```

## License
MIT License - See [LICENSE](LICENSE)
