# DirectVet

Containerized deployment assets for the DirectVet application, including the FastAPI backend and the Vite/React frontend.

## Environment Configuration

The backend reads configuration from environment variables (a `.env` file is provided for local defaults). Key settings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `APP_SECRET_KEY` | Secret used for HMAC-signed tokens; **set a strong value in production** | `change-me-please` |
| `DATABASE_URL` | SQLAlchemy connection string (PostgreSQL) | `postgresql+psycopg://directvet:directvet@postgres:5432/directvet` |
| `DOCUMENT_STORAGE_ROOT` | Directory where uploaded files are persisted | `files` |
| `EMPLOYEE_ALLOWED_EMAILS` | Comma-separated list of employees allowed to log in | empty (allow all) |
| `ACCESS_TOKEN_TTL` / `EMPLOYEE_TOKEN_TTL` | Token lifetimes in seconds | `3600` |
| `VITE_API_BASE_URL` | (Frontend build) Base URL used by the SPA to reach the API | `/api` |

For AWS, place secrets (database credentials, secret keys) in AWS Secrets Manager or SSM Parameter Store and inject them into your container environment.

## Local Development with Docker Compose

1. Copy the existing backend environment file so you can make local modifications without committing secrets:
   ```bash
   cp backend/.env backend/.env.local
   ```
   (Update `docker-compose.yml` if you want to use the new filename.)
2. Build the images and start all services (backend, frontend, PostgreSQL):
   ```bash
   docker compose up --build
   ```
3. Access the app:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
4. The backend container automatically:
   - Creates database tables.
   - Seeds the states reference data.
   - Proxies requests with `--proxy-headers`, so it works behind reverse proxies.
5. Uploaded documents are stored under the named Docker volume `backend-documents`; PostgreSQL data is stored in `postgres-data`.

To stop the stack, press `Ctrl+C` and then run `docker compose down` if you want containers removed.

## Building Production Images

Build the backend API image:
```bash
docker build -t your-registry/directvet-backend:latest backend
```

Build the frontend (Nginx) image:
```bash
docker build -t your-registry/directvet-frontend:latest frontend
```
Pass a different API endpoint during the build if the frontend will call a hosted API (e.g., API Gateway or ALB):
```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.your-domain.com \
  -t your-registry/directvet-frontend:latest \
  frontend
```

Tag the images for your registry (e.g., Amazon ECR) and push them:
```bash
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag your-registry/directvet-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/directvet-backend:latest
docker tag your-registry/directvet-frontend:latest <account>.dkr.ecr.<region>.amazonaws.com/directvet-frontend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/directvet-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/directvet-frontend:latest
```

## Deploying on AWS (ECS or EKS)

1. **Persistent storage**  
   - Point `DOCUMENT_STORAGE_ROOT` to a persistent volume (Amazon EFS) or adapt the application to use S3 for uploads.
   - Configure PostgreSQL with persistent storage (e.g., Amazon RDS or an RDS proxy). Update `DATABASE_URL` to match your database endpoint and credentials.
2. **Networking**  
   - Frontend container listens on port `80` (Nginx).  
   - Backend container listens on port `8000`.  
   Configure a load balancer or ingress so `/api/*` routes are forwarded to the backend container; static assets and the SPA should be served by the frontend container.
3. **Task definitions / Pods**  
   - ECS task example: two containers (frontend + backend) that share a task-level network so Nginx can reach `http://backend:8000`.  
   - Map environment variables (`APP_SECRET_KEY`, `DATABASE_URL`, etc.) from Secrets Manager or Parameter Store.
4. **Migrations / Seed**  
   - No extra step is required. The backend entrypoint creates tables and seeds the states table on startup. Monitor logs for seed output (`Inserted X states.`).
5. **Health checks**  
   - Backend: `GET /api/states` (200)  
   - Frontend: `GET /` (200)

If you prefer to deploy the API separately (e.g., behind an ALB and serve the frontend from S3 + CloudFront), adjust the frontend `API_BASE` in `frontend/src/api.ts` or supply an environment variable at build time.

## Project Structure (Docker Highlights)

```
backend/
  Dockerfile              # FastAPI image
  docker-entrypoint.sh    # Handles schema creation, seeding, and server start
frontend/
  Dockerfile              # Vite build + Nginx runtime
  nginx.conf              # SPA routing + /api proxy to backend
docker-compose.yml        # Local multi-service orchestration
```

Feel free to adapt the base images or add tooling (e.g., Prometheus exporters, logging sidecars) to meet your AWS deployment requirements.
