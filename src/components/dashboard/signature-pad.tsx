"use client";

import { Eraser } from "lucide-react";
import type { PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Point = { x: number; y: number };

function pathData(points: Point[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return [
    `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`,
    ...rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
  ].join(" ");
}

export function SignaturePad({ name = "signatureSvg" }: { name?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathsRef = useRef<Point[][]>([]);
  const activeRef = useRef<Point[] | null>(null);
  const [svg, setSvg] = useState("");

  const getSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 640, height: 220 };
    return {
      width: Math.max(1, canvas.clientWidth),
      height: Math.max(1, canvas.clientHeight),
    };
  }, []);

  const syncSvg = useCallback(() => {
    const { width, height } = getSize();
    const paths = pathsRef.current
      .filter((path) => path.length > 0)
      .map(
        (path) =>
          `<path d="${pathData(path)}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join("");
    setSvg(
      paths
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(
            0,
          )} ${height.toFixed(
            0,
          )}" color="#111827" role="img" aria-label="Signature">${paths}</svg>`
        : "",
    );
  }, [getSize]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = getSize();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    for (const path of pathsRef.current) {
      if (path.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (const point of path.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, [getSize]);

  useEffect(() => {
    redraw();
    const onResize = () => {
      redraw();
      syncSvg();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw, syncSvg]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const path = [pointFromEvent(event)];
    activeRef.current = path;
    pathsRef.current = [...pathsRef.current, path];
    redraw();
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!activeRef.current) return;
    activeRef.current.push(pointFromEvent(event));
    redraw();
  };

  const finish = () => {
    activeRef.current = null;
    syncSvg();
  };

  const clear = () => {
    pathsRef.current = [];
    activeRef.current = null;
    setSvg("");
    redraw();
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={svg} />
      <canvas
        ref={canvasRef}
        aria-label="Draw signature"
        className="h-56 w-full touch-none rounded-lg border border-outline-variant bg-white shadow-inner"
        onPointerCancel={finish}
        onPointerDown={start}
        onPointerLeave={finish}
        onPointerMove={move}
        onPointerUp={finish}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant">
          Draw with mouse, touch, or pen. Saved as a sanitized SVG template
          asset.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser className="mr-2 size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
