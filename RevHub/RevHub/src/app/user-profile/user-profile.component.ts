import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, User } from '../core/services/profile.service';
import { PostService } from '../core/services/post.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  userPosts: any[] = [];
  isLoading = true;
  currentUser: any = null;
  followersCount = 0;
  followingCount = 0;
  followStatus = 'NOT_FOLLOWING';
  canViewPosts = false;
  showComments: { [key: number]: boolean } = {};
  newComment = '';
  activeTab = 'photos';
  showFeedView = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profileService: ProfileService,
    private postService: PostService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.route.params.subscribe(params => {
      const username = params['username'];
      if (username) {
        this.loadUserProfile(username);
      }
    });
  }

  loadUserProfile(username: string) {
    this.isLoading = true;
    
    this.profileService.getProfile(username).subscribe({
      next: (profile) => {
        this.user = profile;
        this.followersCount = profile.followersCount || 0;
        this.followingCount = profile.followingCount || 0;
        this.loadFollowStatus(username);
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.isLoading = false;
      }
    });
  }

  loadUserPosts(username: string) {
    this.canViewPosts = !this.user?.isPrivate || this.followStatus === 'ACCEPTED' || this.isOwnProfile();
    
    if (this.canViewPosts) {
      this.profileService.getUserPosts(username).subscribe({
        next: (posts) => {
          this.userPosts = posts;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading posts:', error);
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  loadFollowStatus(username: string) {
    if (this.currentUser && this.currentUser.username !== username) {
      this.profileService.getFollowStatus(username).subscribe({
        next: (response) => {
          this.followStatus = response.status;
          this.loadUserPosts(username);
        },
        error: (error) => {
          this.followStatus = 'NOT_FOLLOWING';
          this.loadUserPosts(username);
        }
      });
    } else {
      this.loadUserPosts(username);
    }
  }

  followUser() {
    if (!this.user) return;
    
    this.profileService.followUser(this.user.username).subscribe({
      next: (response) => {
        if (response.message.includes('request sent')) {
          this.followStatus = 'PENDING';
        } else {
          this.followStatus = 'ACCEPTED';
          this.followersCount++;
        }
      },
      error: (error) => {
        console.error('Error following user:', error);
      }
    });
  }

  unfollowUser() {
    if (!this.user) return;
    
    this.profileService.unfollowUser(this.user.username).subscribe({
      next: (response) => {
        this.followStatus = 'NOT_FOLLOWING';
        this.followersCount = Math.max(0, this.followersCount - 1);
      },
      error: (error) => {
        console.error('Error unfollowing user:', error);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  isOwnProfile(): boolean {
    return this.currentUser && this.user && this.currentUser.username === this.user.username;
  }

  isVideo(url: string): boolean {
    if (!url) return false;
    return url.startsWith('data:video/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov');
  }

  isImage(url: string): boolean {
    if (!url) return false;
    return url.startsWith('data:image/') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp');
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  getPhotoPosts() {
    return this.userPosts.filter(post => 
      post.imageUrl && (post.mediaType === 'image' || (!post.mediaType && this.isImage(post.imageUrl)))
    );
  }

  getVideoPosts() {
    return this.userPosts.filter(post => 
      post.imageUrl && (post.mediaType === 'video' || (!post.mediaType && this.isVideo(post.imageUrl)))
    );
  }

  getTextPosts() {
    return this.userPosts.filter(post => !post.imageUrl);
  }

  getFilteredPosts() {
    switch(this.activeTab) {
      case 'photos': return this.getPhotoPosts();
      case 'videos': return this.getVideoPosts();
      case 'text': return this.getTextPosts();
      default: return this.userPosts;
    }
  }

  openFeedView(clickedPost: any) {
    this.showFeedView = true;
    setTimeout(() => {
      const element = document.getElementById('post-' + clickedPost.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  closeFeedView() {
    this.showFeedView = false;
  }

  likePost(post: any) {
    this.postService.toggleLike(post.id).subscribe({
      next: (response) => {
        post.likesCount = response.likesCount;
        post.isLiked = response.isLiked;
      },
      error: (error) => {
        console.error('Error toggling like:', error);
      }
    });
  }

  commentPost(post: any) {
    this.showComments[post.id] = !this.showComments[post.id];
    if (this.showComments[post.id]) {
      this.postService.getComments(post.id).subscribe({
        next: (comments) => {
          post.commentsList = comments;
        },
        error: (error) => {
          console.error('Error loading comments:', error);
        }
      });
    }
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
          console.error('Error adding comment:', error);
        }
      });
    }
  }

  messageUser() {
    if (this.user) {
      this.router.navigate(['/dashboard'], { 
        queryParams: { 
          tab: 'chat', 
          user: this.user.username 
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
            console.error('Error updating share count:', error);
          }
        });
      });
    } else {
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