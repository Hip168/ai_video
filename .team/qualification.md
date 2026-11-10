# Sổ đo người kiểm

Đo trước tập đầu và mỗi khi sửa prompt (file vai) của `fact-checker` hoặc `qc`. Cách chạy: `episodes/PLAYBOOK.md`, mục "Đo người kiểm". Ngưỡng (`features/11-doi-san-xuat.md`): `fact-checker` bắt ít nhất 90% lỗi cài và báo sai không quá 1 mục trên bản sạch; `qc` bắt mọi lỗi CRITICAL cài vào. Chưa đạt thì sửa prompt, chạy lại, ghi mỗi lượt một dòng. Chưa có dòng ĐẠT cho cả hai vai thì chưa làm tập.

Dòng do `qualify score` in ra (cột `row`); không sửa tay số liệu.

## fact-checker

| Ngày | Vai | Hash file vai | Lỗi cài | Bắt được | Tỉ lệ | Báo sai | Kết quả |
|---|---|---|---|---|---|---|---|
| (chưa chạy) | | | | | | | |

## qc

| Ngày | Vai | Hash file vai | Lỗi cài | Bắt được | Tỉ lệ | Báo sai | Kết quả |
|---|---|---|---|---|---|---|---|
| (chưa chạy) | | | | | | | |

## Lỗi bị bỏ sót và việc đã sửa

(Mỗi lượt chưa đạt: id lỗi bỏ sót, nguyên nhân phỏng đoán, dòng prompt đã đổi.)

## Lượt bỏ qua đo người kiểm
- 2026-11-11: người dùng cho bỏ qua đo fact-checker và qc cho tập đầu `vi-sao-may-tinh-dung-nhi-phan`, để có video nhanh và đỡ tốn token. Tập đầu đăng Không công khai, người dùng tự duyệt. Chưa có dòng ĐẠT nào.
