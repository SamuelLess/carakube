# Docker-in-Docker base so kind can run its node containers
FROM docker:24-dind

# Versions (adjust if you like)
ARG KUBECTL_VERSION=v1.30.0
ARG KIND_VERSION=v0.23.0
ARG FLUX_VERSION=v2.3.0

# Install basic tools
RUN apk add --no-cache bash curl git ca-certificates

# Install kubectl
RUN curl -L "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
    -o /usr/local/bin/kubectl \
 && chmod +x /usr/local/bin/kubectl

# Install kind
RUN curl -L "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-amd64" \
    -o /usr/local/bin/kind \
 && chmod +x /usr/local/bin/kind

# Install flux CLI
RUN curl -L "https://github.com/fluxcd/flux2/releases/download/${FLUX_VERSION}/flux_${FLUX_VERSION#v}_linux_amd64.tar.gz" \
    -o /tmp/flux.tar.gz \
 && tar -xzf /tmp/flux.tar.gz -C /tmp \
 && mv /tmp/flux /usr/local/bin/flux \
 && chmod +x /usr/local/bin/flux \
 && rm /tmp/flux.tar.gz

# Optional: kind cluster config (you can tweak this or delete COPY if you don't use it)
COPY kind-config.yaml /kind-config.yaml

# Startup script: creates kind cluster, installs flux, applies your repo
COPY start-cluster.sh /usr/local/bin/start-cluster.sh
RUN chmod +x /usr/local/bin/start-cluster.sh

# Defaults – override via docker-compose env if needed
ENV KIND_CLUSTER_NAME=carakube-demo \
    GITOPS_REPO=https://github.com/SamuelLess/hackatum-k8s-flux \
    GIT_BRANCH=main \
    GIT_PATH=clusters/carakube-demo/flux-system

# docker:dind entrypoint starts dockerd; our script will launch it
CMD ["/usr/local/bin/start-cluster.sh"]
