@echo off
echo Checking Docker container logs...

echo.
echo === Container Status ===
docker ps

echo.
echo === Container Logs ===
docker logs $(docker ps -q --filter ancestor=akramshaik6039/revhub:latest) --tail 50

echo.
echo === Test Backend Health ===
curl http://localhost:8080/actuator/health 2>nul || echo "Backend not responding"

echo.
echo === Test Frontend ===
curl -I http://localhost 2>nul || echo "Frontend not responding"

pause