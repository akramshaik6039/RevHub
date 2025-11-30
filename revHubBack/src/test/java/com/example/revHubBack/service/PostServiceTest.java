package com.example.revHubBack.service;

import com.example.revHubBack.entity.Post;
import com.example.revHubBack.entity.User;
import com.example.revHubBack.entity.Comment;
import com.example.revHubBack.entity.Like;
import com.example.revHubBack.entity.PostVisibility;
import com.example.revHubBack.repository.PostRepository;
import com.example.revHubBack.repository.UserRepository;
import com.example.revHubBack.repository.CommentRepository;
import com.example.revHubBack.repository.FollowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private NotificationMongoService notificationService;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private MultipartFile multipartFile;

    @InjectMocks
    private PostService postService;

    private User testUser;
    private Post testPost;
    private Comment testComment;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");

        testPost = new Post();
        testPost.setId(1L);
        testPost.setContent("Test post content");
        testPost.setAuthor(testUser);
        testPost.setVisibility(PostVisibility.PUBLIC);
        testPost.setLikesCount(0);
        testPost.setCommentsCount(0);
        testPost.setLikes(new ArrayList<>());

        testComment = new Comment();
        testComment.setId(1L);
        testComment.setContent("Test comment");
        testComment.setAuthor(testUser);
        testComment.setPost(testPost);
    }

    @Test
    void getUniversalPosts_Success() {
        List<Post> posts = Arrays.asList(testPost);
        Page<Post> postPage = new PageImpl<>(posts);
        when(postRepository.findPublicPosts(any(Pageable.class))).thenReturn(postPage);

        Page<Post> result = postService.getUniversalPosts(Pageable.unpaged());

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        verify(postRepository).findPublicPosts(any(Pageable.class));
    }

    @Test
    void getPostById_Success() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));

        Optional<Post> result = postService.getPostById(1L);

        assertTrue(result.isPresent());
        assertEquals(testPost, result.get());
        verify(postRepository).findById(1L);
    }

    @Test
    void createPost_WithoutFile_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Post result = postService.createPost("Test content", null, "testuser", "PUBLIC");

        assertNotNull(result);
        assertEquals("Test content", result.getContent());
        assertEquals(testUser, result.getAuthor());
        verify(userRepository).findByUsername("testuser");
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void createPost_WithFile_Success() throws Exception {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getBytes()).thenReturn("test".getBytes());
        when(multipartFile.getContentType()).thenReturn("image/jpeg");

        Post result = postService.createPost("Test content", multipartFile, "testuser", "PUBLIC");

        assertNotNull(result);
        verify(userRepository).findByUsername("testuser");
        verify(postRepository).save(any(Post.class));
        verify(multipartFile).getBytes();
    }

    @Test
    void createPost_UserNotFound_ThrowsException() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            postService.createPost("Test content", null, "testuser", "PUBLIC");
        });

        assertEquals("User not found", exception.getMessage());
        verify(userRepository).findByUsername("testuser");
        verify(postRepository, never()).save(any(Post.class));
    }

    @Test
    void deletePost_Success() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));

        postService.deletePost(1L, "testuser");

        verify(postRepository).findById(1L);
        verify(postRepository).delete(testPost);
    }

    @Test
    void deletePost_Unauthorized_ThrowsException() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            postService.deletePost(1L, "otheruser");
        });

        assertEquals("Unauthorized to delete this post", exception.getMessage());
        verify(postRepository).findById(1L);
        verify(postRepository, never()).delete(any(Post.class));
    }

    @Test
    void toggleLike_AddLike_Success() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Map<String, Object> result = postService.toggleLike(1L, "testuser");

        assertEquals(1, result.get("likesCount"));
        assertEquals(true, result.get("isLiked"));
        verify(postRepository).findById(1L);
        verify(userRepository).findByUsername("testuser");
        verify(postRepository).save(testPost);
        verify(notificationService).createLikeNotification(testUser, testUser, 1L);
    }

    @Test
    void toggleLike_RemoveLike_Success() {
        Like existingLike = new Like();
        existingLike.setUser(testUser);
        existingLike.setPost(testPost);
        testPost.getLikes().add(existingLike);
        testPost.setLikesCount(1);

        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Map<String, Object> result = postService.toggleLike(1L, "testuser");

        assertEquals(0, result.get("likesCount"));
        assertEquals(false, result.get("isLiked"));
        verify(postRepository).save(testPost);
    }

    @Test
    void addComment_Success() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(commentRepository.save(any(Comment.class))).thenReturn(testComment);
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Comment result = postService.addComment(1L, "Test comment", "testuser");

        assertNotNull(result);
        assertEquals("Test comment", result.getContent());
        verify(postRepository).findById(1L);
        verify(userRepository).findByUsername("testuser");
        verify(commentRepository).save(any(Comment.class));
        verify(postRepository).save(testPost);
    }

    @Test
    void getComments_Success() {
        List<Comment> comments = Arrays.asList(testComment);
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(commentRepository.findByPostOrderByCreatedDateDesc(testPost)).thenReturn(comments);

        List<Comment> result = postService.getComments(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testComment, result.get(0));
        verify(postRepository).findById(1L);
        verify(commentRepository).findByPostOrderByCreatedDateDesc(testPost);
    }

    @Test
    void deleteComment_Success() {
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(commentRepository.findById(1L)).thenReturn(Optional.of(testComment));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        postService.deleteComment(1L, 1L, "testuser");

        verify(postRepository).findById(1L);
        verify(userRepository).findByUsername("testuser");
        verify(commentRepository).findById(1L);
        verify(commentRepository).delete(testComment);
        verify(postRepository).save(testPost);
    }

    @Test
    void searchPosts_Success() {
        List<Post> allPosts = Arrays.asList(testPost);
        when(postRepository.findAllByOrderByCreatedDateDesc()).thenReturn(allPosts);

        List<Post> result = postService.searchPosts("test");

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(postRepository).findAllByOrderByCreatedDateDesc();
    }

    @Test
    void searchPosts_EmptyQuery_ReturnsEmptyList() {
        List<Post> result = postService.searchPosts("");

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(postRepository, never()).findAllByOrderByCreatedDateDesc();
    }
}