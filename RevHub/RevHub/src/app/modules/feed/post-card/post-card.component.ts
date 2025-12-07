import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Post, PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.css',
  styles: [`
    .cursor-pointer { cursor: pointer; }
    .hover-bg-light:hover { background-color: #f8f9fa !important; }
  `]
})
export class PostCardComponent {
  @Input() post!: Post;
  
  @ViewChild('commentTextarea') commentTextarea!: ElementRef;
  showComments = false;
  comments: any[] = [];
  newComment = '';
  
  showCommentSuggestions = false;
  commentSuggestions: any[] = [];
  selectedCommentSuggestionIndex = -1;
  
  constructor(
    private authService: AuthService,
    private postService: PostService
  ) {}
  
  isVideo(mediaType?: string): boolean {
    return mediaType === 'video' || mediaType?.startsWith('video/');
  }
  
  isImage(mediaType?: string): boolean {
    return !mediaType || mediaType === 'image' || mediaType?.startsWith('image/');
  }
  
  formatContent(content: string): string {
    if (!content) return '';
    
    // Format hashtags
    let formatted = content.replace(/#(\w+)/g, '<span class="text-primary fw-bold">#$1</span>');
    
    // Format mentions
    formatted = formatted.replace(/@(\w+)/g, '<span class="text-success fw-bold">@$1</span>');
    
    return formatted;
  }
  
  toggleComments() {
    this.showComments = !this.showComments;
    if (this.showComments && this.comments.length === 0) {
      this.loadComments();
    }
  }
  
  loadComments() {
    console.log('Loading comments for post:', this.post.id);
    this.postService.getComments(this.post.id).subscribe({
      next: (comments) => {
        console.log('Comments loaded:', comments);
        this.comments = comments.map(comment => this.initializeComment(comment));
      },
      error: (error) => {
        console.error('Error loading comments for post', this.post.id, ':', error);
        // Show user-friendly error message
        this.comments = [];
      }
    });
  }
  
  onCommentKeyUp(event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;
    
    // Handle arrow keys for suggestion navigation
    if (this.showCommentSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedCommentSuggestionIndex = Math.min(this.selectedCommentSuggestionIndex + 1, this.commentSuggestions.length - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedCommentSuggestionIndex = Math.max(this.selectedCommentSuggestionIndex - 1, 0);
        return;
      }
      if (event.key === 'Escape') {
        this.hideCommentSuggestions();
        return;
      }
    }
    
    // Check for @ mention
    const beforeCursor = content.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const afterAt = beforeCursor.substring(atIndex + 1);
      
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        this.searchCommentUsers(afterAt);
      } else {
        this.hideCommentSuggestions();
      }
    } else {
      this.hideCommentSuggestions();
    }
  }
  
  onCommentKeyDown(event: KeyboardEvent) {
    if (this.showCommentSuggestions && event.key === 'Enter' && this.selectedCommentSuggestionIndex >= 0) {
      event.preventDefault();
      this.selectCommentUser(this.commentSuggestions[this.selectedCommentSuggestionIndex]);
    }
  }
  
  searchCommentUsers(query: string) {
    this.authService.searchUsers(query).subscribe({
      next: (users: any[]) => {
        this.commentSuggestions = users || [];
        this.showCommentSuggestions = this.commentSuggestions.length > 0;
        this.selectedCommentSuggestionIndex = 0;
      },
      error: () => this.hideCommentSuggestions()
    });
  }
  
  selectCommentUser(user: any) {
    const textarea = this.commentTextarea.nativeElement;
    const content = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    const beforeCursor = content.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const newContent = content.substring(0, atIndex) + '@' + user.username + ' ' + content.substring(cursorPos);
      this.newComment = newContent;
      
      setTimeout(() => {
        const newPos = atIndex + user.username.length + 2;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    }
    
    this.hideCommentSuggestions();
  }
  
  hideCommentSuggestions() {
    this.showCommentSuggestions = false;
    this.commentSuggestions = [];
    this.selectedCommentSuggestionIndex = -1;
  }
  
  addComment() {
    if (this.newComment.trim()) {
      console.log('Adding comment to post:', this.post.id, 'Content:', this.newComment);
      this.postService.addComment(this.post.id, this.newComment).subscribe({
        next: (comment) => {
          console.log('Comment added successfully:', comment);
          const initializedComment = this.initializeComment(comment);
          this.comments.unshift(initializedComment);
          this.newComment = '';
          this.post.commentsCount++;
        },
        error: (error) => {
          console.error('Error adding comment to post', this.post.id, ':', error);
          // You could add a user notification here
        }
      });
    }
  }
  
  initializeComment(comment: any) {
    return {
      ...comment,
      replies: comment.replies || [],
      showReplyForm: false,
      replyText: '',
      showReplySuggestions: false,
      replySuggestions: [],
      selectedReplySuggestionIndex: -1
    };
  }
  
  toggleReply(commentIndex: number) {
    const comment = this.comments[commentIndex];
    comment.showReplyForm = !comment.showReplyForm;
    if (comment.showReplyForm) {
      comment.replyText = '';
      comment.replies = comment.replies || [];
    }
  }
  
  cancelReply(commentIndex: number) {
    const comment = this.comments[commentIndex];
    comment.showReplyForm = false;
    comment.replyText = '';
    this.hideReplySuggestions(commentIndex);
  }
  
  addReply(commentIndex: number) {
    const comment = this.comments[commentIndex];
    if (comment.replyText?.trim()) {
      console.log('Adding reply to comment:', comment.id, 'Content:', comment.replyText);
      this.postService.addReply(comment.id, comment.replyText).subscribe({
        next: (reply) => {
          console.log('Reply added successfully:', reply);
          if (!comment.replies) {
            comment.replies = [];
          }
          comment.replies.push(reply);
          comment.replyText = '';
          comment.showReplyForm = false;
          this.hideReplySuggestions(commentIndex);
        },
        error: (error) => {
          console.error('Error adding reply to comment', comment.id, ':', error);
        }
      });
    }
  }
  
  onReplyKeyUp(event: KeyboardEvent, commentIndex: number) {
    const comment = this.comments[commentIndex];
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const content = textarea.value;
    
    if (comment.showReplySuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        comment.selectedReplySuggestionIndex = Math.min(comment.selectedReplySuggestionIndex + 1, comment.replySuggestions.length - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        comment.selectedReplySuggestionIndex = Math.max(comment.selectedReplySuggestionIndex - 1, 0);
        return;
      }
      if (event.key === 'Escape') {
        this.hideReplySuggestions(commentIndex);
        return;
      }
    }
    
    const beforeCursor = content.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const afterAt = beforeCursor.substring(atIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        this.searchReplyUsers(afterAt, commentIndex);
      } else {
        this.hideReplySuggestions(commentIndex);
      }
    } else {
      this.hideReplySuggestions(commentIndex);
    }
  }
  
  onReplyKeyDown(event: KeyboardEvent, commentIndex: number) {
    const comment = this.comments[commentIndex];
    if (comment.showReplySuggestions && event.key === 'Enter' && comment.selectedReplySuggestionIndex >= 0) {
      event.preventDefault();
      this.selectReplyUser(comment.replySuggestions[comment.selectedReplySuggestionIndex], commentIndex);
    }
  }
  
  searchReplyUsers(query: string, commentIndex: number) {
    this.authService.searchUsers(query).subscribe({
      next: (users: any[]) => {
        const comment = this.comments[commentIndex];
        comment.replySuggestions = users || [];
        comment.showReplySuggestions = comment.replySuggestions.length > 0;
        comment.selectedReplySuggestionIndex = 0;
      },
      error: () => this.hideReplySuggestions(commentIndex)
    });
  }
  
  selectReplyUser(user: any, commentIndex: number) {
    const comment = this.comments[commentIndex];
    const content = comment.replyText || '';
    const atIndex = content.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Find the end of the current mention attempt
      let endIndex = content.length;
      for (let i = atIndex + 1; i < content.length; i++) {
        if (content[i] === ' ') {
          endIndex = i;
          break;
        }
      }
      
      const newContent = content.substring(0, atIndex) + '@' + user.username + ' ' + content.substring(endIndex);
      comment.replyText = newContent;
    }
    
    this.hideReplySuggestions(commentIndex);
  }
  
  hideReplySuggestions(commentIndex: number) {
    const comment = this.comments[commentIndex];
    comment.showReplySuggestions = false;
    comment.replySuggestions = [];
    comment.selectedReplySuggestionIndex = -1;
  }
  
  canDeleteComment(comment: any): boolean {
    // User can delete their own comments or comments on their own posts
    // For now, we'll need to get current user info - this is a simplified check
    return true; // You should implement proper authorization logic here
  }
  
  deleteComment(commentIndex: number) {
    const comment = this.comments[commentIndex];
    if (confirm('Are you sure you want to delete this comment?')) {
      this.postService.deleteComment(this.post.id, comment.id).subscribe({
        next: () => {
          this.comments.splice(commentIndex, 1);
          this.post.commentsCount--;
        },
        error: (error) => {
          console.error('Error deleting comment:', error);
        }
      });
    }
  }

  // Helper method to get full image URL
  getImageUrl(profilePicture: string | undefined): string | null {
    if (!profilePicture) return null;
    
    // If it's already a full URL, return as is
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    
    // If it's a relative path, prepend backend server URL
    if (profilePicture.startsWith('/uploads/')) {
      return `http://localhost:8080${profilePicture}`;
    }
    
    // If it's just a filename, assume it's in uploads/profiles/
    return `http://localhost:8080/uploads/profiles/${profilePicture}`;
  }
}