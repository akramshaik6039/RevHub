import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from './post.service';

export interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  isPrivate?: boolean;
  createdDate: string;
  followersCount?: number;
  followingCount?: number;
  followStatus?: string;
}

export interface FollowRequest {
  id: number;
  follower: User;
  following: User;
  status: 'PENDING' | 'ACCEPTED';
  createdDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = 'http://localhost:8080/profile';

  constructor(private http: HttpClient) { }

  getProfile(username: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${username}`);
  }

  getUserPosts(username: string): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/${username}/posts`);
  }

  updateProfile(updates: { bio?: string; profilePicture?: string; isPrivate?: string }): Observable<User> {
    return this.http.put<User>(this.apiUrl, updates);
  }

  uploadProfilePhoto(file: File): Observable<any> {
    console.log('ProfileService: uploadProfilePhoto called with file:', file);
    const formData = new FormData();
    formData.append('file', file);
    console.log('FormData created, making HTTP request to:', `${this.apiUrl}/upload-photo`);
    return this.http.post(`${this.apiUrl}/upload-photo`, formData);
  }
  
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`);
  }

  followUser(username: string): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/follow/${username}`, {});
  }

  unfollowUser(username: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/unfollow/${username}`);
  }

  getFollowStatus(username: string): Observable<{status: string}> {
    return this.http.get<{status: string}>(`${this.apiUrl}/follow-status/${username}`);
  }

  getPendingFollowRequests(): Observable<FollowRequest[]> {
    return this.http.get<FollowRequest[]>(`${this.apiUrl}/follow-requests`);
  }

  acceptFollowRequest(followId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/follow-requests/${followId}/accept`, {});
  }

  rejectFollowRequest(followId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/follow-requests/${followId}/reject`, {});
  }

  cancelFollowRequest(username: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/cancel-request/${username}`);
  }

  getFollowers(username: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${username}/followers`);
  }

  getFollowing(username: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${username}/following`);
  }
  
  removeFollower(username: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/remove-follower/${username}`);
  }
  
  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/search?query=${encodeURIComponent(query)}`);
  }
}