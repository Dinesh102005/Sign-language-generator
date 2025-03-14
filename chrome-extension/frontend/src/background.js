// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Sign Language Translator Extension installed');
  chrome.storage.local.set({
    enabled: false,
    quality: 'high'
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes("youtube.com/watch")) {
    console.log('YouTube video page loaded, checking content script');
    
    // Check if content script is already injected
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
      if (chrome.runtime.lastError) {
        console.log('Content script not found, injecting...');
        // Content script not ready, inject it
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content_script.bundle.js']
        }).then(() => {
          console.log('Content script injected successfully');
          // Also inject the CSS
          return chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content_script.css']
          });
        }).catch(err => {
          console.error('Failed to inject content script:', err);
        });
      } else {
        console.log('Content script already active');
      }
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'toggleTranslation') {
    // Forward the message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message)
          .then(() => console.log('Toggle message forwarded successfully'))
          .catch(err => console.error('Error forwarding toggle message:', err));
      }
    });
  }
  
  if (message.action === 'checkContentScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: 'No active tab found' });
        return;
      }
      
      // Try to send a test message to the content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'ping' }, response => {
        if (chrome.runtime.lastError) {
          // Content script not ready, inject it
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content_script.bundle.js']
          }).then(() => {
            // Also inject the CSS
            return chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              files: ['content_script.css']
            });
          }).then(() => {
            sendResponse({ success: true });
          }).catch(err => {
            sendResponse({ error: 'Failed to inject content script: ' + err.message });
          });
        } else {
          sendResponse({ success: true });
        }
      });
    });
    return true; // Keep the message channel open for async response
  }
  
  // Always return true if you plan to respond asynchronously
  return true;
});