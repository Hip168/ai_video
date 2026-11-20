import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import type { SceneProps } from "../../lib/types";
import { generation, once, type Img } from "./anh";
import { Arrow, at, Chip, modeOf, p, Txt, useGeom } from "./common";
import { imgH, PixelImage } from "./pixel";

/**
 * Ảnh tự vẽ đi qua nhiều lần nén (bộ nén kiểu JPEG viết tay trong `anh.ts`).
 * - `chuoi`: ảnh gốc và sau vài lần, thêm lần, nhiều lần gửi (hiện đủ ngay frame 0).
 * - `the-he`: beat 0 chuỗi các vòng nén; beat 1 phóng to: sau chừng mười vòng xấu đi thấy rõ.
 * - `hanh-trinh`: beat 0 các chặng: chụp, gửi vào nhóm, lưu về, cắt bớt, ứng dụng khác; beat 1 mỗi chặng mở ra rồi lưu lại theo cách riêng.
 * - `goc-nhan`: ảnh gốc và ảnh nhận qua ứng dụng chat, kèm phóng to (hiện đủ ngay frame 0).
 * - `chat-luong`: beat 0 ảnh gốc, ảnh lưu chất lượng 100 và phần khác đi (phóng đại) (hiện đủ ngay frame 0); beat 1 hai chỗ vứt dữ liệu.
 */
export const AnhMo: React.FC<SceneProps> = ({ scene }) => {
  const mode = modeOf(scene.props, "chuoi");
  return (
    <Stage>
      {mode === "the-he" ? (
        <TheHe scene={scene} />
      ) : mode === "hanh-trinh" ? (
        <HanhTrinh scene={scene} />
      ) : mode === "goc-nhan" ? (
        <GocNhan />
      ) : mode === "chat-luong" ? (
        <ChatLuong scene={scene} />
      ) : (
        <Chuoi />
      )}
    </Stage>
  );
};

/** Vùng phóng to: dây điện, mái nhà, cửa sổ. */
const CROP = { sx: 6, sy: 4, sw: 28, sh: 21 };

const Labeled: React.FC<{ im: Img; x: number; y: number; size: number; label: string; color: string; s: number; crop?: boolean; stroke?: string }> = ({ im, x, y, size, label, color, s, crop, stroke }) => {
  const h = crop ? imgH(im, size, CROP.sw, CROP.sh) : imgH(im, size);
  return (
    <g>
      <PixelImage im={im} x={x} y={y} size={size} {...(crop ? CROP : {})} stroke={stroke} />
      <Txt text={label} x={x + size / 2} y={y + h + s * 1.15} w={size + 20} s={s} fill={color} />
    </g>
  );
};

const Chuoi: React.FC = () => {
  const t = useTheme();
  const { sq } = useGeom();
  const items = [
    { n: 0, label: "ảnh gốc" },
    { n: 2, label: "gửi vài lần" },
    { n: 5, label: "gửi thêm" },
    { n: 10, label: "gửi nhiều lần" },
  ];
  if (sq)
    return (
      <g>
        {items.map((it, i) => (
          <Labeled key={i} im={generation(it.n)} x={45 + (i % 2) * 390} y={30 + Math.floor(i / 2) * 370} size={360} label={it.label} color={i === 0 ? t.ok : t.warn} s={34} />
        ))}
      </g>
    );
  return (
    <g>
      {items.map((it, i) => (
        <g key={i}>
          <Labeled im={generation(it.n)} x={110 + i * 440} y={150} size={380} label={it.label} color={i === 0 ? t.ok : t.warn} s={44} />
          {i < 3 && <Arrow x1={110 + i * 440 + 386} y1={290} x2={110 + (i + 1) * 440 - 6} y2={290} color={t.muted} w={4} head={14} />}
        </g>
      ))}
      <Txt text="gửi qua gửi lại vài lần" x={960} y={600} w={1400} s={48} fill={t.fg} />
    </g>
  );
};

const TheHe: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a1 = p(f, t1, 16);
  const chain = sq ? [0, 5, 10] : [0, 2, 4, 6, 8, 10];
  const tw = sq ? 240 : 250;
  const gap = sq ? 30 : 32;
  const x0 = (sq ? 840 : 1920) / 2 - (chain.length * tw + (chain.length - 1) * gap) / 2;
  return (
    <g>
      {chain.map((n, i) => (
        <g key={n}>
          <PixelImage im={generation(n)} x={x0 + i * (tw + gap)} y={sq ? 20 : 40} size={tw} stroke={n === 10 && a1 > 0 ? t.warn : undefined} />
          <Txt text={n === 0 ? "gốc" : `vòng ${n}`} x={x0 + i * (tw + gap) + tw / 2} y={(sq ? 20 : 40) + (tw * 48) / 64 + (sq ? 38 : 44)} w={tw} s={sq ? 32 : 38} fill={n === 0 ? t.ok : t.fg} />
        </g>
      ))}
      <Txt text="libjpeg-turbo khuyên tránh nhiều vòng nén rồi giải nén" x={sq ? 420 : 960} y={sq ? 290 : 330} w={sq ? 780 : 1600} s={sq ? 32 : 42} fill={t.accent2} lines={2} />
      <g opacity={a1}>
        <Labeled im={generation(0)} x={sq ? 40 : 330} y={sq ? 360 : 380} size={sq ? 370 : 500} label="gốc" color={t.ok} s={sq ? 32 : 40} crop />
        <Labeled im={generation(10)} x={sq ? 430 : 1090} y={sq ? 360 : 380} size={sq ? 370 : 500} label={sq ? "vòng 10" : "sau chừng mười vòng: xấu đi thấy rõ"} color={t.warn} s={sq ? 32 : 40} crop />
        {sq && <Txt text="sau chừng mười vòng: xấu đi thấy rõ" x={420} y={720} w={780} s={36} fill={t.warn} />}
      </g>
    </g>
  );
};

const HanhTrinh: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const st = ["Chụp", "Gửi vào nhóm", "Lưu về", "Cắt bớt", "Ứng dụng khác"];
  const pos = (i: number) =>
    sq ? { x: i < 3 ? 30 + i * 270 : 165 + (i - 3) * 270, y: i < 3 ? 40 : 330, w: 240 } : { x: 110 + i * 350, y: 150, w: 300 };
  return (
    <g>
      {st.map((name, i) => {
        const q = pos(i);
        const h = (q.w * 48) / 64;
        const on = p(f, i * 14, 12);
        return (
          <g key={i} opacity={i === 0 ? 1 : on}>
            <PixelImage im={generation(i)} x={q.x} y={q.y} size={q.w} />
            <Txt text={name} x={q.x + q.w / 2} y={q.y + h + (sq ? 40 : 48)} w={q.w + 30} s={sq ? 32 : 40} fill={i === 0 ? t.ok : t.fg} />
            {!sq && i < st.length - 1 && <Arrow x1={q.x + q.w + 6} y1={q.y + h / 2} x2={q.x + 344} y2={q.y + h / 2} color={t.muted} w={4} head={14} />}
          </g>
        );
      })}
      <g opacity={p(f, t1, 14)}>
        <Chip x={sq ? 40 : 360} y={sq ? 640 : 560} w={sq ? 760 : 1200} h={sq ? 130 : 110} text="mỗi chặng: mở ra rồi lưu lại, mỗi nơi một cách" s={sq ? 34 : 44} fill={t.accent2} color={t.bg} />
      </g>
    </g>
  );
};

const GocNhan: React.FC = () => {
  const t = useTheme();
  const { sq } = useGeom();
  const a = generation(0);
  const b = generation(3);
  if (sq)
    return (
      <g>
        <Txt text="Ảnh gốc" x={225} y={50} w={380} s={36} fill={t.ok} />
        <Txt text="Ảnh nhận qua chat" x={615} y={50} w={380} s={36} fill={t.warn} />
        <PixelImage im={a} x={40} y={70} size={370} />
        <PixelImage im={b} x={430} y={70} size={370} />
        <PixelImage im={a} x={40} y={370} size={370} {...CROP} stroke={t.ok} />
        <PixelImage im={b} x={430} y={370} size={370} {...CROP} stroke={t.warn} />
        <Txt text="phóng to cùng một chỗ" x={420} y={700} w={760} s={34} fill={t.muted} weight={400} />
      </g>
    );
  return (
    <g>
      <Txt text="Ảnh gốc" x={480} y={70} w={700} s={50} fill={t.ok} />
      <Txt text="Ảnh nhận qua ứng dụng chat" x={1440} y={70} w={760} s={50} fill={t.warn} />
      <PixelImage im={a} x={120} y={100} size={420} />
      <PixelImage im={a} x={560} y={100} size={280} {...CROP} stroke={t.ok} />
      <PixelImage im={b} x={1080} y={100} size={420} />
      <PixelImage im={b} x={1520} y={100} size={280} {...CROP} stroke={t.warn} />
      <Txt text="bên phải mỗi ảnh: phóng to cùng một chỗ" x={960} y={500} w={1400} s={40} fill={t.muted} weight={400} />
    </g>
  );
};

const diffMap = (a: Img, b: Img) => (_: Img, i: number) => {
  const d = Math.min(255, (Math.abs(a.r[i] - b.r[i]) + Math.abs(a.g[i] - b.g[i]) + Math.abs(a.b[i] - b.b[i])) * 6);
  return `rgb(${Math.round(d)},${Math.round(d * 0.55)},${Math.round(d * 0.2)})`;
};

const ChatLuong: React.FC<SceneProps> = ({ scene }) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const { sq } = useGeom();
  const t1 = at(scene, 1);
  const a = generation(0);
  const q = once(100);
  const map = diffMap(a, q);
  const badges = ["bớt chi tiết phần màu", "làm tròn các con số"];
  if (sq)
    return (
      <g>
        <Labeled im={a} x={40} y={20} size={370} label="ảnh gốc" color={t.ok} s={32} />
        <Labeled im={q} x={430} y={20} size={370} label="JPEG chất lượng 100" color={t.fg} s={32} />
        <PixelImage im={a} x={230} y={360} size={380} map={map} stroke={t.warn} />
        <Txt text="phần khác đi (phóng đại để dễ thấy)" x={420} y={680} w={760} s={32} fill={t.warn} />
        {badges.map((b, i) => (
          <g key={i} opacity={p(f, t1 + i * 10, 12)}>
            <Chip x={30 + i * 400} y={710} w={380} h={90} text={b} s={30} fill={t.accent2} color={t.bg} />
          </g>
        ))}
      </g>
    );
  return (
    <g>
      <Labeled im={a} x={110} y={60} size={520} label="ảnh gốc" color={t.ok} s={42} />
      <Labeled im={q} x={700} y={60} size={520} label="JPEG chất lượng 100" color={t.fg} s={42} />
      <Labeled im={a} x={1290} y={60} size={520} label="phần khác đi (phóng đại)" color={t.warn} s={38} />
      <PixelImage im={a} x={1290} y={60} size={520} map={map} stroke={t.warn} />
      {badges.map((b, i) => (
        <g key={i} opacity={p(f, t1 + i * 10, 12)}>
          <Chip x={260 + i * 720} y={640} w={660} h={100} text={`vẫn ${b}`} s={44} fill={t.accent2} color={t.bg} />
        </g>
      ))}
    </g>
  );
};
