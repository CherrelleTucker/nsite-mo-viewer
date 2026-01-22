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

1. Create Slack App at https://api.slack.com/apps (use `deploy/slack-app-manifest.yaml`)
2. Enable these features:
   - **Bot Token Scopes:** `chat:write`, `users:read`, `users:read.email`
   - **Interactivity:** Point to MO-Slack-Bot web app URL

3. Install to workspace and get:
   - Bot User OAuth Token (`xoxb-...`)

### MO-Viewer Configuration

Add to MO-DB_Config:

| Key | Value | Description |
|-----|-------|-------------|
| `SLACK_BOT_TOKEN` | `xoxb-...` | Bot User OAuth Token |
| `APP_URL` | `https://script.google.com/.../exec?page=actions` | Link in Slack messages |

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

## Why Slack Over Email?

**For NSITE MO team, Slack was chosen as the primary notification method.**

### Advantages of Slack

| Factor | Slack | Email |
|--------|-------|-------|
| **Visibility** | DMs appear in sidebar, hard to miss | Can get buried in inbox |
| **Actionable** | Buttons to Mark Done/Add Update directly | Must open MO-Viewer to take action |
| **History** | Bot conversation = running task list | Scattered across inbox |
| **Real-time** | Instant delivery | May be delayed by filters/batching |
| **Team fit** | NSITE team already uses Slack daily | Mixed email providers |

### Limitations of Email in Apps Script

- Requires script owner to have `MailApp` permissions
- Some Google Workspace configs block automated emails
- No way to embed interactive buttons
- Sender appears as script owner, not "MO-Viewer Bot"

### For Other Organizations

Choose based on your team's communication patterns:

| If your team uses... | Recommended option |
|---------------------|-------------------|
| Slack | Slack integration (implemented) |
| Microsoft Teams | Teams integration (not yet built) |
| Email primarily | Email notifications (implemented, basic) |
| Mixed/Unknown | Start with email, add Slack if needed |

**Note:** The system tries Slack first, falls back to email if Slack user ID not configured.

---

## Implementation Notes

### Architecture

```
MO-Viewer (NSITE-MO-Viewer project)
    │
    ├── Creates/assigns action
    │
    └── Calls MoApi.assignAction() or MoApi.createAction()
            │
            ├── Looks up Slack user ID from MO-DB_Contacts
            │
            └── Sends DM via Slack API
                    │
                    └── User clicks button in Slack
                            │
                            └── MO-Slack-Bot (separate project, "Anyone" access)
                                    │
                                    └── Calls MoApi to update action
```

### Why Two Apps Script Projects?

The Slack bot requires "Anyone" web app access (no Google authentication) so Slack's servers can POST to it. The main MO-Viewer project uses "Anyone with Google account" for security.

### Key Files

| File | Purpose |
|------|---------|
| `library/actions-api.gs` | Slack notification functions, token lookup |
| `deploy/slack-bot.gs` | Handles Slack button clicks, modal submissions |
| `deploy/slack-app-manifest.yaml` | Slack app configuration |

---

*Last Updated: 2026-01-22*
