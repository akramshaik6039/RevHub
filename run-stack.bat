@echo off
echo Starting RevHub Full Stack...

echo Building and starting services...
docker-compose up --build -d

echo Waiting for services to be ready...
timeout /t 30

echo Services started!
echo Frontend: http://localhost
echo Backend API: http://localhost:8080
echo MongoDB: localhost:27017
echo MySQL: localhost:3306

echo To view logs: docker-compose logs -f
echo To stop: docker-compose down