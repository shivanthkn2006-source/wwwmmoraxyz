// Conversation export utilities - Full support for text, images, videos, and documents

interface ExportMessage {
  role: string;
  content: string;
  created_at: string;
  media_url?: string;
  media_type?: string;
  image_url?: string;
}

export const exportToText = (messages: Array<ExportMessage>, userName: string = 'User'): string => {
  let text = `Zoe AI Conversation Export\n`;
  text += `Exported on: ${new Date().toLocaleString()}\n`;
  text += `User: ${userName}\n`;
  text += `Total Messages: ${messages.length}\n`;
  text += `\n${'='.repeat(60)}\n\n`;

  messages.forEach((msg, index) => {
    const timestamp = new Date(msg.created_at).toLocaleString();
    const speaker = msg.role === 'user' ? userName : 'Zoe';
    
    text += `[${timestamp}] ${speaker}:\n`;
    text += `${msg.content}\n`;
    
    // Include media references
    if (msg.media_url || msg.image_url) {
      const mediaUrl = msg.media_url || msg.image_url;
      const mediaType = msg.media_type || 'image';
      text += `\n[${mediaType.toUpperCase()} ATTACHMENT: ${mediaUrl}]\n`;
    }
    
    text += '\n';
    
    if (index < messages.length - 1) {
      text += `${'-'.repeat(60)}\n\n`;
    }
  });

  text += `\n${'='.repeat(60)}\n`;
  text += `End of conversation\n`;

  return text;
};

export const downloadAsText = (content: string, filename: string = 'zoe-conversation.txt') => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async (
  messages: Array<ExportMessage>,
  userName: string = 'User'
): Promise<Blob> => {
  // Create HTML content for PDF with full media support
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #4f46e5;
          margin: 0 0 10px 0;
        }
        .header .meta {
          color: #666;
          font-size: 14px;
        }
        .message {
          margin-bottom: 25px;
          padding: 15px;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .message.user {
          background-color: #f3f4f6;
          border-left: 4px solid #4f46e5;
        }
        .message.assistant {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 12px;
          color: #666;
        }
        .speaker {
          font-weight: bold;
          color: #111;
        }
        .timestamp {
          font-style: italic;
        }
        .content {
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .media-container {
          margin-top: 10px;
          padding: 10px;
          background: #f9fafb;
          border-radius: 6px;
        }
        .media-container img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 6px;
        }
        .media-container video {
          max-width: 100%;
          max-height: 300px;
          border-radius: 6px;
        }
        .media-link {
          display: block;
          color: #4f46e5;
          text-decoration: underline;
          margin-top: 5px;
          font-size: 12px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Zoe AI Conversation</h1>
        <div class="meta">
          <p>User: ${userName}</p>
          <p>Exported: ${new Date().toLocaleString()}</p>
          <p>Total Messages: ${messages.length}</p>
        </div>
      </div>
  `;

  messages.forEach((msg) => {
    const timestamp = new Date(msg.created_at).toLocaleString();
    const speaker = msg.role === 'user' ? userName : 'Zoe AI Assistant';
    const messageClass = msg.role === 'user' ? 'user' : 'assistant';
    const mediaUrl = msg.media_url || msg.image_url;
    const mediaType = msg.media_type || (msg.image_url ? 'image' : '');

    html += `
      <div class="message ${messageClass}">
        <div class="message-header">
          <span class="speaker">${speaker}</span>
          <span class="timestamp">${timestamp}</span>
        </div>
        <div class="content">${escapeHtml(msg.content)}</div>
    `;
    
    // Add media content if present
    if (mediaUrl) {
      html += `<div class="media-container">`;
      if (mediaType === 'image' || mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        html += `<img src="${mediaUrl}" alt="Shared image" />`;
      } else if (mediaType === 'video' || mediaUrl.match(/\.(mp4|webm|mov)$/i)) {
        html += `<video controls><source src="${mediaUrl}" /></video>`;
      }
      html += `<a href="${mediaUrl}" class="media-link" target="_blank">Open media in new tab</a>`;
      html += `</div>`;
    }
    
    html += `</div>`;
  });

  html += `
      <div class="footer">
        <p>End of Conversation</p>
        <p>Powered by Zoe AI Assistant</p>
      </div>
    </body>
    </html>
  `;

  // Convert HTML to PDF using browser's print API
  return new Blob([html], { type: 'text/html' });
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const downloadAsPDF = async (
  messages: Array<ExportMessage>,
  userName: string = 'User',
  filename: string = 'zoe-conversation.pdf'
) => {
  const htmlBlob = await exportToPDF(messages, userName);
  const htmlUrl = URL.createObjectURL(htmlBlob);
  
  // Open in new window for printing
  const printWindow = window.open(htmlUrl, '_blank');
  
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    // Fallback: download HTML if popup blocked
    const link = document.createElement('a');
    link.href = htmlUrl;
    link.download = filename.replace('.pdf', '.html');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  setTimeout(() => URL.revokeObjectURL(htmlUrl), 1000);
};

// Export type for use in other components
export type { ExportMessage };