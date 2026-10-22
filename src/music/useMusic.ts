import { useSyncExternalStore } from "react";
import { musicEngine, type MusicState } from "./musicEngine";

export const useMusic = (): MusicState => useSyncExternalStore(musicEngine.subscribe, musicEngine.getState, musicEngine.getState);
