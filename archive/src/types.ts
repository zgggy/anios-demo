/** Shared types for anios desktop demo. */

export type WinMode = "floating" | "maximized";
export type Edge = "top" | "bottom" | "left" | "right";
export type Orient = "h" | "v";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WinGeom {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RecoverState {
  visible: boolean;
  edge: Edge | null;
}
