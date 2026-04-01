# Deploying Tone Chat to a Production Server

This guide covers deploying Tone Chat to any server with Docker installed.

## Prerequisites

- Docker Engine 20.10+ with Docker Compose V2
- A domain name (optional, can use IP address)
- Ports 8080 and 8443 available
- At least 2GB RAM, 10GB disk space

## Step 1: Prepare the Server

### Install Docker

```bash
# For Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in for group changes to take effect.

### Create Deployment Directory

```bash
mkdir -p ~/tone-chat
cd ~/tone-chat
```

## Step 2: Create docker-compose.yml

Create a `docker-compose.yml` file that pulls published images:

```yaml
services:
  caddy:
    image: madaley1/tone-chat:caddy
    ports:
      - "8080:80"
      - "8443:443"
    environment:
      - DOMAIN=${DOMAIN}
    volumes:
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      - bff
    networks:
      - tone-net
    restart: unless-stopped

  bff:
    image: madaley1/tone-chat:bff
    environment:
      NODE_ENV: production
      PORT: 4000
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
      MESSAGING_SERVICE_URL: http://messaging:3001
      USERS_SERVICE_URL: http://users:3002
      ATTACHMENTS_SERVICE_URL: http://attachments:3003
    depends_on:
      - messaging
      - users
      - attachments
    networks:
      - tone-net
    restart: unless-stopped

  messaging:
    image: madaley1/tone-chat:messaging
    environment:
      NODE_ENV: production
      PORT: 3001
      MONGO_URI: mongodb://mongo:27017/tone_messaging
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      USERS_SERVICE_URL: http://users:3002
    depends_on:
      - mongo
    networks:
      - tone-net
    restart: unless-stopped

  users:
    image: madaley1/tone-chat:users
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: postgres://tone:${DB_PASSWORD}@users-db:5432/tone_users
      JWT_SECRET: ${JWT_SECRET}
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      SMTP_FROM: ${SMTP_FROM:-noreply@localhost}
    depends_on:
      - users-db
    networks:
      - tone-net
    restart: unless-stopped

  attachments:
    image: madaley1/tone-chat:attachments
    environment:
      NODE_ENV: production
      PORT: 3003
      DATABASE_URL: postgres://tone:${DB_PASSWORD}@attachments-db:5432/tone_attachments
      INTERNAL_API_KEY: ${INTERNAL_API_KEY}
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}
      S3_BUCKET: tone-attachments
      S3_REGION: us-east-1
    depends_on:
      - attachments-db
      - minio-init
    networks:
      - tone-net
    restart: unless-stopped

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db
    networks:
      - tone-net
    restart: unless-stopped

  users-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tone_users
      POSTGRES_USER: tone
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - users-db-data:/var/lib/postgresql/data
    networks:
      - tone-net
    restart: unless-stopped

  attachments-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tone_attachments
      POSTGRES_USER: tone
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - attachments-db-data:/var/lib/postgresql/data
    networks:
      - tone-net
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
    volumes:
      - minio-data:/data
    networks:
      - tone-net
    restart: unless-stopped

  minio-init:
    image: minio/mc
    depends_on:
      - minio
    networks:
      - tone-net
    restart: on-failure
    entrypoint: >
      /bin/sh -c "
        mc alias set myminio http://minio:9000 $$S3_ACCESS_KEY $$S3_SECRET_KEY &&
        mc mb --ignore-existing myminio/tone-attachments
      "
    environment:
      S3_ACCESS_KEY: ${S3_ACCESS_KEY}
      S3_SECRET_KEY: ${S3_SECRET_KEY}

networks:
  tone-net:

volumes:
  mongo-data:
  users-db-data:
  attachments-db-data:
  minio-data:
  caddy-data:
  caddy-config:
```

## Step 3: Create .env File

Generate secure secrets and create a `.env` file:

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
INTERNAL_API_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 32)
S3_ACCESS_KEY=$(openssl rand -hex 32)
S3_SECRET_KEY=$(openssl rand -hex 32)

# Create .env file
cat > .env <<EOF
# === Secrets ===
JWT_SECRET='${JWT_SECRET}'
INTERNAL_API_KEY='${INTERNAL_API_KEY}'
DB_PASSWORD='${DB_PASSWORD}'
S3_ACCESS_KEY='${S3_ACCESS_KEY}'
S3_SECRET_KEY='${S3_SECRET_KEY}'

# === Deployment ===
DOMAIN=chat.yourdomain.com
ALLOWED_ORIGINS=https://chat.yourdomain.com

# === SMTP (optional) ===
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@yourdomain.com
EOF

chmod 600 .env
```

### Configuration Notes:

- **DOMAIN**: 
  - For a real domain: `chat.yourdomain.com` (Caddy will auto-provision TLS)
  - For HTTP only: `:80` (inside container; accessible on host port 8080)
  
- **ALLOWED_ORIGINS**: Match your domain
  - With domain: `https://chat.yourdomain.com`
  - HTTP only: `http://your-server-ip:8080`

- **SMTP** (optional but **recommended for production**):
  - **Without SMTP**: Verification codes print to console logs (`docker compose logs users`)
  - **With SMTP**: Users receive verification codes via email
  
  **Recommended: SendGrid** (https://sendgrid.com)
  - **Why SendGrid**: 100 emails/day free, excellent deliverability, simple setup
  - Create a free account at https://signup.sendgrid.com/
  - Generate an API key at Settings → API Keys
  - Use `apikey` as the username (literal string)
  
  **SendGrid configuration (recommended):**
  ```bash
  SMTP_HOST=smtp.sendgrid.net
  SMTP_PORT=587
  SMTP_USER=apikey
  SMTP_PASS=SG.your-sendgrid-api-key-here
  SMTP_FROM=noreply@yourdomain.com
  ```
  
  **Alternative providers:**
  - **Gmail**: `smtp.gmail.com:587` (500/day limit, requires [App Password](https://support.google.com/accounts/answer/185833))
  - **AWS SES**: `email-smtp.region.amazonaws.com:587` (best for high volume)
  - **Mailgun**: `smtp.mailgun.org:587` (100/day free with trial)

### Complete .env Example (with SendGrid)

Here's a complete example `.env` file with SendGrid configured:

```bash
# === Secrets (auto-generated) ===
JWT_SECRET='secret'
INTERNAL_API_KEY='apikey'
DB_PASSWORD='pass'
S3_ACCESS_KEY='accessKey'
S3_SECRET_KEY='secretKey'

# === Deployment ===
DOMAIN=chat.yourdomain.com
ALLOWED_ORIGINS=https://chat.yourdomain.com

# === SMTP (SendGrid - Recommended) ===
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
SMTP_FROM=noreply@yourdomain.com
```

**Replace these values:**
- All secret values (JWT_SECRET, INTERNAL_API_KEY, etc.) with output from `openssl rand -hex 32`
- `chat.yourdomain.com` with your actual domain
- `SG.xxx...yyy` with your SendGrid API key
- `noreply@yourdomain.com` with your sender email

## Step 4: Pull and Start Services

```bash
# Pull all images
docker compose pull

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Step 5: Verify Deployment

```bash
# Test API health
curl http://localhost:8080/api/v1/health

# Should return: {"ok":true,"version":"1.0.0"}
```

Visit your domain (or `http://server-ip:8080`) to access Tone Chat!

## DNS Configuration

If using a domain, point an A record to your server's IP:

```
A    chat.yourdomain.com    →    your.server.ip.address
```

Caddy will automatically provision a Let's Encrypt TLS certificate.

## Monitoring

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f users

# Check resource usage
docker stats
```

## Updating

```bash
# Pull latest images
docker compose pull

# Recreate containers with new images
docker compose up -d

# Remove old images
docker image prune -a
```

## Backup

### Database Backups

```bash
# Backup MongoDB
docker compose exec mongo mongodump --archive=/data/backup.archive

# Backup PostgreSQL (users)
docker compose exec users-db pg_dump -U tone tone_users > users_backup.sql

# Backup PostgreSQL (attachments)
docker compose exec attachments-db pg_dump -U tone tone_attachments > attachments_backup.sql
```

### Volume Backups

```bash
# Backup all volumes
docker run --rm \
  -v tone-chat_mongo-data:/data/mongo \
  -v tone-chat_users-db-data:/data/users-db \
  -v tone-chat_attachments-db-data:/data/attachments-db \
  -v tone-chat_minio-data:/data/minio \
  -v $(pwd):/backup \
  alpine tar czf /backup/volumes-backup.tar.gz /data
```

## Troubleshooting

### Check Service Health

```bash
docker compose ps
docker compose logs users
docker compose logs bff
```

### Reset Environment

```bash
# Stop all services
docker compose down

# Start fresh (preserves data)
docker compose up -d

# Nuclear option (DELETES ALL DATA)
docker compose down -v
```

### Common Issues

**Services won't start:**
- Check `.env` file exists and has all required variables
- Verify DOMAIN is set correctly
- Check disk space: `df -h`

**Can't access app:**
- Verify ports 8080/8443 aren't blocked by firewall
- Check `ALLOWED_ORIGINS` matches your domain
- Review Caddy logs: `docker compose logs caddy`

**Database migrations failed:**
- Check database logs: `docker compose logs users-db`
- Verify `DB_PASSWORD` is set correctly

## Security Recommendations

1. **Use a firewall** (ufw, iptables) to restrict access
2. **Keep secrets secure** - never commit `.env` to version control
3. **Enable automatic security updates** on your server
4. **Configure SMTP** for production (don't use console logging)
5. **Regular backups** - automate database and volume backups
6. **Monitor logs** for suspicious activity
7. **Use strong passwords** for database access

## Scaling

For high-traffic deployments, consider:

- **Multiple BFF instances** behind a load balancer
- **Separate database servers** (managed PostgreSQL/MongoDB)
- **External S3** instead of MinIO (AWS S3, DigitalOcean Spaces)
- **Redis** for session/cache storage
- **CDN** for static assets

## Support

For issues or questions:
- Check logs: `docker compose logs`
- Review [CLAUDE.md](./CLAUDE.md) for architecture details
- Check GitHub issues
