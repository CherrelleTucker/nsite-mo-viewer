/**
 * MO-Viewer Slack Bot
 * ===================
 * Handles interactive components for action management (button clicks, modals).
 *
 * Setup:
 * 1. Create Slack App at https://api.slack.com/apps
 * 2. Add Bot Token Scopes: chat:write, users:read, users:read.email
 * 3. Enable Interactivity and point to this web app URL
 * 4. Add SLACK_BOT_TOKEN to MO-DB_Config
 * 5. Add slack_user_id column to MO-DB_Contacts for team members
 */

// Cache token in script properties for fast access
var TOKEN_CACHE_KEY = 'SLACK_BOT_TOKEN_CACHE';

/**
 * Get cached Slack token (fast) or fetch from config (slow, then cache)
 */
function getCachedToken_() {
  var cache = CacheService.getScriptCache();
  var token = cache.get(TOKEN_CACHE_KEY);

  if (!token) {
    // Fetch from config and cache for 6 hours
    token = MoApi.getConfigValue('SLACK_BOT_TOKEN');
    if (token) {
      cache.put(TOKEN_CACHE_KEY, token, 21600); // 6 hours
    }
  }

  return token;
}

/**
 * Handle POST requests from Slack (interactive components only)
 */
function doPost(e) {
  try {
    var params = e.parameter;

    // Handle interactive component (button clicks, modal submissions)
    if (params.payload) {
      var payload = JSON.parse(params.payload);
      return handleInteraction(payload);
    }

    // Unknown request type
    return ContentService.createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    Logger.log('doPost error: ' + error);
    return ContentService.createTextOutput('Error: ' + error.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Handle interactive components (button clicks, modal submissions)
 */
function handleInteraction(payload) {
  var type = payload.type;

  // Handle modal submission
  if (type === 'view_submission') {
    return handleModalSubmission(payload);
  }

  // Handle button clicks
  var action = payload.actions ? payload.actions[0] : null;
  if (!action) {
    return ContentService.createTextOutput(JSON.stringify({ text: 'No action found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var actionId = action.action_id;
  var value = action.value;
  var userId = payload.user ? payload.user.id : null;
  var triggerId = payload.trigger_id;

  Logger.log('Interaction: ' + actionId + ' value=' + value + ' from user ' + userId);

  if (actionId === 'action_done') {
    return handleMarkDone(payload, value, userId);
  }

  if (actionId === 'add_update') {
    return openUpdateModal(triggerId, value);
  }

  return ContentService.createTextOutput(JSON.stringify({ text: 'Action processed' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle "Mark Done" button click
 * Sends immediate "working" message, then updates and sends final result
 */
function handleMarkDone(payload, actionItemId, userId) {
  var responseUrl = payload.response_url;

  // Send immediate "working" message via response_url
  postToResponseUrl(responseUrl, {
    replace_original: true,
    text: ':hourglass: Updating...'
  });

  // Do the actual database update
  var result = markActionDoneInternal(actionItemId);

  // Build the final updated message
  var updatedBlocks = payload.message.blocks.map(function(block) {
    if (block.type === 'actions') {
      return {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: result.success
            ? ':white_check_mark: *Marked as done* by <@' + userId + '>'
            : ':x: *Failed to update* - please try again'
        }]
      };
    }
    return block;
  });

  // Send final result via response_url
  postToResponseUrl(responseUrl, {
    replace_original: true,
    blocks: updatedBlocks
  });

  // Return empty - we've already communicated via response_url
  return ContentService.createTextOutput(JSON.stringify({}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Post a message to Slack's response_url
 */
function postToResponseUrl(responseUrl, message) {
  if (!responseUrl) return;

  try {
    UrlFetchApp.fetch(responseUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Error posting to response_url: ' + e);
  }
}

/**
 * Open modal for adding an update to an action
 * Must be fast - trigger_id expires in 3 seconds
 */
function openUpdateModal(triggerId, actionItemId) {
  // Get token from cache first, fall back to config
  var token = getCachedToken_();

  var modal = {
    type: 'modal',
    callback_id: 'update_modal',
    private_metadata: actionItemId,
    title: {
      type: 'plain_text',
      text: 'Add Update'
    },
    submit: {
      type: 'plain_text',
      text: 'Submit'
    },
    close: {
      type: 'plain_text',
      text: 'Cancel'
    },
    blocks: [
      {
        type: 'input',
        block_id: 'update_input',
        element: {
          type: 'plain_text_input',
          action_id: 'update_text',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Enter your update or note about this action...'
          }
        },
        label: {
          type: 'plain_text',
          text: 'Update'
        }
      }
    ]
  };

  // Open the modal via Slack API
  var response = UrlFetchApp.fetch('https://slack.com/api/views.open', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({
      trigger_id: triggerId,
      view: modal
    }),
    muteHttpExceptions: true
  });

  var result = JSON.parse(response.getContentText());
  if (!result.ok) {
    Logger.log('Error opening modal: ' + result.error);
  }

  // Return empty response for the button click
  return ContentService.createTextOutput(JSON.stringify({}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle modal submission
 * Sends immediate "saving" message, does work, then confirms
 */
function handleModalSubmission(payload) {
  var callbackId = payload.view.callback_id;

  if (callbackId === 'update_modal') {
    var actionItemId = payload.view.private_metadata;
    var updateText = payload.view.state.values.update_input.update_text.value;
    var userId = payload.user.id;

    // Send immediate "saving" message to user
    sendQuickMessage(userId, ':hourglass: Saving your update...');

    // Add the update to the action's notes (uses fast appendToActionNotes)
    var result = addUpdateToAction(actionItemId, updateText, userId);

    // Send confirmation or error message
    if (result.success) {
      sendConfirmationMessage(userId, actionItemId, updateText);
    } else {
      sendQuickMessage(userId, ':x: Failed to save update. Please try again.');
    }

    // Close the modal (empty response)
    return ContentService.createTextOutput(JSON.stringify({}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Send a quick message to a user
 */
function sendQuickMessage(slackUserId, text) {
  var token = getCachedToken_();

  UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify({ channel: slackUserId, text: text }),
    muteHttpExceptions: true
  });
}

/**
 * Add an update to an action's notes field (optimized - no full action read)
 */
function addUpdateToAction(actionItemId, updateText, slackUserId) {
  try {
    // Get the user's name
    var userName = getTeamMemberNameBySlackId(slackUserId) || 'Unknown';
    var timestamp = new Date().toLocaleString();

    // Format the note
    var newNote = '[' + timestamp + ' - ' + userName + ' via Slack] ' + updateText;

    // Append directly to notes (fast - doesn't read all actions)
    var success = MoApi.appendToActionNotes(actionItemId, newNote);

    return { success: success, message: success ? 'Updated' : 'Update failed' };
  } catch (e) {
    Logger.log('Error adding update to action: ' + e);
    return { success: false, message: e.message };
  }
}

/**
 * Send confirmation message after update is added
 */
function sendConfirmationMessage(slackUserId, actionItemId, updateText) {
  var token = getCachedToken_();

  var message = {
    channel: slackUserId,
    text: ':memo: Update added to `' + actionItemId + '`:\n> ' + updateText.substring(0, 100) + (updateText.length > 100 ? '...' : '')
  };

  UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(message),
    muteHttpExceptions: true
  });
}

/**
 * Internal function to mark action done
 */
function markActionDoneInternal(actionId) {
  try {
    var success = MoApi.updateActionStatus(actionId, 'done');
    return { success: success, message: success ? 'Updated' : 'Update failed' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Get team member name by Slack user ID
 */
function getTeamMemberNameBySlackId(slackUserId) {
  try {
    var contacts = MoApi.getAllContacts();
    var contact = contacts.find(function(c) {
      var isInternal = c.is_internal === 'Y' ||
                       c.is_internal === 'true' ||
                       c.is_internal === '1' ||
                       c.is_internal === true;
      return isInternal && c.slack_user_id === slackUserId;
    });

    if (contact) {
      return [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
    }
    return null;
  } catch (e) {
    Logger.log('Error finding team member by Slack ID: ' + e);
    return null;
  }
}
