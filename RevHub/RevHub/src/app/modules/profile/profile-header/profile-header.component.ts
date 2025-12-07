import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../core/services/profile.service';

@Component({
  selector: 'app-profile-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-header.component.html',
  styleUrl: './profile-header.component.css'
})
export class ProfileHeaderComponent {
  @Input() user: User | null = null;

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