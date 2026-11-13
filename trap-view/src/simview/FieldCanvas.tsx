import { useEffect, useRef } from 'react';
import type { PlayEvent } from '../sim/types';
import { absOf, frameAt, type Frame } from './playback';

export interface TeamLook { id: string; abbr: string; fill: string; ink: string }
export interface Pos { index: number; t: number }

interface Props {
  events: PlayEvent[];
  home: TeamLook;
  away: TeamLook;
  /** Spieler-ID je Team → Name/Nummer */
  names: Map<string, { name: string; number: number | null }>;
  pos: React.MutableRefObject<Pos>;
  /** Drive-Beginn (absolute Feldposition) je Ereignis, null = kein Drive */
  driveStart: (number | null)[];
  /** wird vor jedem Bild aufgerufen (Wiedergabe-Uhr) */
  onFrame: (dt: number) => void;
}

const FIELD_W = 120;
const FIELD_H = 53.3;

const lastName = (n: string) => n.split(' ').slice(-1)[0];

/** 2D-Vogelperspektive: Feld, Line of Scrimmage, First-Down-Linie, Drive, Ball und beteiligte Spieler. */
export function FieldCanvas({ events, home, away, names, pos, driveStart, onFrame }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ events, home, away, names, driveStart, onFrame });
  props.current = { events, home, away, names, driveStart, onFrame };

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      const box = canvas.parentElement!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.width;
      h = Math.min(box.height, w * (FIELD_H / FIELD_W));
      w = Math.min(w, h * (FIELD_W / FIELD_H));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      props.current.onFrame(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const draw = () => {
      const { events, home, away, names, driveStart } = props.current;
      const s = w / FIELD_W;
      const px = (x: number) => (x + 10) * s;
      const py = (y: number) => h / 2 + y * s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rasen mit 5-Yard-Streifen
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = i % 2 ? '#1f5f33' : '#22683a';
        ctx.fillRect(i * 5 * s, 0, 5 * s + 1, h);
      }
      // Endzonen
      const endzone = (x: number, t: TeamLook, rot: number) => {
        ctx.fillStyle = t.fill;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(px(x), 0, 10 * s, h);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(px(x + 5), h / 2);
        ctx.rotate(rot);
        ctx.fillStyle = t.ink;
        ctx.font = `${Math.round(6 * s)}px Anton, Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.abbr, 0, 0);
        ctx.restore();
      };
      endzone(-10, home, -Math.PI / 2); // Home verteidigt links, greift nach rechts an
      endzone(100, away, Math.PI / 2);

      // Linien und Zahlen
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      for (let y = 0; y <= 100; y += 5) {
        ctx.lineWidth = y % 50 === 0 || y === 100 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(px(y), 0); ctx.lineTo(px(y), h); ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      for (let y = 1; y < 100; y++) {
        for (const hy of [-FIELD_H / 2 + 0.6, -6.6, 6.6, FIELD_H / 2 - 0.6]) {
          ctx.beginPath(); ctx.moveTo(px(y), py(hy) - 0.5 * s); ctx.lineTo(px(y), py(hy) + 0.5 * s); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `600 ${Math.round(3.2 * s)}px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 10; y < 100; y += 10) {
        const label = String(y <= 50 ? y : 100 - y);
        ctx.fillText(label, px(y), py(-FIELD_H / 2 + 9));
        ctx.fillText(label, px(y), py(FIELD_H / 2 - 9));
      }
      // Goal Posts
      ctx.strokeStyle = '#f5c63c';
      ctx.lineWidth = 3;
      for (const x of [-10, 110]) {
        ctx.beginPath(); ctx.moveTo(px(x), py(-3.1)); ctx.lineTo(px(x), py(3.1)); ctx.stroke();
      }

      const { index, t } = pos.current;
      const e = events[index];
      if (!e) return;
      const next = events[index + 1];
      const nextStartAbs = next && next.type !== 'kickoff' && next.type !== 'pat' && next.type !== 'twopoint' ? absOf(next, home.id, next.yardLine) : null;
      const frame: Frame = frameAt(e, t, { home: home.id, nextStartAbs });
      const look = (id: string) => (id === home.id ? home : away);
      const offLook = look(e.offense);

      // Drive
      const ds = driveStart[index];
      if (ds != null) {
        const a = Math.min(ds, frame.ball.x), b = Math.max(ds, frame.ball.x);
        ctx.fillStyle = offLook.fill;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(px(a), py(-1.2), (b - a) * s, 2.4 * s);
        ctx.globalAlpha = 1;
      }
      // Line of Scrimmage und First-Down-Linie
      if (e.down > 0) {
        const los = absOf(e, home.id, e.yardLine);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3b8cff';
        ctx.beginPath(); ctx.moveTo(px(los), 0); ctx.lineTo(px(los), h); ctx.stroke();
        const fd = e.yardLine + e.distance;
        if (fd < 100) {
          ctx.strokeStyle = '#ffd400';
          const x = absOf(e, home.id, fd);
          ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), h); ctx.stroke();
        }
      }
      // Fehlpass-Markierung, Strafe
      if (frame.miss) {
        const m = frame.miss, r = 1.2 * s;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px(m.x) - r, py(m.y) - r); ctx.lineTo(px(m.x) + r, py(m.y) + r);
        ctx.moveTo(px(m.x) + r, py(m.y) - r); ctx.lineTo(px(m.x) - r, py(m.y) + r);
        ctx.stroke();
      }
      if (frame.flag) {
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(px(frame.flag.x) - 0.7 * s, py(frame.flag.y) - 0.7 * s, 1.4 * s, 1.4 * s);
      }
      // Spieler
      for (const a of frame.actors) {
        const L = look(a.team);
        const info = names.get(`${a.team}|${a.id}`);
        const x = px(a.at.x), y = py(a.at.y), r = Math.max(1.7 * s, 9);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = L.fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = L.ink;
        ctx.stroke();
        ctx.fillStyle = L.ink;
        ctx.font = `700 ${Math.round(r * 1.05)}px "Barlow Condensed", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info?.number != null ? String(info.number) : a.role, x, y + 1);
        if (info) {
          const fs = Math.max(Math.round(1.9 * s), 12);
          ctx.font = `600 ${fs}px "Barlow Condensed", sans-serif`;
          const label = lastName(info.name).toUpperCase();
          const tw = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(5,6,8,0.78)';
          ctx.fillRect(x - tw / 2 - 4, y - r - fs - 6, tw + 8, fs + 4);
          ctx.fillStyle = '#f1f2f0';
          ctx.fillText(label, x, y - r - fs / 2 - 3);
        }
      }
      // Ball (mit Schatten, wenn in der Luft)
      const bx = px(frame.ball.x), by = py(frame.ball.y);
      const lift = frame.height * 5 * s;
      if (frame.height > 0.02) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(bx, by, 0.9 * s, 0.5 * s, 0, 0, Math.PI * 2); ctx.fill();
      }
      const size = (1 + frame.height * 0.6) * Math.max(1, 5 / s);
      ctx.fillStyle = '#7a3f1d';
      ctx.strokeStyle = '#f1e6d6';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(bx, by - lift, 1.1 * s * size, 0.65 * s * size, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Banner
      if (frame.banner) {
        const scoringTeam = e.points ? look(e.points.team) : offLook;
        ctx.fillStyle = 'rgba(5,6,8,0.55)';
        ctx.fillRect(0, h / 2 - 7 * s, w, 14 * s);
        ctx.fillStyle = scoringTeam.fill;
        ctx.fillRect(0, h / 2 - 7 * s, w, 0.6 * s);
        ctx.fillRect(0, h / 2 + 6.4 * s, w, 0.6 * s);
        ctx.fillStyle = '#f1f2f0';
        ctx.font = `${Math.round(9 * s)}px Anton, Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frame.banner, w / 2, h / 2 + 0.4 * s);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [pos]);

  return <canvas ref={ref} className="sim-field" aria-label="Spielfeld in der Vogelperspektive" role="img" />;
}
