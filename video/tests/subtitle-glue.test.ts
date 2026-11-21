import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';
import {glueVi, NBSP} from '../src/lib/glue';
import {Subtitle} from '../src/lib/subtitle';
import {splitSubtitleShort} from '../src/Short';

// Phụ đề không được tách số với đơn vị ("212" / "GB"), không tách từ ghép hay gặp ("máy" / "tính").
// glueVi đổi khoảng trắng ở những chỗ đó thành khoảng trắng không ngắt (U+00A0): trình duyệt không xuống dòng ở đó,
// bộ chia đoạn phụ đề Short (chỉ cắt ở dấu cách thường) cũng không cắt ở đó.

const plain = (s: string) => s.replace(/ /g, ' ');

describe('glueVi', () => {
  test.each([
    ['Theo Rockstar, GTA VI cần tới 212 GB trống trên ổ để tải trước, tùy máy.', '212 GB'],
    ['Đầu vào: theo Cerny, bộ giải nén nhận hơn 5 GB dữ liệu nén mỗi giây.', '5 GB'],
    ['Nạp 1 GB từ ổ cứng mất khoảng 20 giây.', '20 giây'],
    ['Trung bình nó đỡ được khoảng 2,5 lần.', '2,5 lần'],
    ['Ảnh nhỏ hơn từ 25 đến 34 %.', '34 %'],
    ['Đầu ra có thể lên tới 22 GB/s.', '22 GB/s'],
    ['Mỗi giây dài thêm khoảng 11,6 micro giây.', '11,6 micro giây'],
    ['Một ảnh 12 triệu điểm nặng khoảng 36 MB.', '36 MB'],
  ])('số với đơn vị không tách: %s', (text, pair) => {
    const out = glueVi(text);
    expect(out).toContain(pair.replace(/ /g, NBSP));
    expect(plain(out)).toBe(text);
  });

  test.each([
    ['Trước hết, máy tính có hai loại chỗ chứa dữ liệu.', ['máy tính', 'dữ liệu']],
    ['Mặt bàn ấy là bộ nhớ của máy.', ['bộ nhớ']],
    ['Ông kể, giới hạn của ổ cứng buộc người làm game chọn một trong hai đường.', ['người làm game', 'ổ cứng']],
    ['Máy tính chỉ hiểu hai trạng thái.', ['Máy tính']],
  ])('từ ghép không tách: %s', (text, words) => {
    const out = glueVi(text);
    for (const w of words) expect(out).toContain(w.replace(/ /g, NBSP));
    expect(plain(out)).toBe(text);
  });

  test('không ghép nhầm: từ nằm giữa một từ khác, số không có đơn vị', () => {
    const t = 'Tin nhắn đi qua mạng, ă â ê ô ơ ư đ';
    expect(glueVi(t)).toBe(t);
    expect(glueVi('Năm 1976, James Clark viết bài.')).toBe('Năm 1976, James Clark viết bài.');
    expect(glueVi('bộ nhớ đệm')).toBe(`bộ${NBSP}nhớ đệm`);
  });
});

describe('phụ đề dùng glueVi', () => {
  test('phụ đề video dài: markup có khoảng trắng không ngắt giữa số và đơn vị', () => {
    const html = renderToStaticMarkup(createElement(Subtitle, {text: 'PS5 có 16 GB bộ nhớ.'}));
    expect(html).toContain(`16${NBSP}GB`);
    expect(html).toContain(`bộ${NBSP}nhớ`);
  });

  test('phụ đề Short: không đoạn nào kết thúc bằng số mà đoạn sau bắt đầu bằng đơn vị, không cắt giữa từ ghép', () => {
    const texts = [
      'Chỗ trống tới 212 GB, tùy máy, đã bằng khoảng một phần tư ổ 825 GB của PS5, theo số in trên hộp.',
      'Đầu vào: theo Cerny, bộ giải nén nhận hơn 5 GB dữ liệu nén mỗi giây, rồi người làm game dùng nó.',
      'Bộ xử lý đồ họa, gọi tắt là GPU, chỉ vẽ được những gì đang nằm trong bộ nhớ của máy tính.',
    ];
    for (const raw of texts) {
      const segs = splitSubtitleShort(glueVi(raw), 300);
      expect(segs.length).toBeGreaterThan(1);
      expect(plain(segs.map((s) => s.text).join(' '))).toBe(raw);
      for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1].text;
        const next = segs[i].text;
        expect(/\d$/.test(prev) && /^(GB|MB|giây|lần|%)/.test(next), `${prev} | ${next}`).toBe(false);
        for (const w of ['máy tính', 'bộ nhớ', 'người làm game', 'dữ liệu', 'bộ xử lý']) {
          const [a] = w.split(' ');
          expect(prev.endsWith(` ${a}`) && next.startsWith(w.slice(a.length + 1)), `${prev} | ${next}`).toBe(false);
        }
      }
    }
  });
});
