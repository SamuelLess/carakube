FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y curl

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install uv
RUN pip install uv

WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
COPY main.py .

# Install dependencies from uv.lock
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "main.py"]
