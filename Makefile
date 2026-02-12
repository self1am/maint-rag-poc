up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

reset:
	docker compose down -v
	docker compose up -d --build

seed:
	docker compose exec -T db psql -U poc -d maint < deploy/scripts/seed_demo.sql
