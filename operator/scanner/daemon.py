"""Standalone cluster scanner daemon"""
import asyncio
import signal
import sys
from scanner.cluster_scanner import ClusterScanner


class ScannerDaemon:
    """Daemon that runs the cluster scanner continuously"""
    
    def __init__(self, interval: int = 120):
        self.scanner = ClusterScanner()
        self.interval = interval
        self.running = True
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        print(f"\n🛑 Received signal {signum}, shutting down...", flush=True)
        self.running = False
    
    async def run(self):
        """Main scanner loop"""
        kubeconfig_path = "/kubeconfig/config"
        
        print("🔍 Scanner Daemon starting...", flush=True)
        print(f"📁 Output directory: {self.scanner.output_dir}", flush=True)
        print(f"⏱️  Scan interval: {self.interval} seconds", flush=True)
        
        # Wait for kubeconfig
        import os
        while not os.path.exists(kubeconfig_path) and self.running:
            print(f"⏳ Waiting for kubeconfig at {kubeconfig_path}...", flush=True)
            await asyncio.sleep(5)
        
        if not self.running:
            return
        
        print("✅ Kubeconfig found! Starting scans...", flush=True)
        
        while self.running:
            try:
                print(f"📊 Running cluster scan...", flush=True)
                scan_data = self.scanner.run_and_save()
                print(f"✨ Scan completed: {scan_data['timestamp']}", flush=True)
            except Exception as e:
                print(f"❌ Scan error: {e}", flush=True)
            
            # Sleep with periodic checks for shutdown signal
            for _ in range(self.interval):
                if not self.running:
                    break
                await asyncio.sleep(1)
        
        print("👋 Scanner daemon stopped gracefully", flush=True)


async def main():
    """Entry point for scanner daemon"""
    daemon = ScannerDaemon(interval=10)
    await daemon.run()


if __name__ == "__main__":
    asyncio.run(main())
