# Build the Docker image
docker build -t mining-ai-service .

# Run the container
# Map port 8080 to 8080
# Mount the current directory to access service-account.json (or copy it in build)
# Set env var for Firebase credentials
docker run -p 8080:8080 -e PORT=8080 -e FIREBASE_SERVICE_ACCOUNT="/app/service-account.json" -e FIREBASE_STORAGE_BUCKET="mining-analysis-app.appspot.com" mining-ai-service
