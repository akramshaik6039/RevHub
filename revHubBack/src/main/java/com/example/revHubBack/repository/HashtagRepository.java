package com.example.revHubBack.repository;

import com.example.revHubBack.entity.Hashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HashtagRepository extends JpaRepository<Hashtag, Long> {
    Optional<Hashtag> findByName(String name);
    
    @Query("SELECT h FROM Hashtag h WHERE LOWER(h.name) LIKE CONCAT('%', :query, '%') ORDER BY h.count DESC")
    List<Hashtag> findByNameContainingOrderByCountDesc(@Param("query") String query);
    
    List<Hashtag> findTop10ByOrderByCountDesc();
}