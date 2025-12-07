import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeService } from './core/services/theme.service';
import { FeedService, Post } from './core/services/feed.service';
import { AuthService } from './core/services/auth.service';
import { ProfileService, User } from './core/services/profile.service';
import { PostService } from './core/services/post.service';
import { ChatService, ChatMessage } from './core/services/chat.service';
import { NotificationService, Notification } from './core/services/notification.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  activeTab = 'feed';
  feedType = 'universal';
  activeFeedType = 'universal';
  currentPage = 0;
  hasMorePosts = true;
  isLoading = false;
  isDarkTheme = false;
  isEditingProfile = false;
  editBio = '';
  selectedProfilePicture: File | null = null;
  profileName = '';
  profileUsername = '';
  currentUser: any = null;
  userProfile: User | null = null;
  followersCount = 0;
  followingCount = 0;
  userPostsData: any[] = [];
  newPostContent = '';
  posts: any[] = [];
  
  selectedFile: File | null = null;
  selectedFileType = '';
  selectedFilePreview: string | null = null;
  showComments: { [key: number]: boolean } = {};
  newComment = '';
  selectedPostId: number | null = null;
  replyingTo: { postId: string, commentId: number } | null = null;
  replyContent = '';
  postVisibility = 'public';
  showCommentMentionSuggestions = false;
  commentMentionSuggestions: any[] = [];
  showPostMentionSuggestions = false;
  postMentionSuggestions: any[] = [];
  showSearchMentionSuggestions = false;
  searchMentionSuggestions: any[] = [];
  showHashtagSuggestions = false;
  hashtagSuggestions: string[] = [];
  showCommentHashtagSuggestions = false;
  commentHashtagSuggestions: string[] = [];
  showSearchHashtagSuggestions = false;
  searchHashtagSuggestions: string[] = [];
  
  selectedChat: string | null = null;
  newMessage = '';
  contacts: User[] = [];
  contactUsernames: string[] = [];
  messages: { [key: string]: any[] } = {};
  chatSearchQuery = '';
  chatSearchResults: any[] = [];
  unreadCounts: { [key: string]: number } = {};
  Object = Object;

  constructor(
    private themeService: ThemeService, 
    private feedService: FeedService,
    private authService: AuthService,
    private profileService: ProfileService,
    private postService: PostService,
    private chatService: ChatService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.themeService.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
    
    // Load current user data
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.profileName = this.currentUser.username;
      this.profileUsername = this.currentUser.username;
      this.loadUserProfile();
    }
    
    // Check for query parameters (e.g., from message button)
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'chat' && params['user']) {
        this.setActiveTab('chat');
        setTimeout(() => {
          this.selectedChat = params['user'];
          this.loadConversation(params['user']);
        }, 500);
      }
    });
    
    this.loadFeeds();
    this.loadSuggestedUsers();
    // Load MongoDB notifications
    if (this.currentUser) {
      this.loadNotifications();
    }
    
    // Start refreshing unread counts globally
    this.startGlobalUnreadCountRefresh();
  }

  loadFeeds() {
    this.isLoading = true;
    this.postService.getPosts(0, 10).subscribe({
      next: (response) => {
        console.log('Posts loaded:', response);
        this.posts = response.content || [];
        this.currentPage = response.number || 0;
        this.hasMorePosts = (response.number || 0) < (response.totalPages || 0) - 1;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading posts:', error);
        this.posts = [];
        this.isLoading = false;
      }
    });
  }

  switchFeedType(type: string) {
    this.feedType = type;
    this.loadFeeds();
  }
  
  switchFeed(feedType: string) {
    this.activeFeedType = feedType;
    this.feedType = feedType;
    this.currentPage = 0;
    this.posts = [];
    this.loadFeedsByType(feedType);
  }
  
  loadFeedsByType(feedType: string) {
    this.isLoading = true;
    this.postService.getPosts(0, 10, feedType).subscribe({
      next: (response) => {
        this.posts = response.content || [];
        this.currentPage = response.number || 0;
        this.hasMorePosts = (response.number || 0) < (response.totalPages || 0) - 1;
        this.isLoading = false;
      },
      error: (error) => {
        this.posts = [];
        this.isLoading = false;
      }
    });
  }

  loadMorePosts() {
    if (this.isLoading || !this.hasMorePosts || this.feedType === 'universal') return;
    
    this.isLoading = true;
    const followingNames = this.followingList.map(f => f.username);
    const morePosts = this.feedService.loadMorePosts(followingNames);
    
    if (morePosts.length > 0) {
      this.posts = [...this.posts, ...morePosts];
    } else {
      this.hasMorePosts = false;
    }
    
    this.isLoading = false;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'feed') {
      this.showSuggestions = true;
      this.loadFeeds();
    } else if (tab === 'notifications') {
      this.loadNotifications();
    } else if (tab === 'chat') {
      // Load following list for chat search if not already loaded
      if (this.followingList.length === 0) {
        this.loadFollowing();
      }
      // Load previous chat contacts
      this.loadChatContacts();
      // Set up periodic refresh for unread counts
      this.startUnreadCountRefresh();
    } else {
      // Stop periodic refresh when leaving chat tab
      this.stopUnreadCountRefresh();
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  editProfile() {
    this.isEditingProfile = true;
    this.editBio = this.userProfile?.bio || '';
  }

  saveProfile() {
    console.log('Save profile called');
    console.log('Selected profile picture:', this.selectedProfilePicture);
    console.log('Edit bio:', this.editBio);
    
    if (this.selectedProfilePicture) {
      // Upload photo first using the proper file upload endpoint
      console.log('Uploading profile photo...');
      this.profileService.uploadProfilePhoto(this.selectedProfilePicture).subscribe({
        next: (response) => {
          console.log('Photo upload successful:', response);
          // Then update bio if changed
          this.updateBioIfNeeded();
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          alert('Failed to upload photo: ' + (error.error?.error || error.message));
        }
      });
    } else {
      // Just update bio if no photo selected
      this.updateBioIfNeeded();
    }
  }
  
  updateBioIfNeeded() {
    if (this.editBio !== (this.userProfile?.bio || '')) {
      const updates = { bio: this.editBio };
      this.updateProfile(updates);
    } else {
      // No changes, just close edit mode
      this.isEditingProfile = false;
      this.selectedProfilePicture = null;
      this.loadUserProfile(); // Refresh to show any photo changes
    }
  }
  
  updateProfile(updates: any) {
    console.log('Updating profile with:', updates);
    this.profileService.updateProfile(updates).subscribe({
      next: (updatedUser) => {
        console.log('Profile updated successfully:', updatedUser);
        this.loadUserProfile(); // Reload profile data
        this.isEditingProfile = false;
        this.selectedProfilePicture = null;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        console.error('Error details:', error.error);
        alert('Failed to update profile: ' + (error.error?.error || error.message));
      }
    });
  }

  cancelEdit() {
    this.isEditingProfile = false;
    this.editBio = '';
    this.selectedProfilePicture = null;
  }
  
  onProfilePictureSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedProfilePicture = file;
    }
  }

  createPost() {
    if (this.newPostContent.trim()) {
      if (this.selectedFile) {
        const formData = new FormData();
        formData.append('content', this.newPostContent);
        formData.append('file', this.selectedFile);
        
        this.postService.createPostWithFile(formData).subscribe({
          next: (response) => {
            this.resetPostForm();
          },
          error: (error) => {
            // Handle error
          }
        });
      } else {
        const postData = {
          content: this.newPostContent,
          imageUrl: ''
        };
        
        this.postService.createPost(postData).subscribe({
          next: (response) => {
            this.resetPostForm();
          },
          error: (error) => {
            // Handle error
          }
        });
      }
    }
  }
  
  resetPostForm() {
    this.newPostContent = '';
    this.selectedFile = null;
    this.selectedFileType = '';
    this.selectedFilePreview = null;
    this.postVisibility = 'public';
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    this.setActiveTab('feed');
    setTimeout(() => {
      this.loadFeeds();
      this.loadUserProfile();
    }, 500);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      if (file.type.startsWith('image/')) {
        this.selectedFileType = 'image';
      } else if (file.type.startsWith('video/')) {
        this.selectedFileType = 'video';
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedFilePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  likePost(post: any) {
    this.postService.toggleLike(post.id).subscribe({
      next: (response) => {
        post.likesCount = response.likesCount;
        post.isLiked = response.isLiked;
      },
      error: (error) => {
        // Handle error
      }
    });
  }

  commentPost(post: any) {
    this.showComments[post.id] = !this.showComments[post.id];
    if (!post.commentsList) {
      post.commentsList = [];
    }
    if (this.showComments[post.id]) {
      this.postService.getComments(post.id).subscribe({
        next: (comments) => {
          post.commentsList = comments.map(c => ({
            ...c,
            showReplies: false,
            showReplyForm: false,
            replyText: '',
            replies: c.replies || []
          }));
        },
        error: (error) => {
          // Handle error
        }
      });
    }
  }

  sharePost(post: any) {
    const shareData = {
      title: 'RevHub Post',
      text: `Check out this post by ${post.author.username}: ${post.content}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).then(() => {
        this.postService.sharePost(post.id).subscribe({
          next: (response) => {
            post.sharesCount = response.sharesCount;
          },
          error: (error) => {
            // Handle error
          }
        });
      }).catch((error) => {
        // Handle error
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      const text = `Check out this post by ${post.author.username}: ${post.content}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
      
      this.postService.sharePost(post.id).subscribe({
        next: (response) => {
          post.sharesCount = response.sharesCount;
        },
        error: (error) => {
          console.error('Error updating share count:', error);
        }
      });
    }
  }

  fallbackShare(post: any) {
    const text = `Check out this post by ${post.author}: ${post.content}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    post.shares += 1;
  }

  formatPostContent(content: string): string {
    return content
      .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  }

  addComment(post: any) {
    if (this.newComment.trim()) {
      this.postService.addComment(post.id, this.newComment).subscribe({
        next: (response) => {
          if (!post.commentsList) {
            post.commentsList = [];
          }
          response.showReplies = false;
          response.showReplyForm = false;
          response.replyText = '';
          response.replies = response.replies || [];
          post.commentsList.push(response);
          post.commentsCount = post.commentsList.length;
          this.newComment = '';
        },
        error: (error) => {
          // Handle error
        }
      });
    }
  }
  
  toggleCommentReplies(postId: number, commentIndex: number) {
    const post = this.posts.find(p => p.id === postId);
    if (post && post.commentsList[commentIndex]) {
      const comment = post.commentsList[commentIndex];
      comment.showReplyForm = !comment.showReplyForm;
      if (!comment.showReplyForm) {
        comment.replyText = '';
      }
    }
  }
  
  toggleRepliesVisibility(postId: number, commentIndex: number) {
    const post = this.posts.find(p => p.id === postId);
    if (post && post.commentsList[commentIndex]) {
      post.commentsList[commentIndex].showReplies = !post.commentsList[commentIndex].showReplies;
    }
  }
  
  addCommentReply(post: any, commentIndex: number) {
    const comment = post.commentsList[commentIndex];
    if (comment.replyText?.trim()) {
      this.postService.addReply(comment.id, comment.replyText).subscribe({
        next: (reply) => {
          if (!comment.replies) {
            comment.replies = [];
          }
          comment.replies.push(reply);
          comment.replyText = '';
          comment.showReplyForm = false;
          comment.showReplies = true;
        },
        error: (error) => {
          console.error('Error adding reply:', error);
        }
      });
    }
  }
  
  cancelCommentReply(postId: number, commentIndex: number) {
    const post = this.posts.find(p => p.id === postId);
    if (post && post.commentsList[commentIndex]) {
      post.commentsList[commentIndex].showReplyForm = false;
      post.commentsList[commentIndex].replyText = '';
    }
  }

  deleteComment(post: any, commentId: number) {
    this.commentToDelete = { post, commentId };
    this.showDeleteCommentConfirm = true;
  }

  confirmDeleteComment() {
    if (this.commentToDelete) {
      const { post, commentId } = this.commentToDelete;
      this.postService.deleteComment(post.id, commentId).subscribe({
        next: (response) => {
          this.postService.getComments(post.id).subscribe({
            next: (comments) => {
              post.commentsList = comments;
              post.commentsCount = comments.length;
            },
            error: (error) => {
              // Handle error
            }
          });
          this.showDeleteCommentConfirm = false;
          this.commentToDelete = null;
        },
        error: (error) => {
          this.showDeleteCommentConfirm = false;
          this.commentToDelete = null;
        }
      });
    }
  }

  cancelDeleteComment() {
    this.showDeleteCommentConfirm = false;
    this.commentToDelete = null;
  }

  canDeleteComment(comment: any, post: any): boolean {
    return comment.author?.username === this.currentUser?.username || post.author?.username === this.currentUser?.username;
  }

  replyToComment(post: any, comment: any) {
    this.replyingTo = { postId: post.id, commentId: comment.id };
  }

  addReply(post: any, parentComment: any) {
    if (this.replyContent.trim()) {
      const reply = {
        id: Date.now(),
        author: this.profileName,
        content: this.replyContent,
        timestamp: 'Just now',
        isReply: true,
        parentId: parentComment.id
      };
      if (!parentComment.replies) {
        parentComment.replies = [];
      }
      parentComment.replies.push(reply);
      this.replyContent = '';
      this.replyingTo = null;
    }
  }

  cancelReply() {
    this.replyingTo = null;
    this.replyContent = '';
  }



  followUser(user: any) {
    this.profileService.followUser(user.username).subscribe({
      next: (response) => {
        console.log('Follow success:', response.message);
        if (response.message.includes('request sent')) {
          user.followStatus = 'PENDING';
        } else {
          user.followStatus = 'ACCEPTED';
        }
        this.loadUserProfile();
        // Remove user from suggestions after following
        this.suggestedUsers = this.suggestedUsers.filter(u => u.username !== user.username);
      },
      error: (error) => {
        console.error('Error following user:', error);
      }
    });
  }
  
  cancelFollowRequest(user: any) {
    this.profileService.cancelFollowRequest(user.username).subscribe({
      next: (response) => {
        console.log(response.message);
        user.followStatus = 'NOT_FOLLOWING';
        this.loadUserProfile();
        // Update suggested users follow status
        this.updateSuggestedUserStatus(user.username, 'NOT_FOLLOWING');
      },
      error: (error) => {
        console.error('Error cancelling follow request:', error);
        // Fallback: still update UI to prevent stuck state
        user.followStatus = 'NOT_FOLLOWING';
        this.updateSuggestedUserStatus(user.username, 'NOT_FOLLOWING');
      }
    });
  }

  followFromList(user: any) {
    this.profileService.followUser(user.username).subscribe({
      next: (response) => {
        console.log(response.message);
        user.followStatus = 'ACCEPTED';
        this.loadUserProfile();
      },
      error: (error) => {
        console.error('Error following user:', error);
      }
    });
  }

  unfollowUser(user: any) {
    console.log('Attempting to unfollow user:', user.username);
    this.profileService.unfollowUser(user.username).subscribe({
      next: (response) => {
        console.log('Unfollow success:', response.message);
        user.followStatus = 'NOT_FOLLOWING';
        this.loadUserProfile();
        // Refresh following list if currently displayed
        if (this.showFollowingList) {
          this.loadFollowing();
        }
        // Update suggested users follow status
        this.updateSuggestedUserStatus(user.username, 'NOT_FOLLOWING');
      },
      error: (error) => {
        console.error('Error unfollowing user:', error);
        console.error('Error details:', error.error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
      }
    });
  }

  isFollowing(user: any): boolean {
    return user.followStatus === 'ACCEPTED';
  }

  closeSuggestions() {
    this.showSuggestions = false;
  }

  selectChat(contact: User) {
    this.selectedChat = contact.username;
    this.loadConversation(contact.username);
    
    // Immediately reset UI count for better UX
    this.unreadCounts[contact.username] = 0;
    
    // Mark messages as read in backend
    this.chatService.markAsRead(contact.username).subscribe({
      next: () => {
        console.log(`Successfully marked messages as read for ${contact.username}`);
      },
      error: (error) => {
        console.error(`Error marking messages as read for ${contact.username}:`, error);
        console.error('Error details:', error);
        // Refresh counts to get actual state from backend
        setTimeout(() => {
          this.refreshUnreadCounts();
        }, 1000);
      }
    });
  }
  
  loadConversation(username: string) {
    this.chatService.getConversation(username).subscribe({
      next: (messages) => {
        this.messages[username] = messages.map(msg => ({
          sender: msg.senderUsername,
          content: msg.content,
          timestamp: this.formatDateTime(msg.timestamp)
        }));
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
        this.messages[username] = [];
      }
    });
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedChat) {
      this.chatService.sendMessage(this.selectedChat, this.newMessage).subscribe({
        next: (message) => {
          if (!this.messages[this.selectedChat!]) {
            this.messages[this.selectedChat!] = [];
          }
          this.messages[this.selectedChat!].push({
            sender: message.senderUsername,
            content: message.content,
            timestamp: this.formatDateTime(message.timestamp)
          });
          this.newMessage = '';
          setTimeout(() => this.scrollToBottom(), 100);
          
          // Move contact to top of list
          this.moveContactToTop(this.selectedChat!);
          
          // Refresh unread counts for all contacts
          setTimeout(() => {
            this.refreshUnreadCounts();
          }, 500);
        },
        error: (error) => {
          console.error('Error sending message:', error);
        }
      });
    }
  }

  backToContacts() {
    this.selectedChat = null;
  }

  get userPosts() {
    return this.userPostsData.length > 0 ? this.userPostsData : this.posts.filter(post => post.author === this.profileName);
  }

  searchQuery = '';
  searchResults: any[] = [];
  isSearching = false;
  searchActiveTab = 'users';
  showFollowersList = false;
  showFollowingList = false;
  followersList: User[] = [];
  followingList: User[] = [];
  suggestedUsers: any[] = [];
  showSuggestions = true;
  showDeleteConfirm = false;
  postToDelete: any = null;
  showDeleteCommentConfirm = false;
  commentToDelete: { post: any, commentId: number } | null = null;
  notifications: Notification[] = [];
  unreadNotificationCount = 0;
  profileActiveTab = 'photos';
  selectedPost: any = null;
  
  loadUserProfile() {
    if (this.currentUser?.username) {
      this.profileService.getProfile(this.currentUser.username).subscribe({
        next: (profile) => {
          this.userProfile = profile;
          this.followersCount = profile.followersCount || 0;
          this.followingCount = profile.followingCount || 0;
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          if (error.status === 404) {
            console.log('User not found - redirecting to registration');
            // User doesn't exist, clear session and redirect
            this.authService.logout();
            window.location.href = '/auth';
          }
        }
      });
      
      // Load user posts
      this.profileService.getUserPosts(this.currentUser.username).subscribe({
        next: (posts) => {
          this.userPostsData = posts;
        },
        error: (error) => {
          console.error('Error loading user posts:', error);
          if (error.status === 404) {
            this.userPostsData = [];
          }
        }
      });
    }
  }
  
  onSearchInput() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    
    this.isSearching = true;
    this.performSearch();
  }
  
  performSearch() {
    const query = this.searchQuery.trim();
    if (!query) return;
    
    // Search both users and posts
    Promise.all([
      this.profileService.searchUsers(query).toPromise(),
      this.postService.searchPosts(query).toPromise()
    ]).then(([users, posts]) => {
      this.searchResults = [
        ...(users || []).map(user => ({ ...user, type: 'user' })),
        ...(posts || []).map(post => ({ ...post, type: 'post' }))
      ];
      this.isSearching = false;
    }).catch(error => {
      console.error('Search error:', error);
      this.searchResults = [];
      this.isSearching = false;
    });
  }

  deletePost(post: any) {
    this.posts = this.posts.filter(p => p.id !== post.id);
    this.feedService.deletePost(post.id);
  }

  canDeletePost(post: any): boolean {
    return post.author === this.profileName;
  }

  editingPost: any = null;
  editPostContent = '';
  editSelectedFile: File | null = null;

  editPost(post: any) {
    this.editingPost = post;
    this.editPostContent = post.content;
  }

  editUserPost(post: any) {
    this.editingPost = post;
    this.editPostContent = post.content;
  }

  onEditFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editSelectedFile = file;
    }
  }

  saveEditPost() {
    if (this.editPostContent.trim() && this.editingPost) {
      if (this.editSelectedFile) {
        const formData = new FormData();
        formData.append('content', this.editPostContent);
        formData.append('file', this.editSelectedFile);
        
        this.postService.updatePostWithMedia(this.editingPost.id, formData).subscribe({
          next: (updatedPost) => {
            this.editingPost.content = updatedPost.content;
            this.editingPost.imageUrl = updatedPost.imageUrl;
            this.editingPost.mediaType = updatedPost.mediaType;
            this.cancelEditPost();
            this.loadFeeds();
            this.loadUserProfile();
          },
          error: (error) => {
            console.error('Error updating post with media:', error);
          }
        });
      } else {
        this.postService.updatePost(this.editingPost.id, this.editPostContent).subscribe({
          next: (updatedPost) => {
            this.editingPost.content = updatedPost.content;
            this.cancelEditPost();
            this.loadFeeds();
            this.loadUserProfile();
          },
          error: (error) => {
            console.error('Error updating post:', error);
          }
        });
      }
    }
  }

  cancelEditPost() {
    this.editingPost = null;
    this.editPostContent = '';
    this.editSelectedFile = null;
  }

  get postsCount() {
    return this.userPosts.length;
  }
  
  deleteUserPost(post: any) {
    this.postToDelete = post;
    this.showDeleteConfirm = true;
  }

  confirmDelete() {
    if (this.postToDelete) {
      const postId = this.postToDelete.id;
      
      // Immediately update UI
      this.userPostsData = this.userPostsData.filter(p => p.id !== postId);
      this.posts = this.posts.filter(p => p.id !== postId);
      this.showDeleteConfirm = false;
      this.postToDelete = null;
      
      // Then call backend
      this.postService.deletePost(postId).subscribe({
        next: () => {
          // Post deleted successfully
        },
        error: (error) => {
          this.loadFeeds();
          this.loadUserProfile();
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.postToDelete = null;
  }

  showFollowers() {
    this.showFollowersList = true;
    this.showFollowingList = false;
    this.loadFollowers();
  }

  showFollowing() {
    this.showFollowingList = true;
    this.showFollowersList = false;
    this.loadFollowing();
  }
  
  loadFollowers() {
    if (this.currentUser?.username) {
      console.log('Loading followers for user:', this.currentUser.username);
      this.profileService.getFollowers(this.currentUser.username).subscribe({
        next: (followers) => {
          console.log('Followers loaded successfully:', followers);
          this.followersList = followers;
        },
        error: (error) => {
          console.error('Error loading followers:', error);
          this.followersList = [];
        }
      });
    } else {
      console.log('No current user found for loading followers');
    }
  }
  
  loadFollowing() {
    if (this.currentUser?.username) {
      console.log('Loading following for user:', this.currentUser.username);
      this.profileService.getFollowing(this.currentUser.username).subscribe({
        next: (following) => {
          console.log('Following loaded successfully:', following);
          this.followingList = following;
        },
        error: (error) => {
          console.error('Error loading following:', error);
          this.followingList = [];
        }
      });
    } else {
      console.log('No current user found for loading following');
    }
  }

  hideUserLists() {
    this.showFollowersList = false;
    this.showFollowingList = false;
  }

  togglePrivacy() {
    if (this.userProfile) {
      const newPrivacySetting = !this.userProfile.isPrivate;
      this.profileService.updateProfile({ isPrivate: newPrivacySetting.toString() }).subscribe({
        next: (updatedUser) => {
          if (this.userProfile) {
            this.userProfile.isPrivate = newPrivacySetting;
          }
        },
        error: (error) => {
          console.error('Error updating privacy setting:', error);
        }
      });
    }
  }

  checkForMentions(content: string) {
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      // TODO: Implement mention notifications via backend API
      console.log('Mentions found:', mentions);
    }
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        console.log('Notifications loaded successfully:', notifications);
        this.notifications = notifications;
      },
      error: (error) => {
        console.error('Error loading notifications:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        this.notifications = [];
      }
    });
    
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        console.log('Unread count loaded:', count);
        this.unreadNotificationCount = count;
      },
      error: (error) => {
        console.error('Error loading unread count:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
        this.unreadNotificationCount = 0;
      }
    });
  }
  
  markNotificationAsRead(notification: Notification) {
    if (!notification.readStatus) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.readStatus = true;
          this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    }
  }
  
  acceptFollowRequest(notification: Notification) {
    if (notification.followRequestId) {
      this.notificationService.acceptFollowRequest(notification.followRequestId).subscribe({
        next: () => {
          console.log('Follow request accepted successfully');
          // Remove notification from list immediately
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
          // Add delay to ensure backend processing is complete
          setTimeout(() => {
            this.loadUserProfile();
            this.loadSuggestedUsers();
            if (this.showFollowersList) {
              this.loadFollowers();
            }
          }, 500);
        },
        error: (error) => {
          console.error('Error accepting follow request:', error);
        }
      });
    }
  }
  
  rejectFollowRequest(notification: Notification) {
    if (notification.followRequestId) {
      this.notificationService.rejectFollowRequest(notification.followRequestId).subscribe({
        next: () => {
          console.log('Follow request rejected successfully');
          // Remove notification from list immediately
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
          this.loadUserProfile();
        },
        error: (error) => {
          console.error('Error rejecting follow request:', error);
        }
      });
    }
  }
  
  loadSuggestedUsers() {
    this.profileService.getAllUsers().subscribe({
      next: (users) => {
        const filteredUsers = users.filter(user => user.username !== this.currentUser?.username);
        
        // Set default follow status and load actual status if authenticated
        const usersWithStatus: any[] = [];
        let processedCount = 0;
        
        filteredUsers.forEach(user => {
          user.followStatus = 'NOT_FOLLOWING';
          
          // Get profile data including followers count
          this.profileService.getProfile(user.username).subscribe({
            next: (profile) => {
              user.followersCount = profile.followersCount;
            },
            error: () => {
              user.followersCount = 0;
            }
          });
          
          if (this.currentUser) {
            this.profileService.getFollowStatus(user.username).subscribe({
              next: (response) => {
                user.followStatus = response.status;
                processedCount++;
                
                // Only add users who are not followed or pending
                if (user.followStatus === 'NOT_FOLLOWING') {
                  usersWithStatus.push(user);
                }
                
                // Update suggestions when all users are processed
                if (processedCount === filteredUsers.length) {
                  this.suggestedUsers = usersWithStatus.slice(0, 5);
                }
              },
              error: (error) => {
                user.followStatus = 'NOT_FOLLOWING';
                processedCount++;
                usersWithStatus.push(user);
                
                if (processedCount === filteredUsers.length) {
                  this.suggestedUsers = usersWithStatus.slice(0, 5);
                }
              }
            });
          } else {
            usersWithStatus.push(user);
          }
        });
        
        if (!this.currentUser) {
          // Get followers count for each user when not authenticated
          filteredUsers.forEach(user => {
            this.profileService.getProfile(user.username).subscribe({
              next: (profile) => {
                user.followersCount = profile.followersCount;
              },
              error: () => {
                user.followersCount = 0;
              }
            });
          });
          this.suggestedUsers = usersWithStatus.slice(0, 5);
        }
      },
      error: (error) => {
        console.error('Error loading suggested users:', error);
      }
    });
  }
  
  isVideo(url: string): boolean {
    if (!url) return false;
    return url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov') || (url.startsWith('blob:') && this.selectedFileType === 'video');
  }
  
  isImage(url: string): boolean {
    if (!url) return false;
    return url.startsWith('data:image/') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp') || (url.startsWith('blob:') && this.selectedFileType === 'image');
  }
  
  removeFollower(follower: User) {
    console.log('Attempting to remove follower:', follower.username);
    this.profileService.removeFollower(follower.username).subscribe({
      next: (response) => {
        console.log('Follower removed successfully:', response.message);
        this.loadFollowers();
        this.loadUserProfile();
      },
      error: (error) => {
        console.error('Error removing follower:', error);
        console.error('Error details:', error.error);
        console.error('Status:', error.status);
        console.error('URL:', error.url);
      }
    });
  }
  
  updateSuggestedUserStatus(username: string, status: string) {
    const suggestedUser = this.suggestedUsers.find(u => u.username === username);
    if (suggestedUser) {
      suggestedUser.followStatus = status;
    }
  }
  
  getUserResults() {
    return this.searchResults.filter(result => 
      result.type === 'user' && result.username !== this.currentUser?.username
    );
  }
  
  getPostResults() {
    return this.searchResults.filter(result => result.type === 'post');
  }
  
  setSearchTab(tab: string) {
    this.searchActiveTab = tab;
  }
  
  dismissNotification(notification: Notification) {
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
        if (!notification.readStatus) {
          this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
        }
      },
      error: (error) => {
        // If status is 200, treat as success despite error format
        if (error.status === 200) {
          this.notifications = this.notifications.filter(n => n.id !== notification.id);
          if (!notification.readStatus) {
            this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
          }
        } else {
          console.error('Error deleting notification:', error);
        }
      }
    });
  }
  
  handleNotificationClick(notification: Notification) {
    this.markNotificationAsRead(notification);
    
    if (notification.type === 'MESSAGE' && notification.fromUsername) {
      // Navigate to chat tab and open conversation
      this.setActiveTab('chat');
      setTimeout(() => {
        this.selectedChat = notification.fromUsername!;
        this.loadConversation(notification.fromUsername!);
        this.unreadCounts[notification.fromUsername!] = 0;
      }, 100);
    } else if (notification.type === 'MENTION' && notification.postId) {
      // Navigate to feed and show the post with comments
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
      this.postService.getComments(postId).subscribe({
        next: (comments) => {
          post.commentsList = comments;
          setTimeout(() => {
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
              postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        },
        error: (error) => console.error('Error loading comments:', error)
      });
    } else {
      this.loadFeeds();
      setTimeout(() => this.scrollToPost(postId), 500);
    }
  }
  
  refreshUnreadCounts() {
    // Use individual calls since bulk endpoint might not be working
    this.contactUsernames.forEach(username => {
      this.chatService.getUnreadCount(username).subscribe({
        next: (count) => {
          this.unreadCounts[username] = count;
          console.log(`Unread count for ${username}: ${count}`);
        },
        error: (err) => {
          console.error(`Error getting unread count for ${username}:`, err);
          this.unreadCounts[username] = 0;
        }
      });
    });
    console.log('Current unread counts after refresh:', this.unreadCounts);
  }
  
  onChatSearchInput() {
    if (!this.chatSearchQuery.trim()) {
      this.chatSearchResults = [];
      return;
    }
    
    // Search from following list
    this.chatSearchResults = this.followingList.filter(user => 
      user.username.toLowerCase().includes(this.chatSearchQuery.toLowerCase())
    );
  }
  
  startChat(user: any) {
    this.selectedChat = user.username;
    this.chatSearchQuery = '';
    this.chatSearchResults = [];
    this.loadConversation(user.username);
    // Move contact to top
    this.moveContactToTop(user.username);
  }
  
  loadChatContacts() {
    this.chatService.getChatContacts().subscribe({
      next: (contactUsernames) => {
        console.log('Chat contacts loaded:', contactUsernames);
        // Filter out current user from contacts
        this.contactUsernames = contactUsernames.filter(contact => contact !== this.currentUser?.username);
        
        // Load profile data for each contact
        this.contacts = [];
        this.contactUsernames.forEach(username => {
          this.profileService.getProfile(username).subscribe({
            next: (profile) => {
              this.contacts.push(profile);
            },
            error: (error) => {
              console.error(`Error loading profile for ${username}:`, error);
              // Add a basic user object if profile loading fails
              this.contacts.push({
                id: 0,
                username: username,
                email: '',
                createdDate: '',
                profilePicture: undefined
              });
            }
          });
        });
        
        this.refreshUnreadCounts();
      },
      error: (error) => {
        console.error('Error loading chat contacts:', error);
      }
    });
  }

  formatDateTime(timestamp: string): string {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${month}/${day}/${year} ${displayHours}:${minutes} ${ampm}`;
  }

  scrollToBottom() {
    const messagesContainer = document.querySelector('.chat-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  private unreadCountInterval: any;

  startUnreadCountRefresh() {
    this.stopUnreadCountRefresh();
    this.unreadCountInterval = setInterval(() => {
      if (this.activeTab === 'chat') {
        this.refreshUnreadCounts();
      }
    }, 3000); // Refresh every 3 seconds for better real-time experience
  }

  stopUnreadCountRefresh() {
    if (this.unreadCountInterval) {
      clearInterval(this.unreadCountInterval);
      this.unreadCountInterval = null;
    }
  }

  private globalUnreadInterval: any;

  startGlobalUnreadCountRefresh() {
    // Load contacts and refresh counts immediately
    this.chatService.getChatContacts().subscribe({
      next: (contactUsernames) => {
        this.contactUsernames = contactUsernames.filter(contact => contact !== this.currentUser?.username);
        this.refreshUnreadCounts();
      },
      error: (error) => console.error('Error loading contacts:', error)
    });

    // Set up global refresh every 5 seconds
    this.globalUnreadInterval = setInterval(() => {
      if (this.contactUsernames.length > 0) {
        this.refreshUnreadCounts();
      }
    }, 5000);
  }

  getTotalUnreadCount(): number {
    return Object.values(this.unreadCounts).reduce((total, count) => total + count, 0);
  }
  
  simulateUnreadMessages() {
    // Simulate unread messages for testing
    this.unreadCounts = {
      'akram': 3,
      'BadBoy': 2,
      'Akshitha': 1
    };
    console.log('Simulated unread messages:', this.unreadCounts);
  }
  
  moveContactToTop(username: string) {
    // Remove from current position in contactUsernames
    this.contactUsernames = this.contactUsernames.filter(contact => contact !== username);
    // Add to top of contactUsernames
    this.contactUsernames.unshift(username);
    
    // Also reorder the contacts array
    const contactUser = this.contacts.find(contact => contact.username === username);
    if (contactUser) {
      this.contacts = this.contacts.filter(contact => contact.username !== username);
      this.contacts.unshift(contactUser);
    }
  }
  
  clearAllUnreadCounts() {
    this.contactUsernames.forEach(username => {
      this.unreadCounts[username] = 0;
    });
    console.log('Manually cleared all unread counts');
  }
  
  onCommentChange(event: any) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const cursorPos = input.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const hashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (hashIndex > atIndex && hashIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(hashIndex + 1);
      if (!searchTerm.includes(' ')) {
        this.authService.getHashtagSuggestions(searchTerm).subscribe({
          next: (hashtags) => {
            this.commentHashtagSuggestions = hashtags || [];
            this.showCommentHashtagSuggestions = this.commentHashtagSuggestions.length > 0;
          },
          error: () => this.showCommentHashtagSuggestions = false
        });
        this.showCommentMentionSuggestions = false;
        return;
      }
    }
    
    if (atIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      if (!searchTerm.includes(' ')) {
        this.authService.searchUsers(searchTerm).subscribe({
          next: (users) => {
            this.commentMentionSuggestions = users || [];
            this.showCommentMentionSuggestions = this.commentMentionSuggestions.length > 0;
          },
          error: () => {
            this.showCommentMentionSuggestions = false;
            this.commentMentionSuggestions = [];
          }
        });
        this.showCommentHashtagSuggestions = false;
      } else {
        this.showCommentMentionSuggestions = false;
      }
    } else {
      this.showCommentMentionSuggestions = false;
      this.showCommentHashtagSuggestions = false;
    }
  }
  
  selectCommentMention(user: any) {
    const atIndex = this.newComment.lastIndexOf('@');
    if (atIndex !== -1) {
      this.newComment = this.newComment.substring(0, atIndex) + '@' + user.username + ' ';
    }
    this.showCommentMentionSuggestions = false;
    this.commentMentionSuggestions = [];
  }
  
  selectCommentHashtag(hashtag: string) {
    const hashIndex = this.newComment.lastIndexOf('#');
    if (hashIndex !== -1) {
      this.newComment = this.newComment.substring(0, hashIndex) + '#' + hashtag + ' ';
    }
    this.showCommentHashtagSuggestions = false;
  }
  
  onPostContentChange(event: any) {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const hashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (hashIndex > atIndex && hashIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(hashIndex + 1);
      if (!searchTerm.includes(' ')) {
        this.authService.getHashtagSuggestions(searchTerm).subscribe({
          next: (hashtags) => {
            this.hashtagSuggestions = hashtags || [];
            this.showHashtagSuggestions = this.hashtagSuggestions.length > 0;
          },
          error: () => this.showHashtagSuggestions = false
        });
        this.showPostMentionSuggestions = false;
        return;
      }
    }
    
    if (atIndex !== -1) {
      const searchTerm = textBeforeCursor.substring(atIndex + 1);
      if (!searchTerm.includes(' ')) {
        this.authService.searchUsers(searchTerm).subscribe({
          next: (users) => {
            this.postMentionSuggestions = users || [];
            this.showPostMentionSuggestions = this.postMentionSuggestions.length > 0;
          },
          error: () => {
            this.showPostMentionSuggestions = false;
            this.postMentionSuggestions = [];
          }
        });
        this.showHashtagSuggestions = false;
      } else {
        this.showPostMentionSuggestions = false;
      }
    } else {
      this.showPostMentionSuggestions = false;
      this.showHashtagSuggestions = false;
    }
  }
  
  selectPostMention(user: any) {
    const atIndex = this.newPostContent.lastIndexOf('@');
    if (atIndex !== -1) {
      this.newPostContent = this.newPostContent.substring(0, atIndex) + '@' + user.username + ' ';
    }
    this.showPostMentionSuggestions = false;
    this.postMentionSuggestions = [];
  }
  
  selectHashtag(hashtag: string) {
    const hashIndex = this.newPostContent.lastIndexOf('#');
    if (hashIndex !== -1) {
      this.newPostContent = this.newPostContent.substring(0, hashIndex) + '#' + hashtag + ' ';
    }
    this.showHashtagSuggestions = false;
  }
  
  onSearchInputChange(event: any) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    if (value.startsWith('#')) {
      const searchTerm = value.substring(1);
      this.authService.getHashtagSuggestions(searchTerm).subscribe({
        next: (hashtags) => {
          this.searchHashtagSuggestions = hashtags || [];
          this.showSearchHashtagSuggestions = this.searchHashtagSuggestions.length > 0;
        },
        error: () => this.showSearchHashtagSuggestions = false
      });
      this.showSearchMentionSuggestions = false;
    } else if (value.startsWith('@')) {
      const searchTerm = value.substring(1);
      this.authService.searchUsers(searchTerm).subscribe({
        next: (users) => {
          this.searchMentionSuggestions = users || [];
          this.showSearchMentionSuggestions = this.searchMentionSuggestions.length > 0;
        },
        error: () => {
          this.showSearchMentionSuggestions = false;
          this.searchMentionSuggestions = [];
        }
      });
      this.showSearchHashtagSuggestions = false;
    } else {
      this.showSearchMentionSuggestions = false;
      this.showSearchHashtagSuggestions = false;
      this.onSearchInput();
    }
  }
  
  selectSearchMention(user: any) {
    this.searchQuery = '@' + user.username;
    this.showSearchMentionSuggestions = false;
    this.searchMentionSuggestions = [];
    this.onSearchInput();
  }
  
  selectSearchHashtag(hashtag: string) {
    this.searchQuery = '#' + hashtag;
    this.showSearchHashtagSuggestions = false;
    this.onSearchInput();
  }

  goToProfile(username: string) {
    if (username) {
      this.router.navigate(['/profile', username]);
    }
  }

  setProfileActiveTab(tab: string) {
    this.profileActiveTab = tab;
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

  getProfilePhotoPosts() {
    return this.userPosts.filter(post => 
      post.imageUrl && (post.mediaType === 'image' || (!post.mediaType && this.isImage(post.imageUrl)))
    );
  }

  getProfileVideoPosts() {
    return this.userPosts.filter(post => 
      post.imageUrl && (post.mediaType === 'video' || (!post.mediaType && this.isVideo(post.imageUrl)))
    );
  }

  getProfileTextPosts() {
    return this.userPosts.filter(post => !post.imageUrl);
  }

  getProfileFilteredPosts() {
    switch(this.profileActiveTab) {
      case 'photos': return this.getProfilePhotoPosts();
      case 'videos': return this.getProfileVideoPosts();
      case 'text': return this.getProfileTextPosts();
      default: return this.userPosts;
    }
  }

  openPostModal(post: any) {
    this.selectedPost = post;
  }

  closePostModal() {
    this.selectedPost = null;
  }
}