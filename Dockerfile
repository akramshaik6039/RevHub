# Multi-stage build for RevHub (Frontend + Backend)

# Stage 1: Build Angular Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY RevHub/RevHub/package*.json ./
RUN npm install
COPY RevHub/RevHub/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM maven:3.8.4-openjdk-17-slim AS backend-build
WORKDIR /app/backend
COPY revHubBack/pom.xml ./
RUN mvn dependency:go-offline
COPY revHubBack/src ./src
RUN mvn clean package -DskipTests

# Stage 3: Production Image with Nginx + Java
FROM nginx:alpine
RUN apk add --no-cache openjdk17-jre-headless

# Copy Angular build to Nginx
COPY --from=frontend-build /app/frontend/dist/rev-hub/browser /usr/share/nginx/html

# Copy Spring Boot JAR
COPY --from=backend-build /app/backend/target/revHubBack-0.0.1-SNAPSHOT.jar /app/backend.jar

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'java -jar -Dspring.profiles.active=docker /app/backend.jar &' >> /start.sh && \
    echo 'sleep 10' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80 8080

CMD ["/start.sh"]