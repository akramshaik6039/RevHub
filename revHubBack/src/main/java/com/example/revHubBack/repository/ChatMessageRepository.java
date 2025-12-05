package com.example.revHubBack.repository;

import com.example.revHubBack.entity.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    
    @Query("{ $or: [ { $and: [ { 'senderId': ?0 }, { 'receiverId': ?1 } ] }, { $and: [ { 'senderId': ?1 }, { 'receiverId': ?0 } ] } ] }")
    List<ChatMessage> findConversation(String userId1, String userId2);
    
    @Query("{ 'receiverId': ?0, 'isRead': false }")
    List<ChatMessage> findByReceiverIdAndIsReadFalse(String receiverId);
    
    @Query("{ $or: [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    List<ChatMessage> findByUserIdInvolved(String userId);
    
    @Query("{ $or: [ { 'senderId': ?0 }, { 'receiverId': ?0 } ] }")
    List<ChatMessage> findChatContactsRaw(String userId);
    
    @Query(value = "{ 'receiverId': ?0, 'senderId': ?1, 'isRead': false }", count = true)
    long countUnreadMessages(String receiverId, String senderId);
}