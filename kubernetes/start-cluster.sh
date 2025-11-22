#!/usr/bin/env sh
set -e

: "${KIND_CLUSTER_NAME:=carakube-demo}"
: "${GITOPS_REPO:=https://github.com/SamuelLess/hackatum-k8s-flux}"
: "${GIT_BRANCH:=main}"
: "${GIT_PATH:=clusters/carakube-demo}"

# Start the Docker daemon (from docker:dind)
dockerd-entrypoint.sh &

echo "Waiting for Docker daemon..."
until docker info >/dev/null 2>&1; do
  sleep 1
done
echo "Docker daemon is up."

# Create kind cluster if it doesn't exist
if ! kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER_NAME}$"; then
  echo "No kind clusters found. Creating kind cluster: $KIND_CLUSTER_NAME"
  if [ -f /kind-config.yaml ]; then
    kind create cluster --name "$KIND_CLUSTER_NAME" --config=/kind-config.yaml
  else
    kind create cluster --name "$KIND_CLUSTER_NAME"
  fi
else
  echo "Kind cluster '$KIND_CLUSTER_NAME' already exists."
fi

# 🔑 ALWAYS regenerate kubeconfig, even if cluster already existed
echo "Writing kubeconfig for cluster $KIND_CLUSTER_NAME..."
mkdir -p /root/.kube
kind get kubeconfig --name "$KIND_CLUSTER_NAME" > /root/.kube/config
export KUBECONFIG=/root/.kube/config

# Optional: wait for API to be responsive
echo "Waiting for Kubernetes API to become ready..."
until kubectl get --raw=/healthz >/dev/null 2>&1; do
  sleep 2
done
echo "Kubernetes API is ready."

# Install Flux controllers (idempotent)
if ! kubectl get namespace flux-system >/dev/null 2>&1; then
  echo "Installing Flux into the cluster..."
  flux install
else
  echo "Flux already installed."
fi

# Clone GitOps repo if you still want that here (may need auth tweaks later)
if [ ! -d /repo ]; then
  echo "Cloning GitOps repo: $GITOPS_REPO (branch: $GIT_BRANCH)"
  git clone --branch "$GIT_BRANCH" "$GITOPS_REPO" /repo || echo "WARNING: git clone failed (check repo visibility/auth)."
else
  echo "GitOps repo already present, pulling latest."
  (cd /repo && git fetch && git checkout "$GIT_BRANCH" && git pull --ff-only) || echo "WARNING: git update failed."
fi

if [ -d "/repo/$GIT_PATH" ]; then
  echo "Applying manifests from /repo/$GIT_PATH via kustomize..."
  kubectl apply -k "/repo/$GIT_PATH" || echo "WARNING: kubectl apply failed."
else
  echo "WARNING: /repo/$GIT_PATH not found. Adjust GIT_PATH or repo layout."
fi

echo "Cluster + Flux setup complete. Keeping container alive."
tail -f /dev/null
