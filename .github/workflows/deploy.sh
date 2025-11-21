cd grade-calc || exit
git fetch
git reset --hard origin/main
docker compose up --build -d
