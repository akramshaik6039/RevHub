// Add this property after line 59 (after contacts: string[] = [];)
contactProfiles: { [key: string]: any } = {};

// Replace the loadChatContacts method around line 1330
loadChatContacts() {
  this.chatService.getChatContacts().subscribe({
    next: (contacts) => {
      console.log('Chat contacts loaded:', contacts);
      // Filter out current user from contacts
      this.contacts = contacts.filter(contact => contact !== this.currentUser?.username);
      // Load profile data for each contact
      this.contacts.forEach(contact => {
        this.profileService.getProfile(contact).subscribe({
          next: (profile) => {
            this.contactProfiles[contact] = profile;
          },
          error: () => {
            this.contactProfiles[contact] = { username: contact, profilePicture: null };
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

// Replace the startGlobalUnreadCountRefresh method around line 1350
startGlobalUnreadCountRefresh() {
  // Load contacts and refresh counts immediately
  this.chatService.getChatContacts().subscribe({
    next: (contacts) => {
      this.contacts = contacts.filter(contact => contact !== this.currentUser?.username);
      // Load profile data for each contact
      this.contacts.forEach(contact => {
        this.profileService.getProfile(contact).subscribe({
          next: (profile) => {
            this.contactProfiles[contact] = profile;
          },
          error: () => {
            this.contactProfiles[contact] = { username: contact, profilePicture: null };
          }
        });
      });
      this.refreshUnreadCounts();
    },
    error: (error) => console.error('Error loading contacts:', error)
  });

  // Set up global refresh every 5 seconds
  this.globalUnreadInterval = setInterval(() => {
    if (this.contacts.length > 0) {
      this.refreshUnreadCounts();
    }
  }, 5000);
}