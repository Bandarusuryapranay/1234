import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Ec2SingleInstanceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----------------------------------------------------------------------
    // Parameters
    // ----------------------------------------------------------------------
    const instanceTypeParam = new cdk.CfnParameter(this, 'InstanceType', {
      type: 'String',
      default: 't3.micro',
      description: 'EC2 instance type (free-trial default t3.micro; t3.medium recommended for build stability)',
    });

    const keyNameParam = new cdk.CfnParameter(this, 'KeyName', {
      type: 'AWS::EC2::KeyPair::KeyName',
      description: 'Name of an existing EC2 KeyPair to enable SSH access',
    });

    const repoUrlParam = new cdk.CfnParameter(this, 'RepoUrl', {
      type: 'String',
      description: 'Git repository URL containing backend and frontend folders',
      default: 'https://github.com/Bandarusuryapranay/1234.git',
    });

    const repoBranchParam = new cdk.CfnParameter(this, 'RepoBranch', {
      type: 'String',
      default: 'main',
      description: 'Git branch to deploy from',
    });

    const databaseUrlParam = new cdk.CfnParameter(this, 'DatabaseUrl', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'Backend DATABASE_URL. Leave blank to use local postgres container.',
    });

    const jwtSecretParam = new cdk.CfnParameter(this, 'JwtSecret', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'JWT secret. Leave blank to auto-generate at bootstrap.',
    });

    const jwtExpiresInParam = new cdk.CfnParameter(this, 'JwtExpiresIn', {
      type: 'String',
      default: '15m',
      description: 'JWT expiry duration',
    });

    const jwtRefreshSecretParam = new cdk.CfnParameter(this, 'JwtRefreshSecret', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'JWT refresh secret. Leave blank to auto-generate at bootstrap.',
    });

    const jwtRefreshExpiresInParam = new cdk.CfnParameter(this, 'JwtRefreshExpiresIn', {
      type: 'String',
      default: '7d',
      description: 'JWT refresh token expiry duration',
    });

    const nodeEnvParam = new cdk.CfnParameter(this, 'NodeEnv', {
      type: 'String',
      default: 'production',
      description: 'NODE_ENV for backend runtime',
    });

    const backendUrlParam = new cdk.CfnParameter(this, 'BackendUrl', {
      type: 'String',
      default: 'http://localhost:4000',
      description: 'Backend public/base URL used by app links',
    });

    const judge0ApiUrlParam = new cdk.CfnParameter(this, 'Judge0ApiUrl', {
      type: 'String',
      default: 'http://judge0-server:2358',
      description: 'JUDGE0_API_URL for code execution service',
    });

    const groqApiKeyParam = new cdk.CfnParameter(this, 'GroqApiKey', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'Groq API key used by AI services',
    });

    const openAiApiKeyParam = new cdk.CfnParameter(this, 'OpenAiApiKey', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'OpenAI-compatible API key. If omitted, GroqApiKey is reused.',
    });

    const openAiBaseUrlParam = new cdk.CfnParameter(this, 'OpenAiBaseUrl', {
      type: 'String',
      default: 'https://api.groq.com/openai/v1',
      description: 'Base URL for the OpenAI-compatible provider',
    });

    const openAiModelParam = new cdk.CfnParameter(this, 'OpenAiModel', {
      type: 'String',
      default: 'llama-3.3-70b-versatile',
      description: 'Default LLM model name',
    });

    const openAiSttModelParam = new cdk.CfnParameter(this, 'OpenAiSttModel', {
      type: 'String',
      default: 'whisper-large-v3-turbo',
      description: 'Speech-to-text model name',
    });

    const azureTenantIdParam = new cdk.CfnParameter(this, 'AzureTenantId', {
      type: 'String',
      default: 'placeholder-tenant-id',
      description: 'Azure tenant id for Graph email integration',
    });

    const azureClientIdParam = new cdk.CfnParameter(this, 'AzureClientId', {
      type: 'String',
      default: 'placeholder-client-id',
      description: 'Azure client id for Graph email integration',
    });

    const azureClientSecretParam = new cdk.CfnParameter(this, 'AzureClientSecret', {
      type: 'String',
      noEcho: true,
      default: 'placeholder-client-secret',
      description: 'Azure client secret for Graph email integration',
    });

    const graphSenderEmailParam = new cdk.CfnParameter(this, 'GraphSenderEmail', {
      type: 'String',
      default: 'noreply@example.com',
      description: 'Sender email address used for outbound notifications',
    });

    const smtpHostParam = new cdk.CfnParameter(this, 'SmtpHost', {
      type: 'String',
      default: 'smtp.gmail.com',
      description: 'SMTP host for nodemailer',
    });

    const smtpPortParam = new cdk.CfnParameter(this, 'SmtpPort', {
      type: 'String',
      default: '587',
      description: 'SMTP port for nodemailer',
    });

    const smtpSecureParam = new cdk.CfnParameter(this, 'SmtpSecure', {
      type: 'String',
      default: 'false',
      description: 'SMTP secure flag (true/false)',
    });

    const smtpUserParam = new cdk.CfnParameter(this, 'SmtpUser', {
      type: 'String',
      default: '',
      description: 'SMTP username/email',
    });

    const smtpPassParam = new cdk.CfnParameter(this, 'SmtpPass', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'SMTP password/app password',
    });

    const smtpFromParam = new cdk.CfnParameter(this, 'SmtpFrom', {
      type: 'String',
      default: '',
      description: 'SMTP from label/address',
    });

    const redisUrlParam = new cdk.CfnParameter(this, 'RedisUrl', {
      type: 'String',
      default: 'redis://redis:6379',
      description: 'REDIS_URL exposed to backend',
    });

    const cloudinaryCloudNameParam = new cdk.CfnParameter(this, 'CloudinaryCloudName', {
      type: 'String',
      default: '',
      description: 'Cloudinary cloud name',
    });

    const cloudinaryApiKeyParam = new cdk.CfnParameter(this, 'CloudinaryApiKey', {
      type: 'String',
      default: '',
      description: 'Cloudinary API key',
    });

    const cloudinaryApiSecretParam = new cdk.CfnParameter(this, 'CloudinaryApiSecret', {
      type: 'String',
      noEcho: true,
      default: '',
      description: 'Cloudinary API secret',
    });

    const frontendUrlParam = new cdk.CfnParameter(this, 'FrontendUrl', {
      type: 'String',
      default: 'http://localhost:3000',
      description: 'Allowed frontend URL for CORS and login links',
    });

    const adminIpParam = new cdk.CfnParameter(this, 'AdminIpCidr', {
      type: 'String',
      default: '0.0.0.0/0',
      description: 'CIDR block allowed for SSH and Judge0 admin access',
    });

    // ----------------------------------------------------------------------
    // VPC Setup
    // ----------------------------------------------------------------------
    const vpc = new ec2.Vpc(this, 'CodingPlatformVpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ----------------------------------------------------------------------
    // Security Group
    // ----------------------------------------------------------------------
    const sg = new ec2.SecurityGroup(this, 'InstanceSg', {
      vpc,
      description: 'Allow SSH/HTTP/HTTPS and optional Judge0 admin access',
      allowAllOutbound: true,
    });

    sg.addIngressRule(ec2.Peer.ipv4(adminIpParam.valueAsString), ec2.Port.tcp(22), 'Allow SSH');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
    sg.addIngressRule(ec2.Peer.ipv4(adminIpParam.valueAsString), ec2.Port.tcp(2358), 'Allow Judge0 API from admin CIDR');

    // ----------------------------------------------------------------------
    // EC2 Instance
    // ----------------------------------------------------------------------
    const machineImage = ec2.MachineImage.fromSsmParameter(
      '/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id'
    );

    const keyPair = ec2.KeyPair.fromKeyPairName(this, 'ImportedKeyPair', keyNameParam.valueAsString);

    const instance = new ec2.Instance(this, 'CodingPlatformInstance', {
      instanceType: new ec2.InstanceType(instanceTypeParam.valueAsString),
      machineImage,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: sg,
      keyPair,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: ec2.BlockDeviceVolume.ebs(50, { volumeType: ec2.EbsDeviceVolumeType.GP3 }),
        },
      ],
    });

    // ----------------------------------------------------------------------
    // User Data (Bootstrap Script)
    // ----------------------------------------------------------------------
    const userDataScript = `set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y docker.io docker-compose git nginx jq pwgen

systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu || true

# Add 2GB swap to avoid OOM during npm/prisma build on smaller instance sizes.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon /swapfile || true
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

WORKDIR=/home/ubuntu/coding-platform
REPO_URL="${repoUrlParam.valueAsString}"
REPO_BRANCH="${repoBranchParam.valueAsString}"
REPO_DIR=$WORKDIR/repo

mkdir -p $WORKDIR
cd $WORKDIR

if [ ! -d "$REPO_DIR/.git" ]; then
  git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"
else
  cd "$REPO_DIR"
  git fetch --all --prune
  git checkout "$REPO_BRANCH" || git checkout -b "$REPO_BRANCH" "origin/$REPO_BRANCH"
  git reset --hard "origin/$REPO_BRANCH"
  cd "$WORKDIR"
fi

POSTGRES_PASSWORD=$(pwgen -s 32 1)
JWT_SECRET=$(pwgen -s 64 1)
JWT_REFRESH_SECRET=$(pwgen -s 64 1)

OPENAI_API_KEY_VALUE="${openAiApiKeyParam.valueAsString}"
if [ -z "$OPENAI_API_KEY_VALUE" ]; then
  OPENAI_API_KEY_VALUE="${groqApiKeyParam.valueAsString}"
fi

BACKEND_DATABASE_URL="${databaseUrlParam.valueAsString}"
if [ -z "$BACKEND_DATABASE_URL" ]; then
  BACKEND_DATABASE_URL="postgresql://postgres:\${POSTGRES_PASSWORD}@postgres:5432/smarthire_db"
fi

JWT_SECRET_VALUE="${jwtSecretParam.valueAsString}"
if [ -z "$JWT_SECRET_VALUE" ]; then
  JWT_SECRET_VALUE="$JWT_SECRET"
fi

JWT_REFRESH_SECRET_VALUE="${jwtRefreshSecretParam.valueAsString}"
if [ -z "$JWT_REFRESH_SECRET_VALUE" ]; then
  JWT_REFRESH_SECRET_VALUE="$JWT_REFRESH_SECRET"
fi

cat <<EOF > .env
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="\${POSTGRES_PASSWORD}"

DATABASE_URL="\${BACKEND_DATABASE_URL}"
JWT_SECRET="\${JWT_SECRET_VALUE}"
JWT_EXPIRES_IN="${jwtExpiresInParam.valueAsString}"
JWT_REFRESH_SECRET="\${JWT_REFRESH_SECRET_VALUE}"
JWT_REFRESH_EXPIRES_IN="${jwtRefreshExpiresInParam.valueAsString}"

PORT=4000
NODE_ENV="${nodeEnvParam.valueAsString}"
CLIENT_URL="${frontendUrlParam.valueAsString}"
FRONTEND_URL="${frontendUrlParam.valueAsString}"
BACKEND_URL="${backendUrlParam.valueAsString}"

OPENAI_API_KEY="\${OPENAI_API_KEY_VALUE}"
OPENAI_BASE_URL="${openAiBaseUrlParam.valueAsString}"
OPENAI_MODEL="${openAiModelParam.valueAsString}"
OPENAI_TTS_MODEL="tts-1"
OPENAI_STT_MODEL="${openAiSttModelParam.valueAsString}"
GROQ_API_KEY="${groqApiKeyParam.valueAsString}"

JUDGE0_API_URL="${judge0ApiUrlParam.valueAsString}"
JUDGE0_API_KEY=""

AZURE_TENANT_ID="${azureTenantIdParam.valueAsString}"
AZURE_CLIENT_ID="${azureClientIdParam.valueAsString}"
AZURE_CLIENT_SECRET="${azureClientSecretParam.valueAsString}"
GRAPH_SENDER_EMAIL="${graphSenderEmailParam.valueAsString}"

CLOUDINARY_CLOUD_NAME="${cloudinaryCloudNameParam.valueAsString}"
CLOUDINARY_API_KEY="${cloudinaryApiKeyParam.valueAsString}"
CLOUDINARY_API_SECRET="${cloudinaryApiSecretParam.valueAsString}"

SMTP_HOST="${smtpHostParam.valueAsString}"
SMTP_PORT="${smtpPortParam.valueAsString}"
SMTP_SECURE="${smtpSecureParam.valueAsString}"
SMTP_USER="${smtpUserParam.valueAsString}"
SMTP_PASS="${smtpPassParam.valueAsString}"
SMTP_FROM="${smtpFromParam.valueAsString}"

REDIS_URL="${redisUrlParam.valueAsString}"
EOF

cat <<'EOF' > init-db.sql
CREATE DATABASE smarthire_db;
CREATE DATABASE judge0;
EOF

cat <<'EOF' > backend.Dockerfile
FROM node:20-alpine

RUN apk --no-cache add postgresql-client

WORKDIR /app

COPY repo/backend/package*.json ./
RUN npm ci

COPY repo/backend ./
RUN npx prisma generate
RUN npm run build

EXPOSE 4000
# Wait for postgres, push schema, and start the compiled server.
CMD sh -c 'until pg_isready -h "postgres" -p "5432" -U "postgres"; do echo "Waiting for Postgres..."; sleep 2; done; npx prisma db push && npm start'
EOF

cat <<'EOF' > docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:13
    env_file: .env
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    restart: always
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 12

  redis:
    image: redis:6.0
    restart: always
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD-SHELL", "redis-cli ping | grep PONG"]
      interval: 10s
      timeout: 5s
      retries: 12

  judge0-server:
    image: judge0/judge0:1.13.1
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: judge0
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
    ports:
      - "2358:2358"
    restart: always
    privileged: true
    depends_on:
      - postgres
      - redis

  judge0-worker:
    image: judge0/judge0:1.13.1
    command: ["./scripts/workers"]
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: judge0
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
    restart: always
    privileged: true
    depends_on:
      - postgres
      - redis

  backend:
    build:
      context: .
      dockerfile: backend.Dockerfile
    env_file: .env
    ports:
      - "4000:4000"
    restart: always
    depends_on:
      - postgres
      - judge0-server

volumes:
  postgres-data:
  redis-data:
EOF

cat <<'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

systemctl enable nginx
systemctl restart nginx

chown -R ubuntu:ubuntu $WORKDIR
cd $WORKDIR

docker-compose up -d postgres redis

for i in $(seq 1 60); do
  if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker-compose up -d judge0-server judge0-worker
docker-compose up -d --build backend
`;

    instance.addUserData(userDataScript);

    // ----------------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------------
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
      description: 'Public IP of the EC2 instance',
    });

    new cdk.CfnOutput(this, 'BackendUrlOutput', {
      value: cdk.Fn.join('', ['http://', instance.instancePublicIp]),
      description: 'Backend URL proxied through nginx',
    });

    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'Instance ID',
    });
  }
}

const app = new cdk.App();
const stackName = app.node.tryGetContext('stackName') || process.env.CDK_STACK_NAME || 'Ec2DeploymentStack';

new Ec2SingleInstanceStack(app, stackName, { stackName });
