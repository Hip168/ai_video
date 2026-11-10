# INDEX — thư viện dự án
> Mọi agent đọc file này trước, rồi chỉ mở đúng file mình cần.
> Luật chung: ~/.claude/team/CONVENTIONS.md

| File | Nội dung | Ai đọc |
|---|---|---|
| .team/brief.md | Yêu cầu gốc + lựa chọn đã chốt | BA, DEV, TESTER |
| .team/stack.md | Ngôn ngữ, framework, lệnh cài/chạy/test | DEV, TESTER |
| .team/decisions.md | Quyết định kiến trúc, quan hệ giữa các đề mục | BA, DEV |
| .team/plan.md | Đề mục X → nhánh → issue [X-y] | Tất cả |
| .team/features/X-*.md | Chi tiết từng đề mục | DEV-X, TESTER-X |
| .team/tests/X.md | Sổ test của đề mục X | TESTER-X, TEST-LEAD-X, người dùng |
| .team/features/X-*-giao-dien.md | Chữ ký công khai (tên class/hàm/Key/ARB/đường dẫn file) — hợp đồng giữa DEV và TESTER | DEV-X, TESTER-X, TEST-LEAD-X |
| .team/conflicts/X.md | Chỗ DEV làm khác nhau | Người dùng, BA |
| .team/features/0-hop-dong-timeline.md | Hợp đồng `timeline.json` giữa đề mục 1 và 2 | DEV, TESTER, TEST-LEAD của 1, 2, 3 |
| .team/contract/timeline.sample.json | File mẫu hợp lệ của hợp đồng, test hai bên đọc trực tiếp | DEV, TESTER của 1, 2 |
| .team/features/kich-ban-mau.md | Kịch bản video mẫu, 19 nhịp, 7 cảnh, ý nghĩa cue | DEV, TESTER của 1, 2 |
| .team/features/1-am-thanh.md | Đề mục 1: giọng đọc, timeline, SRT (Python) | DEV-1, TESTER-1 |
| .team/features/2-hinh-anh.md | Đề mục 2: cảnh, phụ đề, MP4 (Remotion) | DEV-2, TESTER-2 |
| .team/features/3-ghep-video.md | Đề mục 3: lệnh một phát, video mẫu thật | DEV-3, TESTER-3 |
| .team/autonomy.md | Chế độ tự động và các điểm dừng của dự án | Điều phối |
| .team/features/4-khung-doc.md | Đề mục 4: video dọc 1080×1920 (tạm dừng, D19) | DEV-4, TESTER-4 |
| .team/features/0b-hop-dong-timeline-v2.md | Hợp đồng `timeline.json` v2 và `script.json` của tập | DEV, TESTER, TEST-LEAD của 5–12 |
| .team/contract/timeline2.sample.json | File mẫu hợp lệ của hợp đồng v2, test hai bên đọc trực tiếp | DEV, TESTER của 5, 6, 9, 10 |
| .team/features/5-dung-tap.md | Đề mục 5: dựng tập, timeline v2, chuẩn hoá lời đọc | DEV-5, TESTER-5 |
| .team/features/6-khung-v2.md | Đề mục 6: composition Episode, cảnh cấu trúc, lint chống lặp | DEV-6, TESTER-6 |
| .team/features/7-8-canh.md | Đề mục 7, 8: 15 loại cảnh còn lại | DEV-7, DEV-8, TESTER |
| .team/features/9-am-thanh-tap.md | Đề mục 9: SFX, nhạc, trộn | DEV-9, TESTER-9 |
| .team/features/10-render-dai.md | Đề mục 10: render đoạn, ghép, kiểm, `make-episode.sh` | DEV-10, TESTER-10 |
| .team/features/11-doi-san-xuat.md | Đề mục 11: agent, playbook, script cổng, đo người kiểm | DEV-11, TESTER-11 |
| .team/features/14-shorts.md | Đề mục 14: Shorts dọc 1080×1920 từ tập dài (D28) | DEV-14, TESTER-14 |
| .team/features/13-tu-dong.md | Đề mục 13: tự tạo và tự đăng theo lịch (YouTube API, launchd) | DEV-13, TESTER-13, OPS |
| .team/features/12-tap-thi-diem.md | Đề mục 12: tạo kênh, tập đầu, duyệt | Điều phối, OPS |
| .team/doi-san-xuat.md | Vai, luồng, cổng duyệt, mẫu trao tay của đội sản xuất | Mọi agent sản xuất, điều phối |
