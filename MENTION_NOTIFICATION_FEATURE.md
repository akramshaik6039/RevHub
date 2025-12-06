# Mention Notification Feature

## Overview
Implemented a complete mention notification system where users get notified when mentioned in posts or comments, and can click the notification to navigate directly to where they were mentioned.

## Features Implemented

### 1. Backend - Mention Detection & Notification

#### Post Mentions (PostService.java)
- Automatically detects `@username` patterns in post content
- Creates mention notifications for all mentioned users
- Uses regex pattern: `@(\w+)`
- Excludes self-mentions (author mentioning themselves)

#### Comment Mentions (CommentService.java)
- Detects mentions in comments and replies
- Creates comment-specific mention notifications
- Includes both postId and commentId in notification
- Processes mentions for both top-level comments and replies

#### Notification Service (NotificationMongoService.java)
**Methods Added:**
- `createMentionNotification()` - For post mentions
- `createCommentMentionNotification()` - For comment mentions

**Notification Data:**
```java
{
  userId: "mentioned user's ID",
  fromUserId: "mentioner's ID",
  fromUsername: "mentioner's username",
  type: "MENTION",
  message: "username mentioned you in a post/comment",
  postId: Long,
  commentId: Long (for comment mentions),
  readStatus: false,
  createdDate: LocalDateTime
}
```

### 2. Frontend - Notification Handling

#### Dashboard Component (dashboard.component.ts)

**New Methods:**
- `handleNotificationClick()` - Enhanced to handle MENTION type
- `scrollToPost()` - Navigates to and highlights the mentioned post

**Functionality:**
1. User clicks on mention notification
2. Marks notification as read
3. Switches to Feed tab
4. Loads the specific post
5. Opens comments section
6. Scrolls to the post smoothly
7. Centers the post in viewport

#### HTML Updates (dashboard.component.html)
- Added `data-post-id` attribute to post cards
- Enables DOM querying for scroll-to functionality

#### Notification Interface (notification.service.ts)
- Added `postId?: number`
- Added `commentId?: number`

## User Flow

### Scenario 1: Mention in Post
1. **User 2** creates a post: "Hey @user1, check this out!"
2. **Backend** detects `@user1` mention
3. **Backend** creates MENTION notification for User 1
4. **User 1** sees notification: "user2 mentioned you in a post"
5. **User 1** clicks notification
6. **Frontend** navigates to feed and scrolls to the post
7. **User 1** sees the post where they were mentioned

### Scenario 2: Mention in Comment
1. **User 2** comments on User 1's post: "Thanks @user1!"
2. **Backend** detects `@user1` mention in comment
3. **Backend** creates MENTION notification with postId and commentId
4. **User 1** sees notification: "user2 mentioned you in a comment"
5. **User 1** clicks notification
6. **Frontend** navigates to the post and opens comments
7. **User 1** sees the comment where they were mentioned

## Technical Implementation

### Backend Processing

```java
// Regex pattern to find mentions
Pattern pattern = Pattern.compile("@(\\w+)");
Matcher matcher = pattern.matcher(content);

while (matcher.find()) {
    String mentionedUsername = matcher.group(1);
    User mentionedUser = userRepository.findByUsername(mentionedUsername).orElse(null);
    
    if (mentionedUser != null && !mentionedUser.getId().equals(author.getId())) {
        // Create notification
        notificationService.createMentionNotification(...);
    }
}
```

### Frontend Navigation

```typescript
handleNotificationClick(notification: Notification) {
  if (notification.type === 'MENTION' && notification.postId) {
    this.setActiveTab('feed');
    setTimeout(() => {
      this.scrollToPost(notification.postId!);
    }, 100);
  }
}

scrollToPost(postId: number) {
  const post = this.posts.find(p => p.id === postId);
  if (post) {
    this.showComments[postId] = true;
    // Load comments and scroll to post
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
```

## Features

### ✅ Automatic Mention Detection
- Detects `@username` in posts
- Detects `@username` in comments
- Detects `@username` in replies

### ✅ Smart Notifications
- Only notifies mentioned users
- Excludes self-mentions
- Includes context (post vs comment)
- Shows who mentioned them

### ✅ Direct Navigation
- Click notification → Go to post
- Automatically opens comments
- Smooth scroll to post
- Centers post in viewport

### ✅ Multiple Mentions
- Can mention multiple users in one post/comment
- Each mentioned user gets their own notification
- Example: "@user1 and @user2 check this!"

## Database Schema

### NotificationMongo Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  type: "MENTION",
  message: String,
  readStatus: Boolean,
  createdDate: ISODate,
  fromUserId: String,
  fromUsername: String,
  fromUserProfilePicture: String,
  postId: Long,
  commentId: Long  // Only for comment mentions
}
```

## API Endpoints

### Get Notifications
```
GET /notifications
Response: List<NotificationMongo>
```

### Mark as Read
```
PUT /notifications/{id}/read
Response: NotificationMongo
```

## Testing Scenarios

### Test 1: Post Mention
1. User A creates post: "Hello @userB!"
2. Verify User B receives notification
3. User B clicks notification
4. Verify navigation to post

### Test 2: Comment Mention
1. User A posts something
2. User B comments: "Nice @userA!"
3. Verify User A receives notification
4. User A clicks notification
5. Verify navigation to post with comments open

### Test 3: Multiple Mentions
1. User A posts: "@userB @userC check this"
2. Verify both User B and User C receive notifications
3. Both users can click and navigate to post

### Test 4: Self Mention
1. User A posts: "I @userA did this"
2. Verify User A does NOT receive notification

### Test 5: Reply Mention
1. User A posts something
2. User B comments
3. User C replies to B's comment: "@userB agreed!"
4. Verify User B receives notification
5. User B clicks and sees the reply

## Benefits

1. **Better Engagement**: Users are notified when mentioned
2. **Direct Navigation**: No searching for where you were mentioned
3. **Context Aware**: Knows if mention was in post or comment
4. **User Friendly**: Smooth scrolling and highlighting
5. **Scalable**: Handles multiple mentions efficiently

## Future Enhancements

1. **Highlight Mention**: Highlight the specific mention text
2. **Mention Preview**: Show snippet of content in notification
3. **Mention Settings**: Allow users to control mention notifications
4. **Mention Analytics**: Track mention frequency
5. **Rich Mentions**: Click @username to view profile

## Status
✅ Backend mention detection - Working
✅ Post mentions - Working
✅ Comment mentions - Working
✅ Reply mentions - Working
✅ Notification creation - Working
✅ Frontend navigation - Working
✅ Scroll to post - Working
✅ Comments auto-open - Working
✅ Multiple mentions - Working
✅ Self-mention exclusion - Working
