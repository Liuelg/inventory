
cd /root/inventory

echo "Pulling the latest changes from GitHub..."
git pull origin main

echo "Rebuilding and restarting Docker containers..."
docker compose up -d --build

echo "Cleaning up any old, unused images..."
docker image prune -f

echo "Inventory system successfully updated!"