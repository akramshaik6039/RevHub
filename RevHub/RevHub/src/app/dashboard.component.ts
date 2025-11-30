import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
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
  posts: any[] = [
    {
      id: 1,
      author: 'Akram',
      content: 'This is a sample post content.',
      timestamp: '2 hours ago',
      likes: 5,
      comments: 2,
      shares: 1,
      liked: false,
      media: null,
      mediaType: '',
      commentsList: [
        { id: 1, author: 'Karthik', content: 'Great post!', timestamp: '1 hour ago' },
        { id: 2, author: 'Akram', content: 'Thanks!', timestamp: '30 min ago' }
      ]
    }
  ];
  
  selectedFile: File | null = null;
  selectedFileType = '';
  selectedFilePreview: string | null = null;
  showComments: { [key: number]: boolean } = {};
  newComment = '';
  selectedPostId: number | null = null;
  replyingTo: { postId: string, commentId: number } | null = null;
  replyContent = '';
  postVisibility = 'public';
  
  selectedChat: string | null = null;
  newMessage = '';
  contacts: string[] = [];
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
    private notificationService: NotificationService
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
    
    this.loadFeeds();
    this.loadSuggestedUsers();
    // Load MongoDB notifications
    if (this.currentUser) {
      this.loadNotifications();
    }
  }

  loadFeeds() {
    this.isLoading = true;
    this.postService.getPosts(0, 10).subscribe({
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
      // Refresh unread counts
      setTimeout(() => this.refreshUnreadCounts(), 500);
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
    const updates: any = {};
    
    if (this.editBio !== (this.userProfile?.bio || '')) {
      updates.bio = this.editBio;
    }
    
    if (this.selectedProfilePicture) {
      // Convert image to base64 for simple storage
      const reader = new FileReader();
      reader.onload = () => {
        updates.profilePicture = reader.result as string;
        this.updateProfile(updates);
      };
      reader.readAsDataURL(this.selectedProfilePicture);
    } else if (Object.keys(updates).length > 0) {
      this.updateProfile(updates);
    } else {
      this.isEditingProfile = false;
    }
  }
  
  updateProfile(updates: any) {
    this.profileService.updateProfile(updates).subscribe({
      next: (updatedUser) => {
        this.loadUserProfile(); // Reload profile data
        this.isEditingProfile = false;
        this.selectedProfilePicture = null;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
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
          post.commentsList = comments;
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

  selectChat(contact: string) {
    this.selectedChat = contact;
    this.loadConversation(contact);
    // Mark messages as read and reset unread count
    this.chatService.markAsRead(contact).subscribe();
    this.unreadCounts[contact] = 0;
  }
  
  loadConversation(username: string) {
    this.chatService.getConversation(username).subscribe({
      next: (messages) => {
        this.messages[username] = messages.map(msg => ({
          sender: msg.senderUsername,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }));
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
            timestamp: new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          });
          this.newMessage = '';
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
        }
      });
      
      // Load user posts
      this.profileService.getUserPosts(this.currentUser.username).subscribe({
        next: (posts) => {
          this.userPostsData = posts;
        },
        error: (error) => {
          console.error('Error loading user posts:', error);
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

  editPost(post: any) {
    this.editingPost = post;
    this.editPostContent = post.content;
  }

  saveEditPost() {
    if (this.editPostContent.trim() && this.editingPost) {
      this.editingPost.content = this.editPostContent;
      this.feedService.updatePost(this.editingPost);
      this.cancelEditPost();
    }
  }

  cancelEditPost() {
    this.editingPost = null;
    this.editPostContent = '';
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
        console.error('Error deleting notification:', error);
        // Still remove from UI even if backend fails
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
        if (!notification.readStatus) {
          this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
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
    }
  }
  
  refreshUnreadCounts() {
    this.contacts.forEach(contact => {
      this.chatService.getUnreadCount(contact).subscribe({
        next: (count) => {
          this.unreadCounts[contact] = count;
        },
        error: (error) => {
          this.unreadCounts[contact] = 0;
        }
      });
    });
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
    // Add to contacts if not already there
    if (!this.contacts.includes(user.username)) {
      this.contacts.unshift(user.username);
    }
  }
  
  loadChatContacts() {
    this.chatService.getChatContacts().subscribe({
      next: (contacts) => {
        console.log('Chat contacts loaded:', contacts);
        this.contacts = contacts;
        // Load unread counts for each contact
        contacts.forEach(contact => {
          this.chatService.getUnreadCount(contact).subscribe({
            next: (count) => {
              console.log(`Unread count for ${contact}: ${count}`);
              this.unreadCounts[contact] = count;
            },
            error: (error) => {
              console.error(`Error loading unread count for ${contact}:`, error);
              this.unreadCounts[contact] = 0;
            }
          });
        });
      },
      error: (error) => {
        console.error('Error loading chat contacts:', error);
      }
    });
  }
}