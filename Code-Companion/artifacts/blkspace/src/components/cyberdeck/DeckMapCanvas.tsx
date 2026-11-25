import { useEffect, useRef, useState } from "react";
import {
  fitView,
  graticuleStep,
  panByPixels,
  project,
  tileUrl,
  tilesForView,
  unproject,
  zoomBy,
  type LonLat,
  type MapView,
} from "@/lib/deck-map";

type Props = {
  from: LonLat | null;
  to: LonLat | null;
  via?: LonLat[];
  line: LonLat[];
  tileTemplate: string;
  onPick: (point: LonLat) => void;
};

function pointsKey(line: LonLat[], from: LonLat | null, to: LonLat | null): string {
  const pins = [from, to].filter((point): point is LonLat => point !== null);
  const drawn = line.length > 1 ? line : pins;
  return drawn.map((point) => `${point.lon.toFixed(5)},${point.lat.toFixed(5)}`).join(";");
}

export function DeckMapCanvas({
  from,
  to,
  via = [],
  line,
  tileTemplate,
  onPick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState<MapView>({ center: { lon: 0, lat: 0 }, zoom: 2 });
  const [generation, setGeneration] = useState(0);
  const images = useRef(new Map<string, HTMLImageElement>());
  const fitted = useRef("");
  const viewRef = useRef(view);
  const onPickRef = useRef(onPick);
  viewRef.current = view;
  onPickRef.current = onPick;

  const signature = pointsKey(line, from, to);

  useEffect(() => {
    if (!signature || signature === fitted.current) return;
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 800;
    const height = canvas?.clientHeight || 480;
    const pins = [from, to].filter((point): point is LonLat => point !== null);
    const focus = line.length > 1 ? line : pins;
    fitted.current = signature;
    setView(fitView(focus, width, height));
  }, [signature, from, to, line]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#14120f";
      ctx.fillRect(0, 0, width, height);

      const tiles = tilesForView(view, width, height);
      for (const tile of tiles) {
        const url = tileUrl(tileTemplate, tile);
        if (!url) continue;
        const image = images.current.get(url);
        if (image?.complete && image.naturalWidth > 0) {
          ctx.drawImage(image, tile.left, tile.top, 256, 256);
          continue;
        }
        if (!image) {
          const next = new Image();
          next.onload = () => setGeneration((value) => value + 1);
          next.src = url;
          images.current.set(url, next);
        }
      }

      const step = graticuleStep(view.zoom);
      const nw = unproject(0, 0, view, width, height);
      const se = unproject(width, height, view, width, height);
      ctx.strokeStyle = "rgba(250, 250, 249, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let lon = Math.floor(nw.lon / step) * step; lon <= se.lon + step; lon += step) {
        const top = project({ lon, lat: nw.lat }, view, width, height);
        const bottom = project({ lon, lat: se.lat }, view, width, height);
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(bottom.x, bottom.y);
      }
      for (let lat = Math.floor(se.lat / step) * step; lat <= nw.lat + step; lat += step) {
        const left = project({ lon: nw.lon, lat }, view, width, height);
        const right = project({ lon: se.lon, lat }, view, width, height);
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
      }
      ctx.stroke();

      if (line.length > 1) {
        ctx.beginPath();
        line.forEach((point, index) => {
          const pixel = project(point, view, width, height);
          if (index === 0) ctx.moveTo(pixel.x, pixel.y);
          else ctx.lineTo(pixel.x, pixel.y);
        });
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      const pin = (point: LonLat | null, fill: string, radius: number) => {
        if (!point) return;
        const pixel = project(point, view, width, height);
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      };
      for (const point of via) pin(point, "#e7e5e4", 4);
      pin(from, "#4ade80", 6);
      pin(to, "#f97316", 6);
    };
    draw();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [view, line, from, to, via, tileTemplate, generation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drag = {
      active: false,
      moved: false,
      x: 0,
      y: 0,
      origin: viewRef.current,
    };
    const down = (event: PointerEvent) => {
      drag.active = true;
      drag.moved = false;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.origin = viewRef.current;
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag.active) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      if (!drag.moved) return;
      setView(
        panByPixels(
          drag.origin,
          dx,
          dy,
          canvas.clientWidth,
          canvas.clientHeight,
        ),
      );
    };
    const up = (event: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      if (drag.moved) return;
      const rect = canvas.getBoundingClientRect();
      onPickRef.current(
        unproject(
          event.clientX - rect.left,
          event.clientY - rect.top,
          viewRef.current,
          canvas.clientWidth,
          canvas.clientHeight,
        ),
      );
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((current) => zoomBy(current, event.deltaY < 0 ? 1 : -1));
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      aria-label="Route map"
    />
  );
}
