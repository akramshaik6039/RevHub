package com.example.revHubBack.service;

import com.example.revHubBack.entity.Hashtag;
import com.example.revHubBack.repository.HashtagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class HashtagService {
    
    @jakarta.annotation.PostConstruct
    public void init() {
        initializeDefaultHashtags();
    }
    
    @Autowired
    private HashtagRepository hashtagRepository;
    
    public void saveHashtag(String name) {
        System.out.println("Saving hashtag: " + name);
        Hashtag hashtag = hashtagRepository.findByName(name)
            .orElse(new Hashtag(null, name, 0));
        hashtag.setCount(hashtag.getCount() + 1);
        Hashtag saved = hashtagRepository.save(hashtag);
        System.out.println("Hashtag saved: " + saved.getName() + " with count: " + saved.getCount());
    }
    
    public List<String> getHashtagSuggestions(String query) {
        System.out.println("Getting hashtag suggestions for query: " + query);
        List<String> results;
        if (query == null || query.trim().isEmpty()) {
            results = hashtagRepository.findTop10ByOrderByCountDesc()
                .stream()
                .map(Hashtag::getName)
                .collect(Collectors.toList());
        } else {
            results = hashtagRepository.findByNameContainingOrderByCountDesc(query.toLowerCase())
                .stream()
                .limit(10)
                .map(Hashtag::getName)
                .collect(Collectors.toList());
        }
        System.out.println("Found " + results.size() + " hashtags: " + results);
        return results;
    }
    
    public void initializeDefaultHashtags() {
        long count = hashtagRepository.count();
        System.out.println("Hashtag count in DB: " + count);
        
        // Add some test hashtags if database is empty
        if (count == 0) {
            System.out.println("Adding test hashtags...");
            saveHashtag("funny");
            saveHashtag("fun");
            saveHashtag("food");
            saveHashtag("fitness");
            saveHashtag("travel");
            System.out.println("Test hashtags added!");
        }
    }
    
    public List<String> getAllHashtags() {
        return hashtagRepository.findAll()
            .stream()
            .map(Hashtag::getName)
            .collect(Collectors.toList());
    }
}