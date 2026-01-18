# SPA Navigation Architecture

**Date Implemented:** 2026-01-17
**Problem Solved:** Blank page after 3 tab clicks

---

## The Problem

### Symptom
After clicking exactly 3 different tabs in the navigation bar, the page would go completely blank. The browser's back button did not work, and only a full page refresh would recover the application.

### Root Cause
Google Apps Script web apps run inside a sandboxed iframe. The original navigation approach used `window.location.href` (later `window.location.replace()`) to change pages, which triggers a full page reload inside the iframe.

The iframe sandbox has limitations on navigation history. After approximately 3 URL changes via `window.location`, the iframe would fail silently, resulting in a blank page with `about:blank` appearing in the console logs.

Console errors observed:
```
about:blank:1 An iframe which has both allow-scripts and allow-same-origin
for its sandbox attribute can escape its sandboxing.
```

### Why "3 Clicks"?
The iframe sandbox appears to have a built-in limit on navigation history entries or rapid URL changes. This is not officially documented by Google, but has been reported by multiple developers in the Apps Script community.

---

## What We Tried (Unsuccessful)

### Attempt 1: Remove async baseUrl overwrite
**Theory:** Race condition where `getPlatformConfig()` async call was overwriting `Platform.baseUrl` mid-navigation.

**Change:** Removed `Platform.baseUrl = config.baseUrl;` from the async success handler.

**Result:** Did not fix the issue. The 3-click blank page persisted.

### Attempt 2: Add navigation debounce
**Theory:** Rapid clicks were overwhelming the iframe sandbox.

**Change:** Added 500ms debounce between navigation attempts.

**Result:** Did not fix the issue. The problem occurred even with slow, deliberate clicks.

### Attempt 3: Use `window.location.replace()` instead of `.href`
**Theory:** History accumulation was causing the iframe to fail. Using `replace()` would avoid adding history entries.

**Change:** Changed `window.location.href = url` to `window.location.replace(url)`.

**Result:** Did not fix the issue. The iframe sandbox still failed after 3 navigations.

---

## The Solution: Single Page Application (SPA) Architecture

### Overview
Instead of reloading the entire page for each navigation, we now dynamically load only the content area using `google.script.run` and update the URL using `google.script.history`.

### Key Components

#### 1. Server-side: `getPageHTML()` function in Code.gs
```javascript
function getPageHTML(pageName) {
  if (!PAGES[pageName]) {
    return '<div class="error">Page not found: ' + pageName + '</div>';
  }
  try {
    return HtmlService.createHtmlOutputFromFile(pageName).getContent();
  } catch (e) {
    return '<div class="page-placeholder"><h2>Error</h2><p>Could not load page</p></div>';
  }
}
```

#### 2. Client-side: SPA navigation in index.html
```javascript
function navigateTo(page) {
  // Update URL without page reload
  google.script.history.push(null, {page: page});

  // Fetch and display content dynamically
  loadPageContent(page);
}

function loadPageContent(page) {
  google.script.run
    .withSuccessHandler(function(html) {
      setInnerHTMLWithScripts(document.getElementById('contentArea'), html);
      Platform.activePage = page;
      feather.replace();
      updateNavActiveState();
    })
    .getPageHTML(page);
}
```

#### 3. Script execution handler
When setting `innerHTML`, `<script>` tags don't execute automatically. We handle this by replacing script elements:

```javascript
function setInnerHTMLWithScripts(element, html) {
  element.innerHTML = html;

  var scripts = element.querySelectorAll('script');
  scripts.forEach(function(oldScript) {
    var newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(function(attr) {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}
```

#### 4. Browser back/forward support
```javascript
google.script.history.setChangeHandler(function(e) {
  var page = e.location.parameter.page || 'implementation';
  if (page !== Platform.activePage) {
    loadPageContent(page);
  }
});
```

---

## Benefits of SPA Architecture

| Aspect | Before (Page Reload) | After (SPA) |
|--------|---------------------|-------------|
| Navigation | Full iframe reload | Content swap only |
| URL | `?page=xxx` | `?page=xxx` (same) |
| Back/Forward | Broken after 3 clicks | Works correctly |
| Preview/Testing | Had to type URL manually | Nav bar works in preview |
| Performance | Full page load each time | Only content loads |
| State | Lost on navigation | Preserved in parent scope |

---

## Technical References

### Google APIs Used
- `google.script.history.push(state, params, hash)` - Update URL without reload
- `google.script.history.setChangeHandler(callback)` - Handle back/forward
- `google.script.run.getPageHTML(page)` - Fetch page content from server

### Official Documentation
- [google.script.history API](https://developers.google.com/apps-script/guides/html/reference/history)
- [HTML Service Restrictions](https://developers.google.com/apps-script/guides/html/restrictions)

### Community Reports of Same Issue
- [Apps Script Web App stops loading after a few link clicks](https://support.google.com/docs/thread/249831807)
- Multiple reports on Google Apps Script Community forums

---

## Files Modified

| File | Changes |
|------|---------|
| `deploy/Code.gs` | Added `getPageHTML(pageName)` function |
| `deploy/index.html` | Rewrote navigation to use SPA pattern |

---

## Lessons Learned

1. **Google Apps Script iframe sandbox has undocumented limitations** - The 3-navigation limit is not documented but is a real constraint.

2. **`window.location` changes are problematic in iframes** - Even with `replace()`, the sandbox can fail.

3. **`google.script.history` exists for a reason** - Google provides this API specifically for SPA-style navigation in web apps.

4. **`innerHTML` doesn't execute scripts** - When dynamically loading content, you must handle script execution manually.

5. **Test in deployed environment** - The SPA approach also enables nav bar testing in preview mode, which was not possible before.
