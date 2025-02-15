declare module 'html-to-image' {
  export interface Options {
    backgroundColor?: string;
    width?: number;
    height?: number;
    skipFonts?: boolean;
    pixelRatio?: number;
    filter?: (node: HTMLElement) => boolean;
    [key: string]: any;
  }

  export function toCanvas(
    node: HTMLElement,
    options?: Options
  ): Promise<HTMLCanvasElement>;

  export function toPng(
    node: HTMLElement,
    options?: Options
  ): Promise<string>;

  export function toJpeg(
    node: HTMLElement,
    options?: Options
  ): Promise<string>;

  export function toBlob(
    node: HTMLElement,
    options?: Options
  ): Promise<Blob>;

  export function toPixelData(
    node: HTMLElement,
    options?: Options
  ): Promise<Uint8ClampedArray>;

  export function toSvg(
    node: HTMLElement,
    options?: Options
  ): Promise<string>;
} 