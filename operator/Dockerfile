FROM python:3.11-slim

# Install dependencies
RUN apt-get update && apt-get install -y curl

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

WORKDIR /app
COPY main.py .

CMD ["python", "main.py"]
