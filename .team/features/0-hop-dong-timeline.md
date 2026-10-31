# Hợp đồng `timeline.json`, phiên bản 1

Dùng chung cho đề mục 1 (ghi) và đề mục 2 (đọc). Mẫu hợp lệ, viết sẵn: `.team/contract/timeline.sample.json`. Test của cả hai đề mục đọc thẳng file mẫu này, không chép đi nơi khác. Đổi hợp đồng phải qua BA và tăng `version`.

## Vị trí
Đề mục 1 ghi vào `video/public/timeline.json` và `video/public/audio/narration.wav`. `audio.src` là đường dẫn tương đối so với `video/public/`.

## Định dạng
```json
{
  "version": 1, "fps": 30, "width": 1920, "height": 1080,
  "durationInFrames": 2130,
  "audio": { "src": "audio/narration.wav" },
  "scenes": [
    { "id": "phone", "startFrame": 0, "durationFrames": 300,
      "beats": [
        { "id": "s01", "startFrame": 0, "durationFrames": 124, "text": "...", "cue": "send" }
      ] }
  ]
}
```

## Luật
1. `version` = 1, `fps` = 30, `width` = 1920, `height` = 1080.
2. Mọi số frame là số nguyên ≥ 0. Mọi `startFrame` là **tuyệt đối** trong toàn video.
3. `scenes[].id` thuộc tập `phone, dns, packets, wifi, hops, server, receiver`, mỗi id xuất hiện tối đa một lần.
4. Cảnh liền nhau, không hở, không chồng: cảnh đầu `startFrame` = 0; cảnh sau bắt đầu đúng tại `startFrame + durationFrames` của cảnh trước; cảnh cuối kết thúc đúng tại `durationInFrames`.
5. Beat trong một cảnh tăng dần, không chồng, nằm trọn trong cảnh. **Beat được phép có khoảng hở** (lúc nghỉ giữa hai nhịp, không hiện phụ đề).
6. `beats[].id` duy nhất toàn file. Mỗi cảnh có ít nhất một beat.
7. `text` không rỗng, tối đa 100 ký tự, dạng Unicode NFC.
8. `cue` là chuỗi tùy chọn, là mốc cho animation. Beat không có `cue` thì animation neo theo thứ tự beat.
9. `durationInFrames` = làm tròn lên của (độ dài âm thanh tính bằng giây + 0,5) × 30. Với video thật phải nằm trong khoảng 1800–2700.
10. Cảnh nhận thêm khoảng nghỉ: phần thời gian từ cuối beat cuối cùng đến đầu cảnh sau thuộc cảnh trước.

## Cách đề mục 1 tính
Python ghi `scene` theo từng nhịp trong kịch bản, gom các nhịp liền nhau cùng cảnh. `startFrame` của beat = `round(giây × 30)`; beat kết thúc tại `round(giây_cuối × 30)`, không chồng beat sau. `startFrame` của cảnh = `startFrame` của beat đầu tiên trong cảnh, riêng cảnh đầu là 0.
