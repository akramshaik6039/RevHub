@echo off
echo Simple Docker test...

echo === Running container in background ===
docker run -d -p 80:80 -p 8080:8080 --name revhub-test akramshaik6039/revhub:latest

echo === Waiting 30 seconds for startup ===
timeout /t 30 /nobreak

echo === Checking logs ===
docker logs revhub-test

echo === Testing endpoints ===
echo Frontend test:
curl http://localhost 2>nul || echo "FAILED"

echo Backend test:
curl http://localhost:8080 2>nul || echo "FAILED"

echo === Cleanup ===
docker stop revhub-test
docker rm revhub-test

pause