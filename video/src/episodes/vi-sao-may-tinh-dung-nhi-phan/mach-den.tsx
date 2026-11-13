import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage, useBox } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Battery, Bulb, p, Switch } from "./common";

const COMBO = 36; // frame mỗi tổ hợp bật tắt
const COMBOS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

/** Tổ hợp công tắc tại frame f, chạy vòng từ `start`; trước `start` là cả hai tắt. */
function comboAt(f: number, start: number): [number, number] {
  if (f < start) return [0, 0];
  return COMBOS[Math.floor((f - start) / COMBO) % COMBOS.length];
}

/** Bóng đèn và công tắc. mode "mot": một công tắc; "noi-tiep": hai công tắc nối tiếp (phép và); "song-song": hai nhánh (phép hoặc). */
export const MachDen: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = scene.props.mode === "noi-tiep" || scene.props.mode === "song-song" ? scene.props.mode : "mot";
  const show = p(f, at(scene, 0));
  const wire = (on: boolean) => (on ? theme.accent2 : theme.muted);
  if (useBox().layout === "square") return <MachDenSquare scene={scene} />;

  if (mode === "mot") {
    const start = at(scene, 1);
    const on = f >= start && Math.floor((f - start) / 45) % 2 === 0;
    const closed = f < start ? 0 : p(f, start + Math.floor((f - start) / 45) * 45, 8);
    const c = f < start ? 0 : on ? closed : 1 - closed;
    const lit = on ? closed : 0;
    return (
      <Stage>
        <g opacity={show}>
          <polyline points="460,250 860,250" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} />
          <polyline points="1060,250 1460,250 1460,365" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="1460,505 1460,620 460,620 460,447" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="460,423 460,250" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} />
          <Battery x={460} y={435} color={theme.fg} />
          <Switch x={960} y={250} half={100} closed={c} color={theme.accent} dot={theme.fg} />
          <Bulb x={1460} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
        </g>
        <TextBlock text={on ? "Bật" : "Tắt"} x={960} y={470} width={500} fontSize={110} fill={on ? theme.accent2 : theme.muted} opacity={p(f, start)} />
        <TextBlock text="Chỉ có hai trạng thái" x={960} y={760} width={1500} fontSize={56} fill={theme.fg} opacity={p(f, at(scene, 1) + 20)} />
      </Stage>
    );
  }

  if (mode === "noi-tiep") {
    const cycle = at(scene, 2);
    const [a, b] = comboAt(f, cycle);
    const lit = a && b ? 1 : 0;
    const sw = p(f, at(scene, 1));
    return (
      <Stage>
        <g opacity={show}>
          <polyline points="420,250 630,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <polyline points="830,250 1090,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <polyline points="1290,250 1500,250 1500,365" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="1500,505 1500,620 420,620 420,447" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="420,423 420,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <Battery x={420} y={435} color={theme.fg} />
          <Bulb x={1500} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
        </g>
        <Switch x={730} y={250} half={100} closed={a} color={theme.accent} dot={theme.fg} opacity={sw} />
        <Switch x={1190} y={250} half={100} closed={b} color={theme.accent} dot={theme.fg} opacity={sw} />
        <TextBlock text={f >= cycle ? (a ? "bật" : "tắt") : "A"} x={730} y={380} width={300} fontSize={52} fill={a ? theme.accent2 : theme.fg} opacity={sw} />
        <TextBlock text={f >= cycle ? (b ? "bật" : "tắt") : "B"} x={1190} y={380} width={300} fontSize={52} fill={b ? theme.accent2 : theme.fg} opacity={sw} />
        <TextBlock text="Nối tiếp: cùng một đường dây" x={960} y={80} width={1600} fontSize={56} fill={theme.fg} opacity={sw} />
        <TextBlock text="Phép và" x={960} y={760} width={1200} fontSize={80} fill={theme.accent2} opacity={p(f, at(scene, 3))} />
      </Stage>
    );
  }

  // song-song
  const cycle = at(scene, 1);
  const [a, b] = comboAt(f, cycle);
  const lit = a || b ? 1 : 0;
  return (
    <Stage>
      <g opacity={show}>
        <polyline points="420,250 640,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
        <polyline points="640,250 640,470 860,470" fill="none" stroke={wire(!!b)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="640,250 860,250" fill="none" stroke={wire(!!a)} strokeWidth={10} />
        <polyline points="1060,250 1280,250" fill="none" stroke={wire(!!a)} strokeWidth={10} />
        <polyline points="1060,470 1280,470 1280,250" fill="none" stroke={wire(!!b)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="1280,250 1540,250 1540,365" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="1540,505 1540,640 420,640 420,457" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="420,433 420,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
        <Battery x={420} y={445} color={theme.fg} />
        <Switch x={960} y={250} half={100} closed={a} color={theme.accent} dot={theme.fg} />
        <Switch x={960} y={470} half={100} closed={b} color={theme.accent} dot={theme.fg} />
        <Bulb x={1540} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
        <TextBlock text={f >= cycle ? (a ? "bật" : "tắt") : "A"} x={750} y={226} width={200} fontSize={44} fill={a ? theme.accent2 : theme.fg} />
        <TextBlock text={f >= cycle ? (b ? "bật" : "tắt") : "B"} x={750} y={446} width={200} fontSize={44} fill={b ? theme.accent2 : theme.fg} />
      </g>
      <TextBlock text="Song song: mỗi công tắc một nhánh" x={960} y={80} width={1600} fontSize={56} fill={theme.fg} opacity={show} />
      <TextBlock text="Phép hoặc" x={960} y={760} width={1200} fontSize={80} fill={theme.accent2} opacity={p(f, cycle + 2 * COMBO)} />
    </Stage>
  );
};

// ---- Khung vuông (Short, 840x840): mạch vẽ lại theo toạ độ riêng, chữ ở ngoài mạch, ≥ 30 px ----

/** Mạch thu nhỏ quanh tâm khung ngang (960) rồi đặt vào hộp vuông; chữ không nằm trong nhóm thu nhỏ. */
const K = 0.6;
const mx = (x: number): number => 420 + (x - 960) * K;
const my = (y: number, ty: number): number => ty + y * K;

const MachDenSquare: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const mode = scene.props.mode === "noi-tiep" || scene.props.mode === "song-song" ? scene.props.mode : "mot";
  const show = p(f, at(scene, 0));
  const wire = (on: boolean) => (on ? theme.accent2 : theme.muted);
  const ty = 90;
  const g = `translate(${420 - 960 * K} ${ty}) scale(${K})`;

  if (mode === "mot") {
    const start = at(scene, 1);
    const on = f >= start && Math.floor((f - start) / 45) % 2 === 0;
    const closed = f < start ? 0 : p(f, start + Math.floor((f - start) / 45) * 45, 8);
    const c = f < start ? 0 : on ? closed : 1 - closed;
    const lit = on ? closed : 0;
    return (
      <Stage>
        <g opacity={show} transform={g}>
          <polyline points="460,250 860,250" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} />
          <polyline points="1060,250 1460,250 1460,365" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="1460,505 1460,620 460,620 460,447" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="460,423 460,250" fill="none" stroke={wire(lit > 0.5)} strokeWidth={10} />
          <Battery x={460} y={435} color={theme.fg} />
          <Switch x={960} y={250} half={100} closed={c} color={theme.accent} dot={theme.fg} />
          <Bulb x={1460} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
        </g>
        <TextBlock text={on ? "Bật" : "Tắt"} x={420} y={my(470, ty) + 10} width={300} fontSize={80} fill={on ? theme.accent2 : theme.muted} opacity={p(f, start)} />
        <TextBlock text="Chỉ có hai trạng thái" x={420} y={680} width={780} fontSize={52} fill={theme.fg} opacity={p(f, at(scene, 1) + 20)} />
      </Stage>
    );
  }

  if (mode === "noi-tiep") {
    const cycle = at(scene, 2);
    const [a, b] = comboAt(f, cycle);
    const lit = a && b ? 1 : 0;
    const sw = p(f, at(scene, 1));
    return (
      <Stage>
        <g opacity={show} transform={g}>
          <polyline points="420,250 630,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <polyline points="830,250 1090,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <polyline points="1290,250 1500,250 1500,365" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="1500,505 1500,620 420,620 420,447" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
          <polyline points="420,423 420,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
          <Battery x={420} y={435} color={theme.fg} />
          <Bulb x={1500} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
        </g>
        <g transform={g}>
          <Switch x={730} y={250} half={100} closed={a} color={theme.accent} dot={theme.fg} opacity={sw} />
          <Switch x={1190} y={250} half={100} closed={b} color={theme.accent} dot={theme.fg} opacity={sw} />
        </g>
        <TextBlock text={f >= cycle ? (a ? "bật" : "tắt") : "A"} x={mx(730)} y={my(380, ty) + 10} width={200} fontSize={40} fill={a ? theme.accent2 : theme.fg} opacity={sw} />
        <TextBlock text={f >= cycle ? (b ? "bật" : "tắt") : "B"} x={mx(1190)} y={my(380, ty) + 10} width={200} fontSize={40} fill={b ? theme.accent2 : theme.fg} opacity={sw} />
        <TextBlock text="Nối tiếp: cùng một đường dây" x={420} y={80} width={780} fontSize={46} fill={theme.fg} opacity={sw} />
        <TextBlock text="Phép và" x={420} y={680} width={700} fontSize={72} fill={theme.accent2} opacity={p(f, at(scene, 3))} />
      </Stage>
    );
  }

  const cycle = at(scene, 1);
  const [a, b] = comboAt(f, cycle);
  const lit = a || b ? 1 : 0;
  return (
    <Stage>
      <g opacity={show} transform={g}>
        <polyline points="420,250 640,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
        <polyline points="640,250 640,470 860,470" fill="none" stroke={wire(!!b)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="640,250 860,250" fill="none" stroke={wire(!!a)} strokeWidth={10} />
        <polyline points="1060,250 1280,250" fill="none" stroke={wire(!!a)} strokeWidth={10} />
        <polyline points="1060,470 1280,470 1280,250" fill="none" stroke={wire(!!b)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="1280,250 1540,250 1540,365" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="1540,505 1540,640 420,640 420,457" fill="none" stroke={wire(!!lit)} strokeWidth={10} strokeLinejoin="round" />
        <polyline points="420,433 420,250" fill="none" stroke={wire(!!lit)} strokeWidth={10} />
        <Battery x={420} y={445} color={theme.fg} />
        <Switch x={960} y={250} half={100} closed={a} color={theme.accent} dot={theme.fg} />
        <Switch x={960} y={470} half={100} closed={b} color={theme.accent} dot={theme.fg} />
        <Bulb x={1540} y={435} lit={lit} on={theme.accent2} off={theme.panel} stroke={theme.fg} />
      </g>
      <g opacity={show}>
        <TextBlock text={f >= cycle ? (a ? "bật" : "tắt") : "A"} x={mx(960)} y={my(250, ty) - 40} width={160} fontSize={36} fill={a ? theme.accent2 : theme.fg} />
        <TextBlock text={f >= cycle ? (b ? "bật" : "tắt") : "B"} x={mx(960)} y={my(470, ty) + 60} width={160} fontSize={36} fill={b ? theme.accent2 : theme.fg} />
      </g>
      <TextBlock text="Song song: mỗi công tắc một nhánh" x={420} y={80} width={780} fontSize={42} fill={theme.fg} opacity={show} />
      <TextBlock text="Phép hoặc" x={420} y={700} width={700} fontSize={72} fill={theme.accent2} opacity={p(f, cycle + 2 * COMBO)} />
    </Stage>
  );
};
