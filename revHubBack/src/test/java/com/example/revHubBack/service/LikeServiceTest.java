package com.example.revHubBack.service;

import com.example.revHubBack.entity.Like;
import com.example.revHubBack.entity.Post;
import com.example.revHubBack.entity.User;
import com.example.revHubBack.repository.LikeRepository;
import com.example.revHubBack.repository.PostRepository;
import com.example.revHubBack.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private LikeRepository likeRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LikeService likeService;

    private User testUser;
    private Post testPost;
    private Like testLike;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testPost = new Post();
        testPost.setId(1L);
        testPost.setContent("Test post");
        testPost.setLikesCount(0);

        testLike = new Like();
        testLike.setId(1L);
        testLike.setUser(testUser);
        testLike.setPost(testPost);
    }

    @Test
    void toggleLike_AddLike_Success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(likeRepository.existsByUserAndPost(testUser, testPost)).thenReturn(false);
        when(likeRepository.save(any(Like.class))).thenReturn(testLike);
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Map<String, Object> result = likeService.toggleLike(1L, "testuser");

        assertEquals(1, result.get("likesCount"));
        assertEquals(true, result.get("isLiked"));
        verify(likeRepository).save(any(Like.class));
        verify(postRepository).save(testPost);
    }

    @Test
    void toggleLike_RemoveLike_Success() {
        testPost.setLikesCount(1);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(postRepository.findById(1L)).thenReturn(Optional.of(testPost));
        when(likeRepository.existsByUserAndPost(testUser, testPost)).thenReturn(true);
        when(likeRepository.findByUserAndPost(testUser, testPost)).thenReturn(Optional.of(testLike));
        when(postRepository.save(any(Post.class))).thenReturn(testPost);

        Map<String, Object> result = likeService.toggleLike(1L, "testuser");

        assertEquals(0, result.get("likesCount"));
        assertEquals(false, result.get("isLiked"));
        verify(likeRepository).delete(testLike);
        verify(postRepository).save(testPost);
    }
}