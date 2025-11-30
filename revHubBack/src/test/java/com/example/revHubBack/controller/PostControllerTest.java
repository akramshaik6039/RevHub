package com.example.revHubBack.controller;

import com.example.revHubBack.entity.Post;
import com.example.revHubBack.entity.User;
import com.example.revHubBack.entity.Comment;
import com.example.revHubBack.service.PostService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PostController.class)
class PostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PostService postService;

    @Autowired
    private ObjectMapper objectMapper;

    private User testUser;
    private Post testPost;
    private Comment testComment;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");

        testPost = new Post();
        testPost.setId(1L);
        testPost.setContent("Test post content");
        testPost.setAuthor(testUser);
        testPost.setLikesCount(0);
        testPost.setCommentsCount(0);

        testComment = new Comment();
        testComment.setId(1L);
        testComment.setContent("Test comment");
        testComment.setAuthor(testUser);
    }

    @Test
    @WithMockUser
    void getUniversalPosts_Success() throws Exception {
        List<Post> posts = Arrays.asList(testPost);
        Page<Post> postPage = new PageImpl<>(posts);
        when(postService.getUniversalPosts(any())).thenReturn(postPage);

        mockMvc.perform(get("/api/posts/universal")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].content").value("Test post content"));
    }

    @Test
    @WithMockUser
    void getPostById_Success() throws Exception {
        when(postService.getPostById(1L)).thenReturn(Optional.of(testPost));

        mockMvc.perform(get("/api/posts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.content").value("Test post content"));
    }

    @Test
    @WithMockUser
    void getPostById_NotFound() throws Exception {
        when(postService.getPostById(1L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/posts/1"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser")
    void createPost_Success() throws Exception {
        when(postService.createPost(anyString(), any(), eq("testuser"), anyString()))
                .thenReturn(testPost);

        mockMvc.perform(multipart("/api/posts")
                .param("content", "Test post content")
                .param("visibility", "PUBLIC")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.content").value("Test post content"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void deletePost_Success() throws Exception {
        mockMvc.perform(delete("/api/posts/1")
                .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "testuser")
    void toggleLike_Success() throws Exception {
        Map<String, Object> response = new HashMap<>();
        response.put("likesCount", 1);
        response.put("isLiked", true);
        
        when(postService.toggleLike(1L, "testuser")).thenReturn(response);

        mockMvc.perform(post("/api/posts/1/like")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likesCount").value(1))
                .andExpect(jsonPath("$.isLiked").value(true));
    }

    @Test
    @WithMockUser(username = "testuser")
    void addComment_Success() throws Exception {
        when(postService.addComment(eq(1L), eq("Test comment"), eq("testuser")))
                .thenReturn(testComment);

        mockMvc.perform(post("/api/posts/1/comments")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"Test comment\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.content").value("Test comment"));
    }

    @Test
    @WithMockUser
    void getComments_Success() throws Exception {
        List<Comment> comments = Arrays.asList(testComment);
        when(postService.getComments(1L)).thenReturn(comments);

        mockMvc.perform(get("/api/posts/1/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].content").value("Test comment"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void deleteComment_Success() throws Exception {
        mockMvc.perform(delete("/api/posts/1/comments/1")
                .with(csrf()))
                .andExpect(status().isOk());
    }
}