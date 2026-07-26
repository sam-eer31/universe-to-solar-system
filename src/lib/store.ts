import { create } from 'zustand';
import { temporal } from 'zundo';
import { UniverseData, SceneLayer, ZoomCircle } from '@/types/universe';

interface AppState {
  isDevMode: boolean;
  toggleDevMode: () => void;
  universeData: UniverseData | null;
  setUniverseData: (data: UniverseData) => void;
  
  liveDrag: {
    sourceIndex: number;
    deltaX: number;
    deltaY: number;
    scaleRatio: number;
    originX: number;
    originY: number;
  } | null;
  
  activeSceneId: string | null;
  setActiveSceneId: (id: string) => void;

  selectedCircleId: string | null;
  setSelectedCircleId: (id: string | null) => void;

  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
  
  updateScene: (sceneId: string, data: Partial<SceneLayer>) => void;
  deleteScene: (sceneId: string) => void;
  updateCircle: (sceneId: string, circleId: string, data: Partial<ZoomCircle>) => void;
  addCircle: (sceneId: string, circle: ZoomCircle) => void;
  deleteCircle: (sceneId: string, circleId: string) => void;
  
  setFinalCircle: (circle: { x: number; y: number; radius: number }) => void;
  removeFinalCircle: () => void;

  focusedPlanet: { name: string; distance: number } | null;
  setFocusedPlanet: (planet: { name: string; distance: number } | null) => void;

  planetZoom: number;
  setPlanetZoom: (zoom: number | ((prev: number) => number)) => void;
}

export const useAppStore = create<AppState>()(
  temporal(
    (set) => ({
      isDevMode: process.env.NODE_ENV === 'development', // default true in dev
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  
  universeData: null,
  setUniverseData: (data) => set({ universeData: data }),
  
  liveDrag: null,
  
  activeSceneId: null,
  setActiveSceneId: (id) => set({ activeSceneId: id }),

  selectedCircleId: null,
  setSelectedCircleId: (id) => set({ selectedCircleId: id }),

  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),

  focusedPlanet: null,
  setFocusedPlanet: (planet) => set({ focusedPlanet: planet, planetZoom: 1.0 }),

  planetZoom: 1.0,
  setPlanetZoom: (zoom) => set((state) => ({ 
    planetZoom: typeof zoom === 'function' ? zoom(state.planetZoom) : zoom 
  })),

  updateScene: (sceneId, data) => set((state) => {
    if (!state.universeData) return state;
    
    const sourceIndex = state.universeData.scenes.findIndex(s => s.id === sceneId);
    if (sourceIndex === -1) return state;
    
    const sourceScene = state.universeData.scenes[sourceIndex];
    
    // Calculate deltas based on what is provided
    let deltaX = 0;
    let deltaY = 0;
    let scaleRatio = 1;
    
    if (data.position && data.position.x !== undefined) deltaX = data.position.x - sourceScene.position.x;
    if (data.position && data.position.y !== undefined) deltaY = data.position.y - sourceScene.position.y;
    if (data.scale !== undefined) scaleRatio = data.scale / sourceScene.scale;
    
    const newScenes = state.universeData.scenes.map((scene, index) => {
      // Parents and siblings BEFORE this scene remain completely untouched
      if (index < sourceIndex) return scene;
      
      // The source scene itself applies the exact requested changes
      if (index === sourceIndex) {
        return { 
          ...scene, 
          ...data,
          position: data.position ? { ...scene.position, ...data.position } : scene.position
        };
      }
      
      // Cascading logic for all children (scenes nested inside the source scene)
      const offsetX = scene.position.x - sourceScene.position.x;
      const offsetY = scene.position.y - sourceScene.position.y;
      
      const scaledOffsetX = offsetX * scaleRatio;
      const scaledOffsetY = offsetY * scaleRatio;
      
      return {
        ...scene,
        position: {
          ...scene.position,
          x: sourceScene.position.x + deltaX + scaledOffsetX,
          y: sourceScene.position.y + deltaY + scaledOffsetY,
        },
        scale: scene.scale * scaleRatio
      };
    });
    
    // Also mathematically cascade the same transform to the Final View Circle!
    let newCameraSettings = state.universeData.cameraSettings;
    if (state.universeData.cameraSettings.finalCircle && (deltaX !== 0 || deltaY !== 0 || scaleRatio !== 1)) {
       const fc = state.universeData.cameraSettings.finalCircle;
       const offsetX = fc.x - sourceScene.position.x;
       const offsetY = fc.y - sourceScene.position.y;
       newCameraSettings = {
         ...newCameraSettings,
         finalCircle: {
           x: sourceScene.position.x + deltaX + (offsetX * scaleRatio),
           y: sourceScene.position.y + deltaY + (offsetY * scaleRatio),
           radius: fc.radius * scaleRatio
         }
       };
    }

    return { 
      universeData: { 
        ...state.universeData, 
        scenes: newScenes, 
        cameraSettings: newCameraSettings 
      } 
    };
  }),

  deleteScene: (sceneId) => set((state) => {
    if (!state.universeData) return state;
    const newScenes = state.universeData.scenes.filter(scene => scene.id !== sceneId);
    
    // Auto-save logic can be called directly or we return state to let the component handle saving
    return { 
      universeData: { ...state.universeData, scenes: newScenes },
      activeSceneId: state.activeSceneId === sceneId ? null : state.activeSceneId 
    };
  }),

  updateCircle: (sceneId, circleId, data) => set((state) => {
    if (!state.universeData) return state;
    const newScenes = state.universeData.scenes.map(scene => {
      if (scene.id === sceneId) {
        return {
          ...scene,
          circles: (scene.circles || []).map(c => c.id === circleId ? { ...c, ...data } : c)
        };
      }
      return scene;
    });
    return { universeData: { ...state.universeData, scenes: newScenes } };
  }),

  addCircle: (sceneId, circle) => set((state) => {
    if (!state.universeData) return state;
    const newScenes = state.universeData.scenes.map(scene => {
      if (scene.id === sceneId) {
        return { ...scene, circles: [...(scene.circles || []), circle] };
      }
      return scene;
    });
    return { universeData: { ...state.universeData, scenes: newScenes } };
  }),

  deleteCircle: (sceneId, circleId) => set((state) => {
    if (!state.universeData) return state;
    const newScenes = state.universeData.scenes.map(scene => {
      if (scene.id === sceneId) {
        return { ...scene, circles: (scene.circles || []).filter(c => c.id !== circleId) };
      }
      return scene;
    });
    return { universeData: { ...state.universeData, scenes: newScenes } };
  }),

  setFinalCircle: (circle) => set((state) => {
    if (!state.universeData) return state;
    return {
      universeData: {
        ...state.universeData,
        cameraSettings: {
          ...state.universeData.cameraSettings,
          finalCircle: circle
        }
      }
    };
  }),

  removeFinalCircle: () => set((state) => {
    if (!state.universeData) return state;
    const { finalCircle, ...restSettings } = state.universeData.cameraSettings;
    return {
      universeData: {
        ...state.universeData,
        cameraSettings: restSettings
      }
    };
  })
}), {
  partialize: (state) => ({ 
    universeData: state.universeData, 
    activeSceneId: state.activeSceneId 
  }),
  limit: 100,
}));
