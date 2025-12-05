# Unseen Message Indicator System

## Overview
This system provides real-time unseen message indicators in the chat dashboard, showing users when they have unread messages from other users.

## Features Implemented

### 1. Visual Indicators
- **Chat Tab Badge**: Shows total unread count across all conversations
- **Contact List Indicators**: Each contact shows individual unread count
- **Visual Styling**: Red badges, pulsing animations, and highlighted contacts
- **Real-time Updates**: Automatic refresh every 3 seconds when chat tab is active

### 2. Backend API Endpoints

#### Individual Unread Count
```
GET /chat/unread-count/{username}
```
Returns the number of unread messages from a specific user.

#### Bulk Unread Counts
```
GET /chat/unread-counts
```
Returns unread counts for all contacts at once (better performance).

#### Mark Messages as Read
```
POST /chat/mark-read/{username}
```
Marks all messages from a specific user as read.

### 3. Frontend Components

#### Dashboard Component (`dashboard.component.ts`)
- `unreadCounts`: Object storing unread counts per contact
- `getTotalUnreadCount()`: Calculates total unread messages
- `refreshUnreadCounts()`: Fetches latest unread counts
- `selectChat()`: Marks messages as read when opening chat
- `startUnreadCountRefresh()`: Auto-refresh mechanism

#### Chat Service (`chat.service.ts`)
- `getAllUnreadCounts()`: Bulk fetch unread counts
- `getUnreadCount()`: Individual unread count
- `markAsRead()`: Mark messages as read

### 4. UI/UX Features

#### Chat Tab Navigation
```html
<button class="btn btn-link" [class.active]="activeTab === 'chat'" (click)="setActiveTab('chat')">
  <i class="fas fa-comments"></i> Chat
  <span *ngIf="getTotalUnreadCount() > 0" 
        class="badge bg-danger rounded-pill ms-1 chat-tab-badge unread-badge">
    {{getTotalUnreadCount()}}
  </span>
</button>
```

#### Contact List with Indicators
```html
<button class="list-group-item list-group-item-action d-flex align-items-center justify-content-between" 
        *ngFor="let contact of contacts" 
        (click)="selectChat(contact)"
        [class.chat-contact-unread]="unreadCounts[contact] > 0">
  <div class="d-flex align-items-center">
    <div class="position-relative">
      <img [src]="'default.jpg'" class="rounded-circle me-3" alt="Avatar">
      <span *ngIf="unreadCounts[contact] > 0" 
            class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle chat-unread-indicator">
      </span>
    </div>
    <div>
      <h6 class="mb-0" [class.fw-bold]="unreadCounts[contact] > 0" [class.text-danger]="unreadCounts[contact] > 0">
        {{contact}}
      </h6>
      <small class="text-danger fw-bold" *ngIf="unreadCounts[contact] > 0">
        <i class="fas fa-envelope me-1"></i>{{unreadCounts[contact]}} new message{{unreadCounts[contact] > 1 ? 's' : ''}}
      </small>
    </div>
  </div>
  <div *ngIf="unreadCounts[contact] > 0" class="d-flex align-items-center">
    <span class="badge bg-danger rounded-pill unread-badge">{{unreadCounts[contact]}}</span>
  </div>
</button>
```

### 5. CSS Animations

#### Pulsing Indicator
```css
.chat-unread-indicator {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}
```

#### Bouncing Badge
```css
.unread-badge {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-3px); }
  60% { transform: translateY(-1px); }
}
```

## How It Works

### 1. Message Flow
1. **User 1** sends a message to **User 2**
2. Backend creates `ChatMessage` with `read: false`
3. **User 2** sees unseen message indicator in chat dashboard
4. When **User 2** opens the chat, messages are marked as read
5. Indicator disappears for that conversation

### 2. Real-time Updates
- Auto-refresh every 3 seconds when chat tab is active
- Manual refresh when sending/receiving messages
- Immediate UI update when opening chats

### 3. Performance Optimization
- Bulk API call to get all unread counts at once
- Efficient state management with object-based storage
- Conditional rendering to minimize DOM updates

## Usage Example

### Scenario: User receives new messages
1. **akram** sends 2 messages to **Abhishek**
2. **Abhishek** sees:
   - Chat tab shows badge with "2"
   - Contact list shows **akram** with red indicator and "2 new messages"
   - Contact row is highlighted with red border
3. **Abhishek** clicks on **akram**'s chat
4. Messages are marked as read
5. All indicators disappear

### Testing the System
Use the test component (`test-chat.component.ts`) to simulate messages and verify the indicator behavior.

## Backend Database Schema

### ChatMessage Entity
```java
public class ChatMessage {
    private String id;
    private String senderId;
    private String senderUsername;
    private String receiverId;
    private String receiverUsername;
    private String content;
    private LocalDateTime timestamp;
    private boolean read; // Key field for unseen indicators
    private String messageType;
}
```

### Key Repository Methods
- `countUnreadMessages(receiverId, senderId)`: Count unread messages
- `findConversation(userId1, userId2)`: Get conversation messages
- `findChatContactsRaw(userId)`: Get all chat contacts

## Configuration

### Auto-refresh Interval
```typescript
// Refresh every 3 seconds when chat tab is active
this.unreadCountInterval = setInterval(() => {
  if (this.activeTab === 'chat') {
    this.refreshUnreadCounts();
  }
}, 3000);
```

### Performance Settings
- Bulk API calls instead of individual requests
- Efficient state management
- Conditional UI updates

## Future Enhancements

1. **WebSocket Integration**: Real-time updates without polling
2. **Push Notifications**: Browser notifications for new messages
3. **Message Preview**: Show last message content in contact list
4. **Typing Indicators**: Show when someone is typing
5. **Message Status**: Delivered, read receipts
6. **Group Chat Support**: Extend to group conversations

## Troubleshooting

### Common Issues
1. **Indicators not updating**: Check auto-refresh is running
2. **Count mismatch**: Verify backend read status updates
3. **Performance issues**: Use bulk API calls instead of individual requests

### Debug Tools
- Browser console logs show unread count updates
- Test component for simulating scenarios
- Network tab to verify API calls

This system provides a complete unseen message indicator experience similar to popular messaging apps like WhatsApp, Telegram, and Facebook Messenger.