export type Edge = "top" | "bottom" | "left" | "right";

export type WinGeom = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WinApi = {
  wins: HTMLElement[];
  focused: () => HTMLElement | null;
  focus: (w: HTMLElement) => void;
  blurAll: () => void;
  isDragging: () => boolean;
  toggleMaximize: (w: HTMLElement) => void;
  align: (w: HTMLElement) => void;
  minimize: (w: HTMLElement) => void;
  close: (w: HTMLElement) => void;
  open: (w: HTMLElement) => void;
};
