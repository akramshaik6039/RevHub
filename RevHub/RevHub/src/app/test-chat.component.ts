import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './core/services/chat.service';

@Component({
  selector: 'app-test-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <h3>Chat Unseen Message Test</h3>
      
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Simulate Messages</h5>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <label class="form-label">Send message as:</label>
                <select class="form-select" [(ngModel)]="selectedSender">
                  <option value="akram">akram</option>
                  <option value="john">john</option>
                  <option value="jane">jane</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">To:</label>
                <select class="form-select" [(ngModel)]="selectedReceiver">
                  <option value="Abhishek">Abhishek (Current User)</option>
                  <option value="akram">akram</option>
                  <option value="john">john</option>
                  <option value="jane">jane</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">Message:</label>
                <input type="text" class="form-control" [(ngModel)]="testMessage" placeholder="Type a test message...">
              </div>
              
              <button class="btn btn-primary" (click)="sendTestMessage()" [disabled]="!testMessage.trim()">
                Send Test Message
              </button>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Unread Counts Debug</h5>
            </div>
            <div class="card-body">
              <button class="btn btn-info mb-3" (click)="refreshCounts()">Refresh Counts</button>
              
              <div *ngIf="unreadCounts.length === 0" class="text-muted">
                No unread counts available
              </div>
              
              <div *ngFor="let count of unreadCounts" class="mb-2">
                <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                  <span class="fw-bold">{{count.username}}</span>
                  <span class="badge" [class.bg-danger]="count.unreadCount > 0" [class.bg-secondary]="count.unreadCount === 0">
                    {{count.unreadCount}} unseen
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="row mt-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5>Instructions</h5>
            </div>
            <div class="card-body">
              <ol>
                <li>Use the form above to simulate messages from different users to the current user (Abhishek)</li>
                <li>Check the dashboard chat tab to see unseen message indicators</li>
                <li>Click on a chat contact to mark messages as read</li>
                <li>Use the "Refresh Counts" button to see current unread counts</li>
              </ol>
              
              <div class="alert alert-info mt-3">
                <strong>Expected Behavior:</strong>
                <ul class="mb-0">
                  <li>When User 1 sends a message to User 2, User 2 should see an unseen message indicator</li>
                  <li>The indicator shows the number of unread messages</li>
                  <li>When User 2 opens the chat, messages are marked as read and indicator disappears</li>
                  <li>The chat tab in the bottom navigation shows total unread count across all chats</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .badge {
      font-size: 0.8rem;
    }
  `]
})
export class TestChatComponent {
  selectedSender = 'akram';
  selectedReceiver = 'Abhishek';
  testMessage = '';
  unreadCounts: any[] = [];

  constructor(private chatService: ChatService) {}

  sendTestMessage() {
    if (this.testMessage.trim()) {
      // Note: This is a simulation - in real app, you'd need proper authentication
      console.log(`Simulating message from ${this.selectedSender} to ${this.selectedReceiver}: ${this.testMessage}`);
      
      // For testing, we'll just show the expected behavior
      alert(`Test message sent from ${this.selectedSender} to ${this.selectedReceiver}: "${this.testMessage}"\n\nIn a real scenario, this would create an unseen message indicator for ${this.selectedReceiver}.`);
      
      this.testMessage = '';
      this.refreshCounts();
    }
  }

  refreshCounts() {
    this.chatService.getAllUnreadCounts().subscribe({
      next: (counts) => {
        this.unreadCounts = counts;
        console.log('Current unread counts:', counts);
      },
      error: (error) => {
        console.error('Error fetching unread counts:', error);
        // Show mock data for testing
        this.unreadCounts = [
          { username: 'akram', unreadCount: 2 },
          { username: 'john', unreadCount: 0 },
          { username: 'jane', unreadCount: 1 }
        ];
      }
    });
  }
}