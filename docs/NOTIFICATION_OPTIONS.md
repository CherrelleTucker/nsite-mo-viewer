# MO-Viewer Action Notifications

## Overview

When actions are assigned to team members, they can be notified through various channels. This document covers the available options.

---

## Option 1: Email Notifications (Implemented)

**Status:** Implemented, Optional

**How it works:**
- Uses Google Apps Script's `MailApp.sendEmail()`
- Sends from the script owner's Google account
- Checkbox in UI to enable/disable per assignment

**Limitations:**
- Requires script owner to have email sending permissions
- May not work with all Google Workspace configurations
- Emails can get lost in inbox clutter

**Configuration:** None required - uses script owner's account automatically.

---

## Option 2: Slack Bot Integration (Implemented)

**Status:** Implemented

**Features:**
1. **Assignment Notifications** - DM team members when actions assigned to them
2. **Mark Done** - Button in Slack DM to mark action complete
3. **Add Update** - Button in Slack DM to add notes to an action

### Slack App Setup Required

1. Create Slack App at https://api.slack.com/apps
2. Enable these features:
   - **Bot Token Scopes:** `chat:write`, `users:read`, `users:read.email`
   - **Slash Commands:** `/actions`
   - **Interactivity:** For button clicks (optional)

3. Install to workspace and get:
   - Bot User OAuth Token (`xoxb-...`)
   - Signing Secret (for verifying requests)

### MO-Viewer Configuration

Add to MO-DB_Config:

| Key | Value | Description |
|-----|-------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-...` | Bot User OAuth Token |
| `SLACK_SIGNING_SECRET` | `...` | For verifying Slack requests |

### Team Member Slack Mapping

Add `slack_user_id` column to MO-DB_Contacts for internal team members.

To find Slack User IDs:
1. In Slack, click on a user's profile
2. Click "More" → "Copy member ID"
3. Add to the contact's record

### How It Works

When an action is assigned (via MO-Viewer or when created):
1. Assignee receives a Slack DM with action details
2. DM includes three buttons:
   - **Mark Done** - Updates action status to "done"
   - **Add Update** - Opens modal to add a note
   - **View in MO-Viewer** - Opens the Actions page

The conversation with the bot becomes a running history of assigned actions.

---

## Option 3: Microsoft Teams (Future)

**Status:** Not Implemented

For organizations using Microsoft Teams instead of Slack, a similar integration could be built using:
- Microsoft Graph API
- Teams Incoming Webhooks
- Power Automate flows

---

## Option 4: In-App Notifications (Future)

**Status:** Not Implemented

A "My Actions" dashboard showing:
- Actions assigned to you
- Recently updated actions
- Overdue items

Would require user authentication to know who is viewing.

---

## Recommendation

For NSITE MO team: **Slack integration** is recommended because:
- Team already uses Slack
- Real-time notifications
- Can interact without leaving Slack
- Bot can provide quick status updates

---

## Implementation Notes

### Slack API Calls from Apps Script

Google Apps Script can call Slack's API using `UrlFetchApp`:

```javascript
function sendSlackDM(slackUserId, message) {
  var token = getConfigValue('SLACK_BOT_TOKEN');

  var payload = {
    channel: slackUserId,  // DM by user ID
    text: message,
    unfurl_links: false
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
  return JSON.parse(response.getContentText());
}
```

### Slash Command Webhook

For `/actions` command, Slack sends a POST request to a URL you specify.

Options for receiving this in Apps Script:
1. **Web App endpoint** - Deploy as web app with `doPost(e)` handler
2. **Separate Cloud Function** - If more control needed

---

*Last Updated: 2026-01-22*
