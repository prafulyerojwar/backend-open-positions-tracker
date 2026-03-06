# Open Positions Tracker (OPT)


- Docker-based Postgres + API
- Automatic migrations and seed from src/data/mockRows.json

## Testing with Postman
Import **OpenPositionsTracker.postman_collection.json**.
1) Auth - Login → stores token
2) Config - Columns → schema from src/data/columnConfig.js
3) Demands - List → seeded rows
4) Demands - Create → insert using mock field names

Field mapping (API ↔ DB): client↔client_id, project↔opportunity_project, startDate↔estimated_start_date, level↔career_level, skills↔skill
