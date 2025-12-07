import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProfileService, User } from '../../core/services/profile.service';
import { PostService, Post } from '../../core/services/post.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  posts: Post[] = [];
  isLoading = true;
  username: string = '';
  isOwnProfile = false;
  showComments: { [key: number]: boolean } = {};
  newComment = '';
  showDeleteCommentConfirm = false;
  commentToDelete: { post: any, commentId: number } | null = null;
  followStatus: string = 'NOT_FOLLOWING';
  isFollowLoading = false;

  // Edit profile properties
  isEditMode = false;
  editForm = {
    bio: '',
    isPrivate: false
  };
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUpdating = false;

  constructor(
    private profileService: ProfileService,
    private postService: PostService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get username from route or use current user
    this.route.params.subscribe(params => {
      this.username = params['username'] || this.authService.getCurrentUser()?.username;
      if (this.username) {
        this.isOwnProfile = this.username === this.authService.getCurrentUser()?.username;
        this.loadProfile();
        this.loadUserPosts();
        if (!this.isOwnProfile) {
          this.loadFollowStatus();
        }
      }
    });
  }

  loadProfile() {
    this.profileService.getProfile(this.username).subscribe({
      next: (user) => {
        this.user = user;
        this.editForm.bio = user.bio || '';
        this.editForm.isPrivate = user.isPrivate || false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.isLoading = false;
      }
    });
  }

  loadUserPosts() {
    this.profileService.getUserPosts(this.username).subscribe({
      next: (posts) => {
        this.posts = posts;
      },
      error: (error) => {
        console.error('Error loading user posts:', error);
      }
    });
  }

  commentPost(post: any) {
    this.showComments[post.id] = !this.showComments[post.id];
    if (!post.commentsList) {
      post.commentsList = [];
    }
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

  deleteComment(post: any, commentId: number) {
    this.commentToDelete = { post, commentId };
    this.showDeleteCommentConfirm = true;
  }

  confirmDeleteComment() {
    if (this.commentToDelete) {
      const { post, commentId } = this.commentToDelete;
      console.log('Deleting comment:', commentId, 'from post:', post.id);
      this.postService.deleteComment(post.id, commentId).subscribe({
        next: (response) => {
          console.log('Comment deleted successfully:', response);
          this.postService.getComments(post.id).subscribe({
            next: (comments) => {
              post.commentsList = comments;
              post.commentsCount = comments.length;
            },
            error: (error) => {
              console.error('Error reloading comments:', error);
            }
          });
          this.showDeleteCommentConfirm = false;
          this.commentToDelete = null;
        },
        error: (error) => {
          console.error('Error deleting comment:', error);
          console.error('Failed to delete comment:', error.error || error.message);
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
    const currentUser = this.authService.getCurrentUser();
    return comment.author?.username === currentUser?.username || post.author?.username === currentUser?.username;
  }

  loadFollowStatus() {
    this.profileService.getFollowStatus(this.username).subscribe({
      next: (response) => {
        this.followStatus = response.status;
      },
      error: (error) => {
        console.error('Error loading follow status:', error);
      }
    });
  }

  followUser() {
    this.isFollowLoading = true;
    this.profileService.followUser(this.username).subscribe({
      next: (response) => {
        console.log(response.message);
        this.loadFollowStatus();
        this.loadProfile();
        this.isFollowLoading = false;
      },
      error: (error) => {
        console.error('Error following user:', error);
        this.isFollowLoading = false;
      }
    });
  }

  unfollowUser() {
    this.isFollowLoading = true;
    this.profileService.unfollowUser(this.username).subscribe({
      next: (response) => {
        console.log(response.message);
        this.loadFollowStatus();
        this.loadProfile();
        this.isFollowLoading = false;
      },
      error: (error) => {
        console.error('Error unfollowing user:', error);
        this.isFollowLoading = false;
      }
    });
  }

  getFollowButtonText(): string {
    switch (this.followStatus) {
      case 'ACCEPTED':
        return 'Unfollow';
      case 'PENDING':
        return 'Requested';
      default:
        return 'Follow';
    }
  }

  getFollowButtonClass(): string {
    switch (this.followStatus) {
      case 'ACCEPTED':
        return 'btn-outline-danger';
      case 'PENDING':
        return 'btn-outline-warning';
      default:
        return 'btn-primary';
    }
  }

  onFollowButtonClick() {
    if (this.followStatus === 'ACCEPTED') {
      this.unfollowUser();
    } else if (this.followStatus === 'NOT_FOLLOWING') {
      this.followUser();
    }
  }

  // Edit Profile Methods
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      // Reset form when canceling
      this.editForm.bio = this.user?.bio || '';
      this.editForm.isPrivate = this.user?.isPrivate || false;
      this.selectedFile = null;
      this.previewUrl = null;
    }
  }

  onFileSelected(event: any) {
    console.log('File selection event triggered:', event);
    const file = event.target.files[0];
    console.log('Selected file:', file);
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      this.selectedFile = file;
      console.log('File set to selectedFile:', this.selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
        console.log('Preview URL set:', this.previewUrl ? 'Success' : 'Failed');
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
      };
      reader.readAsDataURL(file);
    } else {
      console.log('No file selected');
    }
  }

  updateProfile() {
    console.log('Update profile called');
    console.log('Selected file:', this.selectedFile);
    console.log('Edit form:', this.editForm);
    
    this.isUpdating = true;
    
    if (this.selectedFile) {
      console.log('Uploading photo first...');
      // Upload photo first
      this.profileService.uploadProfilePhoto(this.selectedFile).subscribe({
        next: (response) => {
          console.log('Photo upload response:', response);
          // Update user profile picture immediately
          if (this.user && response.profilePictureUrl) {
            this.user.profilePicture = response.profilePictureUrl;
          }
          // Then update other profile data
          this.updateProfileData();
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          alert('Failed to upload photo: ' + (error.error?.error || error.message));
          this.isUpdating = false;
        }
      });
    } else {
      console.log('No photo to upload, updating profile data only...');
      // Just update profile data
      this.updateProfileData();
    }
  }

  private updateProfileData() {
    const updates = {
      bio: this.editForm.bio,
      isPrivate: this.editForm.isPrivate.toString()
    };

    this.profileService.updateProfile(updates).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.isEditMode = false;
        this.selectedFile = null;
        this.previewUrl = null;
        this.isUpdating = false;
        console.log('Profile updated successfully');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isUpdating = false;
      }
    });
  }

  // Test method for debugging
  testFileUpload() {
    if (this.selectedFile) {
      console.log('Testing file upload with:', this.selectedFile);
      this.profileService.uploadProfilePhoto(this.selectedFile).subscribe({
        next: (response) => {
          console.log('Test upload successful:', response);
          alert('Test upload successful! Response: ' + JSON.stringify(response));
        },
        error: (error) => {
          console.error('Test upload failed:', error);
          alert('Test upload failed: ' + JSON.stringify(error));
        }
      });
    } else {
      alert('No file selected for test');
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