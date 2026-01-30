# Deployment Guide: Woodpecker CI + Kubernetes

This guide covers deploying a Bun/Node.js application to Kubernetes using Woodpecker CI with Kaniko for image building.

## Prerequisites

- Woodpecker CI instance with Kubernetes backend
- Zot registry (or other container registry) accessible from the cluster
- `woodpecker-deployer` ServiceAccount with permissions to deploy to target namespace

## Directory Structure

```
project/
├── .woodpecker.yml          # CI pipeline config
├── Dockerfile               # Container image definition
└── k8s/
    ├── deployment.yaml      # Kubernetes Deployment
    ├── service.yaml         # Kubernetes Service
    └── ingress.yaml         # Ingress (optional)
```

## 1. Woodpecker Configuration

### `.woodpecker.yml`

```yaml
when:
  - event: push
    branch: main

steps:
  - name: build
    image: woodpeckerci/plugin-kaniko:latest
    settings:
      registry: zot.registry.svc.cluster.local:5000
      repo: <org>/<app-name>
      tags:
        - build-${CI_PIPELINE_NUMBER}
        - latest
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      build-args: APP_VERSION=build-${CI_PIPELINE_NUMBER}

  - name: deploy
    image: alpine/k8s:1.34.0
    environment:
      # Add secrets as env vars
      MY_SECRET:
        from_secret: my_secret
    commands:
      # Create/update K8s secrets from CI secrets
      - |
        kubectl create secret generic <app>-secrets -n <namespace> \
          --from-literal=MY_SECRET="$MY_SECRET" \
          --dry-run=client -o yaml | kubectl apply -f -
      # Substitute image tag and apply manifests
      - sed -i "s|IMAGE_TAG|build-${CI_PIPELINE_NUMBER}|g" k8s/deployment.yaml
      - kubectl apply -f k8s/ -n <namespace>
      - kubectl rollout status deployment/<app-name> -n <namespace> --timeout=120s
    backend_options:
      kubernetes:
        serviceAccountName: woodpecker-deployer
```

### Key Points

- **`when` must be a list** at workflow level (not step level)
- Use `from_secret` in `settings` for plugin secrets (registry auth)
- Use `environment` + `from_secret` for secrets needed in `commands`
- Use hyphens for Kaniko settings: `build-args` not `build_args`

## 2. Woodpecker Secrets

Add these secrets in Woodpecker UI (Settings → Secrets) at org or repo level:

| Secret | Purpose |
|--------|---------|
| `docker_username` | Registry username |
| `docker_password` | Registry password |
| `<app>_secret` | App-specific secrets |

## 3. Dockerfile

```dockerfile
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY tsconfig.json ./

FROM oven/bun:1.3-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["bun", "src/server.ts"]
```

### Key Points

- **Match Bun version to local**: If local is 1.3.x, use `bun:1.3-alpine`. Lockfile formats differ between major versions.
- Multi-stage build keeps image small
- Non-root user for security
- Health check for K8s probes

## 4. Kubernetes Manifests

### `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <app-name>
  labels:
    app: <app-name>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <app-name>
  template:
    metadata:
      labels:
        app: <app-name>
    spec:
      containers:
        - name: <app-name>
          image: zot.registry.svc.cluster.local:5000/<org>/<app-name>:IMAGE_TAG
          ports:
            - containerPort: 3001
          envFrom:
            - secretRef:
                name: <app-name>-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
```

### `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <app-name>
spec:
  selector:
    app: <app-name>
  ports:
    - port: 80
      targetPort: 3001
  type: ClusterIP
```

### `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <app-name>
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - <app-name>.example.com
      secretName: <app-name>-tls
  rules:
    - host: <app-name>.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: <app-name>
                port:
                  number: 80
```

## 5. Common Issues

### "secret not found"
- Secrets are scoped per org/repo in Woodpecker
- Check secrets exist in the correct scope

### "pipeline definition not found"
- Woodpecker looks for: `.woodpecker/*.yml` → `.woodpecker.yaml` → `.woodpecker.yml`
- Check "Pipeline path" in project settings isn't overriding defaults

### "Unknown lockfile version"
- Bun lockfile format changed between versions
- Match Dockerfile Bun version to local version
- Or regenerate lockfile: `rm bun.lock && bun install`

### Step-level `when` not working
- Woodpecker 2.x+ uses workflow-level `when` as a list:
  ```yaml
  when:
    - event: push
      branch: main
  ```
- Not step-level maps like Drone CI used

## 6. Checklist for New Projects

- [ ] Create `.woodpecker.yml` with workflow-level `when` list
- [ ] Add `docker_username` and `docker_password` secrets
- [ ] Add app-specific secrets
- [ ] Create Dockerfile with matching runtime version
- [ ] Create `k8s/` manifests with `IMAGE_TAG` placeholder
- [ ] Ensure `/health` endpoint exists in app
- [ ] Verify `woodpecker-deployer` SA has permissions in target namespace
