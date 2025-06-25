#!/bin/bash
set -e

echo "Pulling images"
docker compose pull

echo "Stopping services"
docker compose down

echo "Starting services"
docker compose up -d --build

echo "Services are up and running"