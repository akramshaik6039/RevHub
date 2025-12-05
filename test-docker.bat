@echo off
echo Testing Docker container...

echo.
echo === Step 1: Check if container is running ===
docker ps --filter ancestor=akramshaik6039/revhub:latest

echo.
echo === Step 2: Check container logs ===
for /f %%i in ('docker ps -q --filter ancestor=akramshaik6039/revhub:latest') do (
    echo Container ID: %%i
    docker logs %%i --tail 20
)

echo.
echo === Step 3: Test ports inside container ===
for /f %%i in ('docker ps -q --filter ancestor=akramshaik6039/revhub:latest') do (
    echo Testing port 8080 inside container:
    docker exec %%i netstat -tlnp 2>nul || echo "netstat not available"
    echo Testing if backend is responding:
    docker exec %%i wget -qO- http://localhost:8080/actuator/health 2>nul || echo "Backend not responding"
)

echo.
echo === Step 4: Test from host ===
echo Testing frontend:
curl -I http://localhost 2>nul || echo "Frontend not accessible"
echo Testing backend:
curl -I http://localhost:8080 2>nul || echo "Backend not accessible"

pause