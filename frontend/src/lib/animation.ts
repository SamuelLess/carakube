// src/lib/animation.ts

interface Updatable {
  update: () => void;
}

class AnimationManager {
  private updatables = new Set<Updatable>();
  private frameId: number | null = null;

  private loop = () => {
    if (this.updatables.size === 0) {
      this.frameId = null;
      return; // Stop the loop if no items are registered
    }

    this.updatables.forEach((item) => item.update());
    this.frameId = requestAnimationFrame(this.loop);
  };

  public add(item: Updatable) {
    this.updatables.add(item);
    if (this.frameId === null) {
      // Start the loop if it's not already running
      this.frameId = requestAnimationFrame(this.loop);
    }
  }

  public remove(item: Updatable) {
    this.updatables.delete(item);
  }
}

// Export a singleton instance of the manager
export const animationManager = new AnimationManager();
