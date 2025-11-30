# RevHub Backend - Mock and Unit Tests

## Overview
This document describes the comprehensive test suite created for the RevHub backend application, including unit tests, integration tests, and mock configurations.

## Test Structure

### 1. Unit Tests (Service Layer)
- **AuthServiceTest**: Tests authentication and registration logic
- **PostServiceTest**: Tests post creation, deletion, likes, comments functionality
- **LikeServiceTest**: Tests like/unlike operations

### 2. Integration Tests
- **AuthIntegrationTest**: End-to-end authentication flow testing

### 3. Controller Tests
- **AuthControllerTest**: Tests REST API endpoints for authentication
- **PostControllerTest**: Tests REST API endpoints for posts

### 4. Repository Tests
- **UserRepositoryTest**: Tests database operations for User entity

## Test Configuration

### Dependencies Added
```xml
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

### Test Properties
- Uses H2 in-memory database for isolated testing
- Disables MongoDB for unit tests
- Mock mail configuration
- Test-specific JWT configuration

## Running Tests

### Run All Tests
```bash
./mvnw test
```

### Run Specific Test Class
```bash
./mvnw test -Dtest=AuthServiceTest
```

### Run Tests by Category
```bash
# Unit tests only
./mvnw test -Dtest="**/*Test"

# Integration tests only
./mvnw test -Dtest="**/*IntegrationTest"
```

## Test Coverage

### AuthService Tests
- ✅ User authentication success
- ✅ User registration success
- ✅ Username already exists validation
- ✅ Email already exists validation
- ✅ Exception handling during registration

### PostService Tests
- ✅ Get universal posts
- ✅ Get post by ID
- ✅ Create post without file
- ✅ Create post with file
- ✅ Delete post authorization
- ✅ Toggle like/unlike
- ✅ Add/delete comments
- ✅ Search posts functionality

### Controller Tests
- ✅ Authentication endpoints
- ✅ Post CRUD operations
- ✅ Like/comment operations
- ✅ Error handling and validation

### Repository Tests
- ✅ User lookup by username/email
- ✅ Existence checks
- ✅ Database operations

## Mock Strategy

### Service Layer Mocking
- Repository dependencies mocked using `@Mock`
- External services (EmailService, NotificationService) mocked
- Authentication components mocked

### Controller Layer Testing
- Uses `@WebMvcTest` for focused controller testing
- Service layer mocked with `@MockBean`
- Security context mocked with `@WithMockUser`

### Integration Testing
- Uses `@SpringBootTest` for full application context
- Real database operations with H2
- Security configuration included

## Best Practices Implemented

1. **Isolation**: Each test is independent and doesn't affect others
2. **Mocking**: External dependencies properly mocked
3. **Test Data**: Consistent test data setup in `@BeforeEach`
4. **Assertions**: Comprehensive assertions for all scenarios
5. **Exception Testing**: Proper exception handling verification
6. **Security**: Authentication and authorization testing included

## Test Execution Notes

- Tests use `@Transactional` for automatic rollback
- H2 database provides fast, isolated testing environment
- Mock configurations prevent external service calls
- Security tests include CSRF protection verification