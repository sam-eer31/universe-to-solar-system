export interface ZoomCircle {
  id: string;
  centerX: number;      // 0 to 1 relative to image width
  centerY: number;      // 0 to 1 relative to image height
  radius: number;       // 0 to 1 relative to image width/height (usually based on width)
  targetSceneId: string;
  cameraOffset: {
    x: number;
    y: number;
    z: number;
  };
  transitionDuration: number;
  zoomMultiplier: number;
  optionalRotation: number;
  notes?: string;
}

export interface SceneLayer {
  id: string;
  title: string;
  image: string;       // path to the image
  depth: number;       // z position in 3d space
  scale: number;       // base scale of the image
  rotation: number;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  opacity: number;
  feathering?: number; // 0 to 1
  circles?: ZoomCircle[]; // DEPRECATED
  transitionSpeed: number;
}

export interface UniverseData {
  scenes: SceneLayer[];
  cameraSettings: {
    baseFov: number;
    maxDepth: number;
    finalCircle?: {
      x: number;
      y: number;
      radius: number;
    };
    hasSolarSystem?: boolean;
  };
}
