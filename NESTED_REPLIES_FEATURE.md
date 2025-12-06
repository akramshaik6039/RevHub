# Nested Replies Feature - Implementation Summary

## Overview
Implemented a collapsible nested reply system where users can reply to comments. Replies are hidden by default and shown when clicked. Deleting a parent comment automatically deletes all its replies.

## Features Implemented

### 1. Backend (Already Existed)

#### Comment Entity
```java
@ManyToOne
@JoinColumn(name = "parent_comment_id")
private Comment parentComment;

@OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, orphanRemoval = true)
private List<Comment> replies;
```

**Key Features:**
- Self-referencing relationship
- `CascadeType.ALL` - All operations cascade to replies
- `orphanRemoval = true` - Replies deleted when parent is deleted
- `FetchType.EAGER` - Replies loaded automatically

#### API Endpoints
```
POST /posts/comments/{commentId}/replies
Body: { "content": "reply text" }
Response: Comment with reply data
```

### 2. Frontend Implementation

#### Dashboard Component TypeScript

**New Methods:**

1. **toggleCommentReplies(postId, commentIndex)**
   - Shows/hides reply input form
   - Clears reply text when hiding

2. **toggleRepliesVisibility(postId, commentIndex)**
   - Shows/hides replies list
   - Toggles chevron icon

3. **addCommentReply(post, commentIndex)**
   - Submits reply to backend
   - Adds reply to comment's replies array
   - Auto-shows replies after adding
   - Closes reply form

4. **cancelCommentReply(postId, commentIndex)**
   - Hides reply form
   - Clears reply text

**Comment Initialization:**
```typescript
commentPost(post: any) {
  post.commentsList = comments.map(c => ({
    ...c,
    showReplies: false,      // Replies hidden by default
    showReplyForm: false,    // Reply form hidden
    replyText: '',           // Empty reply text
    replies: c.replies || [] // Initialize replies array
  }));
}
```

#### Dashboard Component HTML

**Comment Structure:**
```html
<div *ngFor="let comment of post.commentsList; let i = index">
  <!-- Comment Content -->
  <div>Comment text</div>
  
  <!-- Action Buttons -->
  <button (click)="toggleCommentReplies(post.id, i)">Reply</button>
  <button *ngIf="comment.replies?.length > 0" 
          (click)="toggleRepliesVisibility(post.id, i)">
    {{comment.replies.length}} replies
  </button>
  
  <!-- Reply Form (Hidden by default) -->
  <div *ngIf="comment.showReplyForm">
    <input [(ngModel)]="comment.replyText">
    <button (click)="addCommentReply(post, i)">Reply</button>
    <button (click)="cancelCommentReply(post.id, i)">Cancel</button>
  </div>
  
  <!-- Replies List (Hidden by default) -->
  <div *ngIf="comment.showReplies && comment.replies?.length > 0">
    <div *ngFor="let reply of comment.replies">
      <!-- Reply content -->
    </div>
  </div>
</div>
```

## User Experience Flow

### Scenario 1: Adding a Reply

1. **User 1** posts something
2. **User 2** comments on the post
3. **User 1** sees the comment
4. **User 1** clicks "Reply" button
5. Reply input form appears
6. **User 1** types reply and clicks "Reply"
7. Reply is added and automatically shown
8. Reply form closes

### Scenario 2: Viewing Replies

1. Comment shows "3 replies" button
2. User clicks the button
3. Replies expand and show below comment
4. Chevron icon changes from down to up
5. User clicks again to collapse
6. Replies hide

### Scenario 3: Deleting Comment with Replies

1. **User 1** has a comment with 5 replies
2. **User 1** (or post author) clicks delete
3. Confirmation dialog appears
4. User confirms deletion
5. **Backend** deletes comment
6. **Backend** automatically deletes all 5 replies (cascade)
7. **Frontend** removes comment from list

## Visual Design

### Comment Layout
```
┌─────────────────────────────────────┐
│ 👤 Username                    [×]  │
│ This is a comment                   │
│ 2 hours ago  [Reply]  [3 replies ▼]│
│                                     │
│ [Reply Form - Hidden by default]   │
│                                     │
│ ┌─ Replies (Hidden by default) ───┐│
│ │ 👤 User2: Great point!          ││
│ │ 👤 User3: I agree               ││
│ │ 👤 User4: Thanks!               ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Reply Styling
- **Indented**: Replies are indented with `ms-3` (margin-left)
- **Smaller**: Reply avatars are 24px vs 32px for comments
- **Nested**: Clear visual hierarchy
- **Bordered**: White background with border to distinguish from parent

## Technical Details

### Cascade Delete
```java
@OneToMany(
  mappedBy = "parentComment",
  cascade = CascadeType.ALL,      // All operations cascade
  orphanRemoval = true,            // Delete orphaned replies
  fetch = FetchType.EAGER          // Load replies automatically
)
private List<Comment> replies;
```

**What happens when deleting a comment:**
1. JPA finds the comment
2. Loads all replies (EAGER fetch)
3. Deletes each reply (CASCADE)
4. Deletes the parent comment
5. All done in one transaction

### State Management

Each comment object has:
```typescript
{
  id: number,
  content: string,
  author: User,
  createdDate: string,
  replies: Comment[],           // Array of reply objects
  showReplies: boolean,         // Toggle replies visibility
  showReplyForm: boolean,       // Toggle reply form
  replyText: string            // Reply input text
}
```

## API Integration

### Add Reply
```typescript
this.postService.addReply(commentId, replyText).subscribe({
  next: (reply) => {
    comment.replies.push(reply);
    comment.showReplies = true;  // Auto-show after adding
  }
});
```

### Delete Comment (with replies)
```typescript
this.postService.deleteComment(postId, commentId).subscribe({
  next: () => {
    // Backend automatically deletes all replies
    post.commentsList = post.commentsList.filter(c => c.id !== commentId);
  }
});
```

## Features

### ✅ Collapsible Replies
- Hidden by default
- Click to expand/collapse
- Chevron icon indicates state

### ✅ Reply Form
- Hidden by default
- Click "Reply" to show
- Cancel button to hide
- Auto-closes after submitting

### ✅ Cascade Delete
- Delete comment → All replies deleted
- Automatic via JPA cascade
- No orphaned replies

### ✅ Visual Hierarchy
- Comments: 32px avatar, full width
- Replies: 24px avatar, indented, bordered
- Clear parent-child relationship

### ✅ Reply Count
- Shows number of replies
- Only visible if replies exist
- Updates in real-time

## Benefits

1. **Clean UI**: Replies don't clutter the comment section
2. **User Control**: Users decide when to view replies
3. **Data Integrity**: No orphaned replies in database
4. **Scalability**: Works with unlimited reply depth
5. **Performance**: Eager loading ensures replies are available

## Testing Scenarios

### Test 1: Add Reply
1. Create post as User A
2. Add comment as User B
3. Click "Reply" as User A
4. Type reply and submit
5. Verify reply appears
6. Verify reply count shows "1 reply"

### Test 2: Multiple Replies
1. Add 3 replies to a comment
2. Verify count shows "3 replies"
3. Click to expand
4. Verify all 3 replies visible
5. Click to collapse
6. Verify replies hidden

### Test 3: Cascade Delete
1. Create comment with 5 replies
2. Delete the parent comment
3. Verify confirmation dialog
4. Confirm deletion
5. Verify comment removed from UI
6. Check database - all 6 records deleted

### Test 4: Cancel Reply
1. Click "Reply" button
2. Type some text
3. Click "Cancel"
4. Verify form closes
5. Verify text is cleared

## Database Impact

### Before Delete:
```
comments table:
- comment_id: 1, parent_id: null
- comment_id: 2, parent_id: 1
- comment_id: 3, parent_id: 1
- comment_id: 4, parent_id: 1
```

### After Deleting Comment 1:
```
comments table:
(empty - all 4 records deleted)
```

## Future Enhancements

1. **Nested Replies**: Allow replies to replies (unlimited depth)
2. **Reply Notifications**: Notify when someone replies to your comment
3. **Edit Replies**: Allow editing reply text
4. **Like Replies**: Add like functionality to replies
5. **Load More**: Paginate replies if count is high
6. **Reply Preview**: Show first 2 replies, "Load more" for rest

## Status
✅ Backend cascade delete - Working
✅ Frontend reply form - Working
✅ Collapsible replies - Working
✅ Reply count display - Working
✅ Visual hierarchy - Working
✅ State management - Working
✅ Profile section replies - Working
✅ Feed section replies - Working
