import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit {
  messages: ChatMessage[] = [];
  newMessage = '';
  selectedUser = 'akram';
  currentUser = 'Abhishek';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.loadMessages();
    // Mark messages as read when component loads
    this.markMessagesAsRead();
  }

  loadMessages() {
    this.chatService.getConversation(this.selectedUser).subscribe({
      next: (messages) => {
        console.log('Messages received:', messages);
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => console.error('Error loading messages:', error)
    });
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      this.chatService.sendMessage(this.selectedUser, this.newMessage).subscribe({
        next: (message) => {
          this.messages.push(message);
          this.newMessage = '';
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error) => console.error('Error sending message:', error)
      });
    }
  }

  markMessagesAsRead() {
    this.chatService.markAsRead(this.selectedUser).subscribe({
      next: () => {
        console.log(`Marked messages as read for ${this.selectedUser}`);
      },
      error: (error) => {
        console.error('Error marking messages as read:', error);
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
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}