FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y curl supervisor git

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install uv
RUN pip install uv

WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
COPY main.py .
COPY scanner/ scanner/
COPY autofix/ autofix/

# Install dependencies from uv.lock
RUN uv sync --frozen --no-dev

# Create output directory for scanner
RUN mkdir -p /app/scanner_output

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

# Run both processes with supervisor
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

