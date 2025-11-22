"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Container,
  Cpu,
  HardDrive,
  Network,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ClusterNode, GraphNode, NamespaceNode, PodNode, ServiceNode } from "@/lib/apischema";
import styles from "./ResourceDetailPanel.module.css";

interface ResourceDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

const BANNER_HEIGHT = 60; // Height of the top banner

export const ResourceDetailPanel: React.FC<ResourceDetailPanelProps> = ({ node, onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ top: BANNER_HEIGHT + 16 }); // Start below banner
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, startTop: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      return;
    }

    // Don't start drag if clicking on buttons
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      startTop: position.top,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;

      const deltaY = e.clientY - dragStartRef.current.y;
      const newTop = dragStartRef.current.startTop + deltaY;

      // Constrain to viewport with banner consideration
      const panelHeight = panelRef.current.offsetHeight;
      const maxTop = window.innerHeight - panelHeight - 16;
      const minTop = BANNER_HEIGHT + 16;

      setPosition({
        top: Math.max(minTop, Math.min(newTop, maxTop)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
  };

  if (!node) return null;

  const renderPodDetails = (pod: PodNode) => {
    return (
      <>
        {/* Status Section */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Status</div>
          <div className={styles.metricCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Phase</span>
              <span className={`${styles.statusBadge} ${styles.statusRunning}`}>{pod.status}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Pod IP</span>
              <span className={styles.infoValue}>{pod.pod_ip || "N/A"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Host IP</span>
              <span className={styles.infoValue}>{pod.host_ip || "N/A"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Node</span>
              <span className={styles.infoValue}>{pod.node_name || "N/A"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>QoS Class</span>
              <span className={styles.infoValue}>{pod.qos_class || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Containers Section */}
        {pod.containers && pod.containers.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Container size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Containers ({pod.containers.length})
            </div>
            {pod.containers.map((container, idx) => (
              <div key={idx} className={styles.containerCard}>
                <div className={styles.containerName}>{container.name}</div>
                <div className={styles.containerImage}>{container.image}</div>

                {/* Resource Requests/Limits */}
                {container.resources && (
                  <div style={{ marginTop: "0.75rem" }}>
                    {container.resources.requests && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Requests</span>
                        <span className={styles.infoValue}>
                          {container.resources.requests.cpu || "—"} /{" "}
                          {container.resources.requests.memory || "—"}
                        </span>
                      </div>
                    )}
                    {container.resources.limits && (
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Limits</span>
                        <span className={styles.infoValue}>
                          {container.resources.limits.cpu || "—"} /{" "}
                          {container.resources.limits.memory || "—"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Ports */}
                {container.ports && container.ports.length > 0 && (
                  <div className={styles.portsList}>
                    {container.ports.map((port, portIdx) => (
                      <span key={portIdx} className={styles.portBadge}>
                        {port.name ? `${port.name}:` : ""}
                        {port.container_port}/{port.protocol}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Metrics Section */}
        {pod.metrics && pod.metrics.containers && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Cpu size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Live Metrics
            </div>
            {pod.metrics.containers.map((containerMetric, idx) => (
              <div key={idx} className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <div className={styles.metricLabel}>{containerMetric.name}</div>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>CPU</span>
                  <span className={styles.metricValue}>{containerMetric.usage.cpu || "N/A"}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Memory</span>
                  <span className={styles.metricValue}>
                    {containerMetric.usage.memory || "N/A"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Volumes Section */}
        {pod.volumes && pod.volumes.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <HardDrive size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Volumes ({pod.volumes.length})
            </div>
            {pod.volumes.map((volume, idx) => (
              <div key={idx} className={styles.infoRow}>
                <span className={styles.infoLabel}>{volume.name}</span>
                <span className={styles.infoValue}>{volume.type || "Unknown"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Labels */}
        {pod.labels && Object.keys(pod.labels).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Labels</div>
            <div>
              {Object.entries(pod.labels).map(([key, value]) => (
                <span key={key} className={styles.labelTag}>
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Events */}
        {pod.events && pod.events.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Clock size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Recent Events
            </div>
            <div className={styles.eventsList}>
              {pod.events.slice(0, 5).map((event, idx) => (
                <div
                  key={idx}
                  className={`${styles.eventItem} ${event.type === "Warning" ? styles.eventItemWarning : ""}`}
                >
                  <div className={styles.eventReason}>{event.reason}</div>
                  <div className={styles.eventMessage}>{event.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderNodeDetails = (node: ClusterNode) => {
    return (
      <>
        {/* Status Section */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Status</div>
          <div className={styles.metricCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Status</span>
              <span
                className={`${styles.statusBadge} ${node.status === "ready" ? styles.statusReady : styles.statusFailed}`}
              >
                {node.status}
              </span>
            </div>
            {node.addresses &&
              Object.entries(node.addresses).map(([type, addr]) => (
                <div key={type} className={styles.infoRow}>
                  <span className={styles.infoLabel}>{type}</span>
                  <span className={styles.infoValue}>{addr}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Capacity Section */}
        {node.capacity && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Cpu size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Capacity
            </div>
            <div className={styles.metricCard}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>CPU</span>
                <span className={styles.metricValue}>{node.capacity.cpu || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Memory</span>
                <span className={styles.metricValue}>{node.capacity.memory || "N/A"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Pods</span>
                <span className={styles.metricValue}>{node.capacity.pods || "N/A"}</span>
              </div>
              {node.capacity.ephemeral_storage && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Storage</span>
                  <span className={styles.metricValue}>{node.capacity.ephemeral_storage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Node Info */}
        {node.node_info && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Node Info</div>
            <div className={styles.metricCard}>
              {node.node_info.os_image && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>OS</span>
                  <span className={styles.infoValue}>{node.node_info.os_image}</span>
                </div>
              )}
              {node.node_info.kernel_version && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Kernel</span>
                  <span className={styles.infoValue}>{node.node_info.kernel_version}</span>
                </div>
              )}
              {node.node_info.container_runtime && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Runtime</span>
                  <span className={styles.infoValue}>{node.node_info.container_runtime}</span>
                </div>
              )}
              {node.node_info.kubelet_version && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Kubelet</span>
                  <span className={styles.infoValue}>{node.node_info.kubelet_version}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Labels */}
        {node.labels && Object.keys(node.labels).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Labels</div>
            <div>
              {Object.entries(node.labels)
                .slice(0, 10)
                .map(([key, value]) => (
                  <span key={key} className={styles.labelTag}>
                    {key}: {value}
                  </span>
                ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderServiceDetails = (service: ServiceNode) => {
    return (
      <>
        {/* Service Type */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Configuration</div>
          <div className={styles.metricCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Type</span>
              <span className={`${styles.statusBadge} ${styles.statusReady}`}>
                {service.status}
              </span>
            </div>
            {service.cluster_ip && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Cluster IP</span>
                <span className={styles.infoValue}>{service.cluster_ip}</span>
              </div>
            )}
            {service.session_affinity && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Session Affinity</span>
                <span className={styles.infoValue}>{service.session_affinity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ports */}
        {service.ports && service.ports.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Network size={14} style={{ display: "inline", marginRight: "0.5rem" }} />
              Ports ({service.ports.length})
            </div>
            {service.ports.map((port, idx) => (
              <div key={idx} className={styles.metricCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Port</span>
                  <span className={styles.metricValue}>
                    {port.port} → {port.target_port}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Protocol</span>
                  <span className={styles.infoValue}>{port.protocol}</span>
                </div>
                {port.node_port && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Node Port</span>
                    <span className={styles.infoValue}>{port.node_port}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Endpoints */}
        {service.endpoints && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Endpoints</div>
            <div className={styles.metricCard}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Ready</span>
                <span className={styles.metricValue}>{service.endpoints.ready}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Not Ready</span>
                <span className={styles.metricValue}>{service.endpoints.not_ready}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selectors */}
        {service.selectors && Object.keys(service.selectors).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Selectors</div>
            <div>
              {Object.entries(service.selectors).map(([key, value]) => (
                <span key={key} className={styles.labelTag}>
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderNamespaceDetails = (namespace: NamespaceNode) => {
    return (
      <>
        {/* Resource Count */}
        {namespace.resource_count && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Resources</div>
            <div className={styles.metricCard}>
              {Object.entries(namespace.resource_count).map(([key, value]) => (
                <div key={key} className={styles.infoRow}>
                  <span className={styles.infoLabel}>{key}</span>
                  <span className={styles.metricValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource Quotas */}
        {namespace.resource_quotas && namespace.resource_quotas.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Resource Quotas</div>
            {namespace.resource_quotas.map((quota, idx) => (
              <div key={idx} className={styles.metricCard}>
                <div className={styles.containerName}>{quota.name}</div>
                {Object.entries(quota.hard).map(([key, value]) => {
                  const used = quota.used[key] || "0";
                  return (
                    <div key={key} className={styles.infoRow}>
                      <span className={styles.infoLabel}>{key}</span>
                      <span className={styles.infoValue}>
                        {used} / {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Labels */}
        {namespace.labels && Object.keys(namespace.labels).length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Labels</div>
            <div>
              {Object.entries(namespace.labels).map(([key, value]) => (
                <span key={key} className={styles.labelTag}>
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderContent = () => {
    switch (node.type) {
      case "pod":
        return renderPodDetails(node);
      case "node":
        return renderNodeDetails(node);
      case "service":
        return renderServiceDetails(node);
      case "namespace":
        return renderNamespaceDetails(node);
      default:
        return <div className={styles.emptyState}>No details available</div>;
    }
  };

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${isCollapsed ? styles.collapsed : ""} ${isDragging ? styles.dragging : ""}`}
      style={{ top: `${position.top}px` }}
      onMouseDown={handleMouseDown}
    >
      <div className={styles.header}>
        {!isCollapsed && (
          <div className={styles.titleSection}>
            <div className={styles.resourceType}>{node.type}</div>
            <h2 className={styles.resourceName}>{node.label}</h2>
          </div>
        )}
        {isCollapsed && <div className={styles.collapsedIcon}>{node.type}</div>}
        <div className={styles.headerButtons}>
          <button
            className={styles.collapseButton}
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {!isCollapsed && <div className={styles.content}>{renderContent()}</div>}
    </div>
  );
};
