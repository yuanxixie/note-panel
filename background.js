// ========== Setup side panel behavior ==========

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ========== Create context menu on install ==========

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addToNotePanel',
    title: 'Add to Note Panel',
    contexts: ['selection']
  });
});

// ========== Handle context menu click ==========

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addToNotePanel') {
    try {
      // Execute script to get selected HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const fragment = range.cloneContents();
            const div = document.createElement('div');
            div.appendChild(fragment);
            return div.innerHTML;
          }
          return '';
        }
      });
      
      const selectedHtml = results[0]?.result || info.selectionText || '';
      
      if (selectedHtml) {
        chrome.storage.local.get(['currentTopicId', 'topics'], (result) => {
          let topics = result.topics || {};
          let currentTopicId = result.currentTopicId;
          
          // If no topics exist, create one
          if (Object.keys(topics).length === 0) {
            currentTopicId = 'topic_' + Date.now();
            topics[currentTopicId] = { title: '', content: '' };
          }
          
          // If no current topic, use the first one
          if (!currentTopicId || !topics[currentTopicId]) {
            currentTopicId = Object.keys(topics)[0];
          }
          
          // Store pending content to be inserted
          chrome.storage.local.set({ 
            currentTopicId, 
            topics,
            pendingContent: selectedHtml
          });
        });
      }
    } catch (error) {
      // Fallback to plain text
      if (info.selectionText) {
        chrome.storage.local.get(['currentTopicId', 'topics'], (result) => {
          let topics = result.topics || {};
          let currentTopicId = result.currentTopicId;
          
          if (Object.keys(topics).length === 0) {
            currentTopicId = 'topic_' + Date.now();
            topics[currentTopicId] = { title: '', content: '' };
          }
          
          if (!currentTopicId || !topics[currentTopicId]) {
            currentTopicId = Object.keys(topics)[0];
          }
          
          chrome.storage.local.set({ 
            currentTopicId, 
            topics,
            pendingContent: info.selectionText
          });
        });
      }
    }
  }
});