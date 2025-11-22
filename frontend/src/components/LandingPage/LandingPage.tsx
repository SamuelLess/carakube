"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  Shield,
  Target,
  Terminal,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TerminalAnimation } from "../TerminalAnimation";
import styles from "./LandingPage.module.css";

interface ClusterStatus {
  healthy: boolean;
  nodes: number;
  pods: number;
  services: number;
  vulnerabilities: number;
}

interface ApiNode {
  type: string;
  vulnerabilities?: Array<unknown>;
}

interface ApiResponse {
  status: string;
  data?: {
    nodes?: ApiNode[];
  };
}

export const LandingPage = () => {
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/graph");
        const data: ApiResponse = await response.json();

        if (data.status === "success" && data.data) {
          const nodes = data.data.nodes || [];
          const vulnerabilities = nodes.reduce(
            (acc: number, node: ApiNode) => acc + (node.vulnerabilities?.length || 0),
            0
          );

          setClusterStatus({
            healthy: true,
            nodes: nodes.filter((n: ApiNode) => n.type === "node").length,
            pods: nodes.filter((n: ApiNode) => n.type === "pod").length,
            services: nodes.filter((n: ApiNode) => n.type === "service").length,
            vulnerabilities,
          });
        }
      } catch (error) {
        console.error("Failed to fetch cluster status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.landing}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>
              <Activity size={14} />
              <span>Siemens HackaTUM 2025 Challenge</span>
            </div>

            <h1 className={styles.title}>
              Kubernetes Security
              <br />
              <span className={styles.gradient}>Scanner & Remediation Tool</span>
            </h1>

            <p className={styles.subtitle}>
              Automatically detect misconfigurations and security vulnerabilities in Kubernetes
              environments. Built to demonstrate automated security scanning, intelligent
              remediation suggestions, and real-time cluster monitoring.
            </p>

            <div className={styles.cta}>
              <Link href="/demo" className={styles.primaryButton}>
                <Terminal size={18} />
                View Live Demo
                <ArrowRight size={18} />
              </Link>
              <a href="#challenge" className={styles.secondaryButton}>
                Learn More
              </a>
            </div>

            <div className={styles.installSection}>
              <div className={styles.installLabel}>
                <Zap size={16} />
                <span>Quick Install • One Command • Production Ready</span>
              </div>
            </div>

            {/* Live Status */}
            {!isLoading && clusterStatus && (
              <div className={styles.liveStatus}>
                <div className={styles.statusIndicator}>
                  <div className={styles.pulse} />
                  <Link href="/demo" style={{ textDecoration: "none", color: "inherit" }}>
                    <span style={{ cursor: "pointer" }}>Live Cluster Data</span>
                  </Link>
                </div>
                <div className={styles.metrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{clusterStatus.nodes}</span>
                    <span className={styles.metricLabel}>Nodes</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{clusterStatus.pods}</span>
                    <span className={styles.metricLabel}>Pods</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{clusterStatus.services}</span>
                    <span className={styles.metricLabel}>Services</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{clusterStatus.vulnerabilities}</span>
                    <span className={styles.metricLabel}>Issues</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Animation */}
          <div className={styles.heroVisual}>
            <TerminalAnimation />
          </div>
        </div>
      </section>

      {/* Motivation Section */}
      <section className={styles.features} id="challenge">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>The Challenge</h2>
          <p className={styles.sectionSubtitle}>
            Why Kubernetes security matters in today&apos;s cloud-native world
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <AlertTriangle size={24} />
              </div>
              <h3 className={styles.featureTitle}>The Threat Landscape</h3>
              <p className={styles.featureDescription}>
                Recent cloud infrastructure breaches at Microsoft, AMD & Intel cloud
                vulnerabilities, and supply chain attacks (remember xz/liblzma?) highlight the
                critical need for automated security detection.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Cloud outages impact millions</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Misconfigurations are widespread</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Supply chain compromises increasing</span>
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Target size={24} />
              </div>
              <h3 className={styles.featureTitle}>The Solution</h3>
              <p className={styles.featureDescription}>
                Build a tool that automatically detects security vulnerabilities and
                misconfigurations in Kubernetes environments, with intelligent remediation
                suggestions or automated fixes.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Automated vulnerability scanning</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Configuration analysis</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Actionable remediation guidance</span>
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <TrendingUp size={24} />
              </div>
              <h3 className={styles.featureTitle}>The Approach</h3>
              <p className={styles.featureDescription}>
                Multiple approaches possible: CI/CD integration, admission controller, in-cluster
                scanner, or ML-based analysis. The key is making it maintainable, scalable, and
                accurate.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Real-time or scheduled scanning</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>GitOps-friendly deployment</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Low operational overhead</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Section */}
      <section className={styles.features} id="features">
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Our Implementation</h2>
          <p className={styles.sectionSubtitle}>
            A comprehensive security scanning solution demonstrating the core capabilities
          </p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Shield size={24} />
              </div>
              <h3 className={styles.featureTitle}>6 Security Scans</h3>
              <p className={styles.featureDescription}>
                Automated detection of secrets, misconfigurations, RBAC wildcards, exposed services,
                container images, and workload vulnerabilities.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Base64 secret detection</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>RBAC privilege analysis</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Ingress TLS validation</span>
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Eye size={24} />
              </div>
              <h3 className={styles.featureTitle}>Topology Visualization</h3>
              <p className={styles.featureDescription}>
                Interactive graph showing relationships between namespaces, pods, services, and
                nodes with real-time vulnerability highlighting.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>ReactFlow-powered graphs</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Auto-layout algorithms</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Real-time updates</span>
                </div>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Zap size={24} />
              </div>
              <h3 className={styles.featureTitle}>Continuous Monitoring</h3>
              <p className={styles.featureDescription}>
                In-cluster daemon continuously scans for issues, exposing findings through REST API
                with detailed remediation suggestions.
              </p>
              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Python Kubernetes client</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>FastAPI REST endpoints</span>
                </div>
                <div className={styles.featureItem}>
                  <Check size={16} />
                  <span>Minimal resource overhead</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className={styles.architecture}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Architecture</h2>
          <p className={styles.sectionSubtitle}>
            Simple, scalable design for enterprise Kubernetes
          </p>

          <div className={styles.archDiagram}>
            <div className={styles.archStep}>
              <div className={styles.archNumber}>01</div>
              <h4>Cluster Scanner</h4>
              <p>Kubernetes Python client scans all namespaces</p>
              <code>ClusterScanner.scan()</code>
            </div>
            <div className={styles.archArrow}>→</div>
            <div className={styles.archStep}>
              <div className={styles.archNumber}>02</div>
              <h4>Graph Builder</h4>
              <p>Converts resources to nodes & links</p>
              <code>GraphBuilder.build()</code>
            </div>
            <div className={styles.archArrow}>→</div>
            <div className={styles.archStep}>
              <div className={styles.archNumber}>03</div>
              <h4>FastAPI</h4>
              <p>REST API exposes graph data</p>
              <code>GET /api/graph</code>
            </div>
            <div className={styles.archArrow}>→</div>
            <div className={styles.archStep}>
              <div className={styles.archNumber}>04</div>
              <h4>Next.js UI</h4>
              <p>ReactFlow visualization</p>
              <code>useGraphStore()</code>
            </div>
          </div>

          <div className={styles.techStack}>
            <div className={styles.stackItem}>
              <span className={styles.stackLabel}>Backend</span>
              <span className={styles.stackValue}>Python 3.9+ • FastAPI • Kubernetes Client</span>
            </div>
            <div className={styles.stackItem}>
              <span className={styles.stackLabel}>Frontend</span>
              <span className={styles.stackValue}>
                Next.js 16 • React 19 • ReactFlow • TypeScript
              </span>
            </div>
            <div className={styles.stackItem}>
              <span className={styles.stackLabel}>Infrastructure</span>
              <span className={styles.stackValue}>Docker Compose • Traefik • Kind</span>
            </div>
          </div>
        </div>
      </section>

      {/* Evaluation Criteria Section */}
      <section className={styles.pricing}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Evaluation Criteria</h2>
          <p className={styles.sectionSubtitle}>What makes a great Kubernetes security scanner?</p>

          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <div className={styles.pricingHeader}>
                <h3>Detection Quality</h3>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>
                  <Check size={16} />
                  Accurately finds misconfigurations
                </li>
                <li>
                  <Check size={16} />
                  Covers broad attack surface
                </li>
                <li>
                  <Check size={16} />
                  Minimizes false positives
                </li>
                <li>
                  <Check size={16} />
                  Provides clear, actionable feedback
                </li>
              </ul>
            </div>

            <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
              <div className={styles.featuredBadge}>Core Focus</div>
              <div className={styles.pricingHeader}>
                <h3>Operational Excellence</h3>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>
                  <Check size={16} />
                  Easy to deploy and use
                </li>
                <li>
                  <Check size={16} />
                  Simple to maintain and extend
                </li>
                <li>
                  <Check size={16} />
                  Scales with cluster size
                </li>
                <li>
                  <Check size={16} />
                  Minimal resource overhead
                </li>
                <li>
                  <Check size={16} />
                  Fast deployment time
                </li>
              </ul>
            </div>

            <div className={styles.pricingCard}>
              <div className={styles.pricingHeader}>
                <h3>Innovation</h3>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>
                  <Check size={16} />
                  Novel detection approaches
                </li>
                <li>
                  <Check size={16} />
                  Intelligent remediation
                </li>
                <li>
                  <Check size={16} />
                  Extensible architecture
                </li>
                <li>
                  <Check size={16} />
                  Integration-friendly design
                </li>
                <li>
                  <Check size={16} />
                  Significant original contribution
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <div className={styles.ctaContent}>
            <h2>Ready to explore the demo?</h2>
            <p>See our Kubernetes security scanner in action with live cluster data</p>
            <Link href="/demo" className={styles.ctaButton}>
              <Terminal size={18} />
              View Live Demo
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
