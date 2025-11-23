<p align="center">
  <img src="https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/carakube-logo.png" alt="CaraKube Logo" width="300"/>
</p>

## [CaraKube](https://carakube.dev) - Autonomous Kubernetes Security & Remediation

<p align="center">
  <img src="https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/overview.png" alt="CaraKube Overview" width="800"/>
</p>

Kubernetes security is overwhelming. Developers are stuck in "YAML hell," which creates critical vulnerabilities where misconfigurations hide in hundreds of files. Existing tools detect problems but require manual fixes that break GitOps workflows. We built CaraKube to autonomously solve this.

**What it does**: CaraKube continuously monitors your cluster, detects security risks (privilege escalation, missing limits, exposed secrets), and autonomously fixes them. We developed an interactive React Flow dashboard visualizing cluster topology with color-coded health indicators. Click compromised nodes to view vulnerabilities and trigger auto-remediation.

**How we built it**: We created a custom Python scanner using the Kubernetes API for real-time analysis. When issues are detected, Google Gemini generates context-aware YAML patches. Next, we orchestrated GitHub API integration to create Pull Requests against your infrastructure repository, preserving Flux as the single source of truth.

**Our achievement**: We built everything from scratch, including the visualization layer, scanner logic, and agent. We achieved detection-to-mergeable-PR in seconds with a modular, extendable architecture, minimal cluster overhead, and production-ready patch accuracy through constrained LLM context.

We transformed Kubernetes security from reactive firefighting into proactive, autonomous protection, empowering teams to maintain secure clusters without drowning in YAML.

### Cluster at a glance

![Demo 0](https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/Demo%200.gif)

### Agent-powered PR-creation
<p align="center">
  <img src="https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/Demo%201.gif" alt="Demo 1" width="30%" style="vertical-align: top;"/>
  <img src="https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/Demo%202.gif" alt="Demo 2" width="68%" style="vertical-align: top;"/>
</p>

---
## Try the live demo

<p align="center">  
  <img src="https://raw.githubusercontent.com/SamuelLess/carakube/refs/heads/main/docs/carakube-qr-code.png" alt="Demo QR Code" width="200"/>
</p>

<center>

Scan the QR code or visit [carakube.dev](https://carakube.dev/) to access the live demo.
</center>