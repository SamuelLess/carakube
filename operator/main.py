import time
import subprocess
import os

def main():
    print("Operator started...", flush=True)

    # Path to kubeconfig
    kubeconfig_path = os.environ.get("KUBECONFIG", "/kubeconfig/config")

    # Wait for kubeconfig file to exist
    print(f"Waiting for kubeconfig at {kubeconfig_path}...", flush=True)
    while not os.path.exists(kubeconfig_path):
        time.sleep(2)
        print("Waiting for kubeconfig...", flush=True)

    print("Kubeconfig found!", flush=True)

    # Simple loop to check cluster status
    while True:
        try:
            print("\n--- Cluster Nodes ---", flush=True)
            subprocess.run(["kubectl", "get", "nodes"], check=True)

            print("\n--- Flux System Pods ---", flush=True)
            subprocess.run(["kubectl", "get", "pods", "-n", "flux-system"], check=False) # might fail if ns doesn't exist yet

        except subprocess.CalledProcessError as e:
            print(f"Error communicating with cluster: {e}", flush=True)
        except Exception as e:
            print(f"Unexpected error: {e}", flush=True)

        time.sleep(5)

if __name__ == "__main__":
    main()
