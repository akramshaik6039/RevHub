import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService, PostRequest } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  postData: PostRequest = {
    content: '',
    visibility: 'PUBLIC'
  };
  
  hashtags: string[] = [];
  mentions: string[] = [];
  
  @ViewChild('contentTextarea') contentTextarea!: ElementRef;
  showUserSuggestions = false;
  userSuggestions: any[] = [];
  selectedSuggestionIndex = -1;
  currentMentionStart = -1;
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private postService: PostService,
    private router: Router,
    private authService: AuthService
  ) {}

  onKeyUp(event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const content = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Handle arrow keys for suggestion navigation
    if (this.showUserSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, this.userSuggestions.length - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, 0);
        return;
      }
      if (event.key === 'Enter' && this.selectedSuggestionIndex >= 0) {
        event.preventDefault();
        this.selectUser(this.userSuggestions[this.selectedSuggestionIndex]);
        return;
      }
      if (event.key === 'Escape') {
        this.hideUserSuggestions();
        return;
      }
    }
    
    const beforeCursor = content.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const afterAt = beforeCursor.substring(atIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length >= 0) {
        this.currentMentionStart = atIndex;
        this.searchUsers(afterAt);
      } else {
        this.hideUserSuggestions();
      }
    } else {
      this.hideUserSuggestions();
    }
  }
  
  searchUsers(query: string) {
    if (query === '') {
      this.authService.getFollowers().subscribe({
        next: (followers: any[]) => {
          this.userSuggestions = followers || [];
          this.showUserSuggestions = this.userSuggestions.length > 0;
          this.selectedSuggestionIndex = 0;
        },
        error: (error) => {
          this.hideUserSuggestions();
        }
      });
    } else {
      this.authService.searchFollowers(query).subscribe({
        next: (followers: any[]) => {
          this.userSuggestions = followers || [];
          this.showUserSuggestions = this.userSuggestions.length > 0;
          this.selectedSuggestionIndex = 0;
        },
        error: (error) => {
          this.hideUserSuggestions();
        }
      });
    }
  }
  
  selectUser(user: any) {
    const textarea = this.contentTextarea.nativeElement;
    const content = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    const beforeCursor = content.substring(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const sanitizedUsername = this.sanitizeInput(user.username);
      const newContent = content.substring(0, atIndex) + '@' + sanitizedUsername + ' ' + content.substring(cursorPos);
      this.postData.content = newContent;
      
      setTimeout(() => {
        const newPos = atIndex + sanitizedUsername.length + 2;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      });
    }
    
    this.hideUserSuggestions();
    this.extractHashtagsAndMentions(this.postData.content);
  }
  
  hideUserSuggestions() {
    this.showUserSuggestions = false;
    this.userSuggestions = [];
    this.selectedSuggestionIndex = -1;
    this.currentMentionStart = -1;
  }

  onContentChange(event: any) {
    const content = event.target.value;
    this.extractHashtagsAndMentions(content);
  }

  extractHashtagsAndMentions(content: string) {
    const hashtagRegex = /#(\w+)/g;
    this.hashtags = [];
    let match;
    while ((match = hashtagRegex.exec(content)) !== null) {
      if (!this.hashtags.includes(match[1])) {
        this.hashtags.push(match[1]);
      }
    }
    
    const mentionRegex = /@(\w+)/g;
    this.mentions = [];
    while ((match = mentionRegex.exec(content)) !== null) {
      if (!this.mentions.includes(match[1])) {
        this.mentions.push(match[1]);
      }
    }
  }

  onSubmit() {
    if (this.postData.content.trim()) {
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        if (this.selectedFile) {
          const formData = new FormData();
          formData.append('content', this.postData.content);
          formData.append('file', this.selectedFile);
          formData.append('visibility', this.postData.visibility || 'PUBLIC');
          
          this.postService.createPostWithFile(formData).subscribe({
            next: (response) => {
              this.isLoading = false;
              this.router.navigate(['/dashboard']);
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = error?.message || 'Failed to create post. Please try again.';
            }
          });
        } else {
          this.postData.visibility = this.postData.visibility || 'PUBLIC';
          this.postService.createPost(this.postData).subscribe({
            next: (response) => {
              this.isLoading = false;
              this.router.navigate(['/dashboard']);
            },
            error: (error) => {
              this.isLoading = false;
              this.errorMessage = error?.message || 'Failed to create post. Please try again.';
            }
          });
        }
      } catch (error) {
        this.isLoading = false;
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      }
    }
  }

  onCancel() {
    this.router.navigate(['/dashboard']);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  isVideo(file: File): boolean {
    return file.type.startsWith('video/');
  }

  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private sanitizeInput(input: string): string {
    return input.replace(/[\r\n\t]/g, '').trim();
  }
}