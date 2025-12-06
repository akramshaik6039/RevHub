package com.example.revHubBack.service;

import com.example.revHubBack.dto.CommentRequest;
import com.example.revHubBack.entity.Comment;
import com.example.revHubBack.entity.Post;
import com.example.revHubBack.entity.PostVisibility;
import com.example.revHubBack.entity.User;
import com.example.revHubBack.repository.CommentRepository;
import com.example.revHubBack.repository.PostRepository;
import com.example.revHubBack.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {
    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private FollowService followService;
    
    @Autowired
    private NotificationMongoService notificationService;

    public List<Comment> getCommentsByPost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        // Return only top-level comments (replies are loaded via @OneToMany)
        return commentRepository.findByPostAndParentCommentIsNullOrderByCreatedDateDesc(post);
    }
    
    public List<Comment> getCommentsByPost(Long postId, String currentUsername) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        User currentUser = null;
        if (currentUsername != null) {
            currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        }
        
        // Check if user can view this post
        if (!canViewPost(post, currentUser)) {
            throw new RuntimeException("Not authorized to view comments on this post");
        }
        
        return commentRepository.findByPostAndParentCommentIsNullOrderByCreatedDateDesc(post);
    }
    
    private boolean canViewPost(Post post, User currentUser) {
        // Public posts can be viewed by anyone
        if (post.getVisibility() == PostVisibility.PUBLIC) {
            return true;
        }
        
        // If no current user, can't view private posts
        if (currentUser == null) {
            return false;
        }
        
        // Post author can always view their own posts
        if (post.getAuthor().getId().equals(currentUser.getId())) {
            return true;
        }
        
        // For followers-only posts, check if current user follows the author
        if (post.getVisibility() == PostVisibility.FOLLOWERS_ONLY) {
            return followService.isFollowing(currentUser.getUsername(), post.getAuthor().getUsername());
        }
        
        return false;
    }

    @Transactional
    public Comment addComment(Long postId, CommentRequest commentRequest, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        // Check if user can comment on this post
        if (!canViewPost(post, user)) {
            throw new RuntimeException("Not authorized to comment on this post");
        }

        Comment comment = new Comment();
        comment.setContent(commentRequest.getContent());
        comment.setAuthor(user);
        comment.setPost(post);

        Comment savedComment = commentRepository.save(comment);
        
        post.setCommentsCount(post.getCommentsCount() + 1);
        postRepository.save(post);
        
        processMentions(savedComment, user, post);

        return savedComment;
    }
    
    @Transactional
    public Comment addReply(Long commentId, CommentRequest replyRequest, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Comment parentComment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        Post post = parentComment.getPost();
        
        // Check if user can comment on this post
        if (!canViewPost(post, user)) {
            throw new RuntimeException("Not authorized to reply to this comment");
        }

        Comment reply = new Comment();
        reply.setContent(replyRequest.getContent());
        reply.setAuthor(user);
        reply.setPost(post);
        reply.setParentComment(parentComment);

        Comment savedReply = commentRepository.save(reply);
        
        // Don't increment post comment count for replies
        // Only top-level comments count towards the total
        
        processMentions(savedReply, user, post);
        
        return savedReply;
    }

    @Transactional
    public void deleteComment(Long postId, Long commentId, String username) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        
        if (!comment.getAuthor().getUsername().equals(username) && 
            !post.getAuthor().getUsername().equals(username)) {
            throw new RuntimeException("Not authorized to delete this comment");
        }
        
        commentRepository.delete(comment);
        
        post.setCommentsCount(Math.max(0, post.getCommentsCount() - 1));
        postRepository.save(post);
    }
    
    private void processMentions(Comment comment, User author, Post post) {
        String content = comment.getContent();
        if (content == null) return;
        
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("@(\\w+)");
        java.util.regex.Matcher matcher = pattern.matcher(content);
        
        while (matcher.find()) {
            String mentionedUsername = matcher.group(1);
            try {
                User mentionedUser = userRepository.findByUsername(mentionedUsername).orElse(null);
                if (mentionedUser != null && !mentionedUser.getId().equals(author.getId())) {
                    notificationService.createCommentMentionNotification(mentionedUser, author, post.getId(), comment.getId(), content);
                }
            } catch (Exception e) {
            }
        }
    }
}