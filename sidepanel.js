// ========== Elements ==========

const topicSelect = document.getElementById('topicSelect');
const newTopicBtn = document.getElementById('newTopicBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const topicInput = document.getElementById('topicInput');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const exportBtn = document.getElementById('exportBtn');
const deleteBtn = document.getElementById('deleteBtn');
const clearBtn = document.getElementById('clearBtn');

// ========== State ==========

let isEditing = false;
let isPreviewMode = false;
let currentTopicId = null;
let topics = {};

// ========== Initialize ==========

function init() {
  chrome.storage.local.get(['currentTopicId', 'topics'], (result) => {
    topics = result.topics || {};
    currentTopicId = result.currentTopicId || null;
    
    if (Object.keys(topics).length === 0) {
      createNewTopic();
    } else {
      if (!currentTopicId || !topics[currentTopicId]) {
        currentTopicId = Object.keys(topics)[0];
      }
      renderTopicSelect();
      loadCurrentTopic();
    }
    
    // Check for pending content
    checkPendingContent();
  });
}

init();

// ========== Check for pending content from context menu ==========

function checkPendingContent() {
  chrome.storage.local.get(['pendingContent'], (result) => {
    if (result.pendingContent) {
      insertContentAtCursor(result.pendingContent);
      // Clear pending content
      chrome.storage.local.remove('pendingContent');
    }
  });
}

// ========== Insert content at cursor or at end ==========

function insertContentAtCursor(content) {
  // Focus the editor
  editor.focus();
  
  const selection = window.getSelection();
  let insertedAtCursor = false;
  
  // Check if cursor is in editor
  if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
    insertedAtCursor = true;
  }
  
  if (insertedAtCursor) {
    // Insert at cursor position using execCommand (preserves undo)
    document.execCommand('insertHTML', false, content);
  } else {
    // Move cursor to end first
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Add line breaks if there's existing content
    if (editor.innerHTML && editor.innerHTML !== '<br>') {
      document.execCommand('insertHTML', false, '<br><br>' + content);
    } else {
      document.execCommand('insertHTML', false, content);
    }
  }
  
  // Save
  saveCurrentTopic();
  updatePreview();
  
  // Scroll to make cursor visible
  setTimeout(() => {
    scrollToCursor();
  }, 50);
}

// ========== Scroll to cursor position ==========

function scrollToCursor() {
  const selection = window.getSelection();
  
  if (selection.rangeCount > 0) {
    // Create a temporary span at cursor position
    const range = selection.getRangeAt(0);
    const tempSpan = document.createElement('span');
    tempSpan.id = 'temp-cursor-marker';
    
    try {
      range.insertNode(tempSpan);
      
      // Get position of the span
      const spanTop = tempSpan.offsetTop;
      const spanHeight = tempSpan.offsetHeight || 20;
      const editorHeight = editor.clientHeight;
      const currentScroll = editor.scrollTop;
      
      // Calculate if span is visible
      const spanBottom = spanTop + spanHeight;
      const visibleTop = currentScroll;
      const visibleBottom = currentScroll + editorHeight;
      
      // Scroll if needed
      if (spanTop < visibleTop) {
        // Cursor is above visible area
        editor.scrollTop = spanTop - 20;
      } else if (spanBottom > visibleBottom) {
        // Cursor is below visible area
        editor.scrollTop = spanBottom - editorHeight + 20;
      }
      
      // Remove temp span
      tempSpan.remove();
      
      // Restore selection
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      // Fallback: scroll to bottom
      editor.scrollTop = editor.scrollHeight;
    }
  } else {
    // No selection, scroll to bottom
    editor.scrollTop = editor.scrollHeight;
  }
}

// ========== Import Markdown File ==========

function importMarkdownFile(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const content = e.target.result;
    
    // Extract title from first line if it's a heading
    let title = '';
    let body = content;
    
    const lines = content.split('\n');
    if (lines[0].startsWith('# ')) {
      title = lines[0].substring(2).trim();
      body = lines.slice(1).join('\n').trim();
    } else {
      // Use filename as title
      title = file.name.replace(/\.(md|txt)$/, '');
    }
    
    // Create new topic with imported content
    const id = 'topic_' + Date.now();
    
    // Convert markdown to HTML for editor
    const htmlContent = markdownToHtml(body);
    
    topics[id] = { title: title, content: htmlContent };
    currentTopicId = id;
    saveAll();
    renderTopicSelect();
    loadCurrentTopic();
  };
  
  reader.readAsText(file);
}

// Convert markdown to simple HTML
function markdownToHtml(markdown) {
  // Convert newlines to <br>
  let html = markdown
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
  
  return html;
}

// ========== Topic Management ==========

function createNewTopic() {
  const id = 'topic_' + Date.now();
  topics[id] = { title: '', content: '' };
  currentTopicId = id;
  saveAll();
  renderTopicSelect();
  loadCurrentTopic();
  topicInput.focus();
}

function renderTopicSelect() {
  topicSelect.innerHTML = '';
  
  for (const id in topics) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = topics[id].title || 'Untitled';
    if (id === currentTopicId) {
      option.selected = true;
    }
    topicSelect.appendChild(option);
  }
}

function loadCurrentTopic() {
  if (currentTopicId && topics[currentTopicId]) {
    topicInput.value = topics[currentTopicId].title || '';
    editor.innerHTML = topics[currentTopicId].content || '';
    updatePreview();
  } else {
    topicInput.value = '';
    editor.innerHTML = '';
    preview.innerHTML = '';
  }
}

function saveCurrentTopic() {
  if (currentTopicId) {
    topics[currentTopicId] = {
      title: topicInput.value,
      content: editor.innerHTML
    };
    saveAll();
    
    const option = topicSelect.querySelector(`option[value="${currentTopicId}"]`);
    if (option) {
      option.textContent = topicInput.value || 'Untitled';
    }
  }
}

function saveAll() {
  chrome.storage.local.set({ currentTopicId, topics });
}

// ========== Preview Mode ==========

function updatePreview() {
  // Convert HTML to text for markdown parsing
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = editor.innerHTML;
  const textContent = htmlToMarkdown(tempDiv);
  preview.innerHTML = marked.parse(textContent);
}

// Convert HTML to markdown-friendly text
function htmlToMarkdown(element) {
  let text = '';
  
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      if (tag === 'br') {
        text += '\n';
      } else if (tag === 'div' || tag === 'p') {
        text += '\n' + htmlToMarkdown(node) + '\n';
      } else if (tag === 'ul') {
        for (const li of node.children) {
          text += '\n- ' + htmlToMarkdown(li);
        }
        text += '\n';
      } else if (tag === 'ol') {
        let i = 1;
        for (const li of node.children) {
          text += '\n' + i + '. ' + htmlToMarkdown(li);
          i++;
        }
        text += '\n';
      } else if (tag === 'li') {
        text += htmlToMarkdown(node);
      } else if (tag === 'strong' || tag === 'b') {
        text += '**' + htmlToMarkdown(node) + '**';
      } else if (tag === 'em' || tag === 'i') {
        text += '*' + htmlToMarkdown(node) + '*';
      } else if (tag === 'code') {
        text += '`' + htmlToMarkdown(node) + '`';
      } else if (tag === 'a') {
        text += '[' + htmlToMarkdown(node) + '](' + node.href + ')';
      } else {
        text += htmlToMarkdown(node);
      }
    }
  }
  
  return text;
}

function toggleMode() {
  isPreviewMode = !isPreviewMode;
  
  if (isPreviewMode) {
    updatePreview();
    editor.style.display = 'none';
    preview.style.display = 'block';
    toggleModeBtn.textContent = 'Edit';
    toggleModeBtn.classList.add('active');
  } else {
    editor.style.display = 'block';
    preview.style.display = 'none';
    toggleModeBtn.textContent = 'Preview';
    toggleModeBtn.classList.remove('active');
  }
}

// ========== Handle paste - strip formatting but keep undo ==========

editor.addEventListener('paste', (e) => {
  e.preventDefault();
  
  // Get plain text or HTML
  let content = '';
  
  if (e.clipboardData.types.includes('text/html')) {
    // Get HTML and clean it
    const html = e.clipboardData.getData('text/html');
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove all style attributes and unwanted tags
    content = cleanPastedHtml(temp);
  } else {
    // Plain text - convert newlines to <br>
    const text = e.clipboardData.getData('text/plain');
    content = text.replace(/\n/g, '<br>');
  }
  
  // Use execCommand to insert HTML (preserves undo history)
  document.execCommand('insertHTML', false, content);
  
  saveCurrentTopic();
  updatePreview();
});

// Clean pasted HTML - keep structure, remove styling
function cleanPastedHtml(element) {
  // Tags to keep
  const allowedTags = ['p', 'br', 'div', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
  
  let html = '';
  
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      html += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      
      if (allowedTags.includes(tag)) {
        const innerHtml = cleanPastedHtml(node);
        if (tag === 'a') {
          html += `<a href="${node.href}">${innerHtml}</a>`;
        } else {
          html += `<${tag}>${innerHtml}</${tag}>`;
        }
      } else if (tag === 'span') {
        // Unwrap spans
        html += cleanPastedHtml(node);
      } else {
        // Convert other block elements to div
        html += `<div>${cleanPastedHtml(node)}</div>`;
      }
    }
  }
  
  return html;
}

// ========== Event Listeners ==========

toggleModeBtn.addEventListener('click', toggleMode);

newTopicBtn.addEventListener('click', createNewTopic);

importBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importMarkdownFile(file);
    fileInput.value = ''; // Reset for next import
  }
});

topicSelect.addEventListener('change', () => {
  saveCurrentTopic();
  currentTopicId = topicSelect.value;
  chrome.storage.local.set({ currentTopicId });
  loadCurrentTopic();
});

topicInput.addEventListener('input', saveCurrentTopic);

editor.addEventListener('input', () => {
  saveCurrentTopic();
  updatePreview();
});

// ========== Track editing state ==========

editor.addEventListener('focus', () => {
  isEditing = true;
});

editor.addEventListener('blur', () => {
  isEditing = false;
});

topicInput.addEventListener('focus', () => {
  isEditing = true;
});

topicInput.addEventListener('blur', () => {
  isEditing = false;
});

// ========== Listen for storage changes (from context menu) ==========

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Check for pending content
    if (changes.pendingContent && changes.pendingContent.newValue) {
      insertContentAtCursor(changes.pendingContent.newValue);
      chrome.storage.local.remove('pendingContent');
    }
    
    // Update topics if changed externally and not editing
    if (changes.topics && !isEditing) {
      topics = changes.topics.newValue || {};
      renderTopicSelect();
      loadCurrentTopic();
    }
  }
});

// ========== Export to Markdown ==========

exportBtn.addEventListener('click', () => {
  const title = topicInput.value || 'Untitled';
  
  // Convert HTML to markdown
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = editor.innerHTML;
  const content = htmlToMarkdown(tempDiv);
  
  const markdown = `# ${title}\n\n${content}`;
  
  const blob = new Blob([markdown], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
  a.click();
  
  URL.revokeObjectURL(url);
});

// ========== Delete current topic ==========

deleteBtn.addEventListener('click', () => {
  if (Object.keys(topics).length <= 1) {
    alert('Cannot delete the last topic');
    return;
  }
  
  if (confirm('Delete this topic?')) {
    delete topics[currentTopicId];
    currentTopicId = Object.keys(topics)[0];
    saveAll();
    renderTopicSelect();
    loadCurrentTopic();
  }
});

// ========== Clear current topic content ==========

clearBtn.addEventListener('click', () => {
  if (confirm('Clear content?')) {
    editor.innerHTML = '';
    preview.innerHTML = '';
    saveCurrentTopic();
  }
});