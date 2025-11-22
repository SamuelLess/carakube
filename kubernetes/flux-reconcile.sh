#!/usr/bin/env bash
# Hardcoded, host-run script to reconcile Flux inside a Docker-in-Docker + kind container.
# - Forces the GitRepository to pull latest commits
# - Reconciles the flux-system Kustomization (and optionally all Kustomizations)
# NOTE: Values are hardcoded below and used via variables (no env overrides).

set -euo pipefail

########################################
# HARD-CODED SETTINGS (edit here)
########################################
# Docker container that runs docker:dind + kind + flux
CONTAINER_NAME="carakube-cluster-1"

# kind / repo metadata (informational, not strictly required for reconcile)
KIND_CLUSTER_NAME="carakube-demo"
GITOPS_REPO="https://github.com/SamuelLess/hackatum-k8s-flux"
GIT_BRANCH="main"
GIT_PATH="clusters/carakube-demo/flux-system"

# Flux object names
FLUX_NAMESPACE="flux-system"
GIT_SOURCE_NAME="flux-system"     # flux reconcile source git <name>
KUSTOMIZATION_NAME="flux-system"  # flux reconcile kustomization <name>

# Behavior
RECONCILE_ALL_KUSTOMIZATIONS=true  # set to true to reconcile every Kustomization across all namespaces
RECONCILE_TIMEOUT="2m"

########################################
# Helpers
########################################
inc() {
  # Run a command INSIDE the container with kubeconfig set
  docker exec "${CONTAINER_NAME}" bash -lc "export KUBECONFIG=/root/.kube/config; $*"
}

########################################
# Checks
########################################
echo "==> Verifying container '${CONTAINER_NAME}' is running..."
if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "ERROR: Container '${CONTAINER_NAME}' not found or not running." >&2
  exit 1
fi

echo "==> Checking kubectl and cluster access..."
inc "kubectl version >/dev/null"

echo "==> Checking flux CLI..."
inc "flux --version >/dev/null"

########################################
# Reconcile
########################################
echo "==> Current status of GitRepository:"
inc "flux get sources git ${GIT_SOURCE_NAME} -n ${FLUX_NAMESPACE}" || true

echo "==> Forcing Git re-pull via Flux GitRepository '${GIT_SOURCE_NAME}' in ns '${FLUX_NAMESPACE}'..."
# Added --verbose for more details
# Added || true so we can print debug info if it fails, or we can let it fail if set -e handles it.
# But user wants to know "Why is this failing?". If it fails, the script exits.
# Let's use || true to capture failure, print status, then exit.
if ! inc "flux reconcile source git ${GIT_SOURCE_NAME} -n ${FLUX_NAMESPACE} --timeout=${RECONCILE_TIMEOUT} --verbose"; then
  echo "❌ Reconcile failed! Checking GitRepository status for errors..."
  inc "kubectl get gitrepository ${GIT_SOURCE_NAME} -n ${FLUX_NAMESPACE} -o yaml"
  exit 1
fi

if [[ "${RECONCILE_ALL_KUSTOMIZATIONS}" == "true" ]]; then
  echo "==> Reconciling ALL Kustomizations across all namespaces (with-source)..."
  # List as ns|name, then loop
  KS_LIST=()
  while IFS= read -r line; do
    KS_LIST+=("$line")
  done < <(inc "kubectl get kustomizations -A -o jsonpath='{range .items[*]}{.metadata.namespace}{\"|\"}{.metadata.name}{\"\\n\"}{end}'" | tr -d '\r')

  if [[ ${#KS_LIST[@]} -eq 0 ]]; then
    echo "No Kustomizations found."
  else
    for entry in "${KS_LIST[@]}"; do
      ks_ns=${entry%%|*}
      ks_name=${entry##*|}
      echo "----> Reconciling ${ks_ns}/${ks_name}"
      inc "flux reconcile kustomization ${ks_name} -n ${ks_ns} --with-source --timeout=${RECONCILE_TIMEOUT}"
    done
  fi
else
  echo "==> Reconciling Kustomization '${KUSTOMIZATION_NAME}' in ns '${FLUX_NAMESPACE}' (with-source)..."
  inc "flux reconcile kustomization ${KUSTOMIZATION_NAME} -n ${FLUX_NAMESPACE} --with-source --timeout=${RECONCILE_TIMEOUT}"
fi

echo "✅ Reconcile complete for repo ${GITOPS_REPO} (branch: ${GIT_BRANCH}, path: ${GIT_PATH})."
