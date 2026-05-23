# Lead Scoring Prediction - CS114.Q22 Group 6

README này tóm tắt nội dung chính từ báo cáo **"Ứng dụng Machine Learning trong dự đoán tỷ lệ chuyển đổi khách hàng trên bộ dữ liệu Lead Scoring"**.

## Giới Thiệu

Dự án tập trung vào bài toán **Lead Scoring** cho X Education, một đơn vị cung cấp khóa học trực tuyến cho người đi làm. Mục tiêu là xây dựng mô hình học máy để dự đoán khả năng một khách hàng tiềm năng sẽ chuyển đổi thành khách hàng thực tế.

Bài toán được mô hình hóa dưới dạng phân loại nhị phân với biến mục tiêu:

- `Converted = 1`: lead đã chuyển đổi.
- `Converted = 0`: lead chưa chuyển đổi.

Kết quả dự đoán giúp đội ngũ kinh doanh ưu tiên chăm sóc các lead có khả năng chuyển đổi cao, từ đó giảm lãng phí thời gian và tối ưu chi phí vận hành.

## Bộ Dữ Liệu

Bộ dữ liệu Lead Scoring ban đầu có **9.240 dòng và 37 cột**, bao gồm thông tin về nguồn lead, hành vi truy cập website, hoạt động tương tác, nghề nghiệp, chuyên ngành và trạng thái chuyển đổi.

Sau quá trình làm sạch, dữ liệu còn **7.690 dòng và 16 cột**, không còn giá trị thiếu.

Các bước xử lý chính:

- Loại bỏ cột định danh như `Prospect ID`, `Lead Number`.
- Loại bỏ các cột có nhiều giá trị thiếu, ít thông tin hoặc phương sai thấp.
- Điền giá trị thiếu cho biến phân loại bằng `Unknown`.
- Điền giá trị thiếu cho biến số bằng trung vị.
- Loại bỏ các bản ghi trùng sau khi giảm chiều dữ liệu.

## Phân Tích Dữ Liệu

Một số phát hiện đáng chú ý từ EDA:

- Tỷ lệ chuyển đổi sau làm sạch đạt khoảng **39,2%**, dữ liệu hơi mất cân bằng.
- `Total Time Spent on Website` là tín hiệu quan trọng: lead ở lại website lâu hơn thường có khả năng chuyển đổi cao hơn.
- Biến `Tags` có khả năng phân biệt mạnh, đặc biệt các nhóm như `Will revert after reading the email`, `Closed by Horizzon`, `Lost to EINS`.
- Nhóm `Working Professional` có tỷ lệ chuyển đổi cao nhất ở nhiều chuyên ngành.
- Nguồn lead từ `Google` có tỷ lệ chuyển đổi tốt hơn `Direct Traffic`.
- Chuỗi tương tác `SMS Sent -> SMS Sent` có tỷ lệ chuyển đổi cao, khoảng **66,24%**.

## Xử Lý Outlier

Nhóm sử dụng phương pháp IQR để giới hạn ngoại lai cho các biến số:

- `TotalVisits`: khoảng 467 mẫu ngoại lai, giới hạn trên 9,6.
- `Page Views Per Visit`: khoảng 211 mẫu ngoại lai, giới hạn trên 7,0.
- `Total Time Spent on Website`: không phát hiện outlier đáng kể theo IQR.

Với biến danh mục, các giá trị có tần suất dưới 1% được gộp vào nhóm như `Other` hoặc `Not Specified` để giảm nhiễu.

## Feature Engineering Và Feature Selection

Các đặc trưng mới được tạo nhằm phản ánh tốt hơn mức độ quan tâm của lead:

- `Time_Per_Page`: thời gian trung bình trên mỗi trang.
- `Time_Per_Visit`: thời gian trung bình trên mỗi lượt truy cập.
- `Engagement_Score`: điểm tổng hợp mức độ tương tác.
- Các đặc trưng tương tác từ `PolynomialFeatures`, ví dụ `pvps_totalvisits`.

Quy trình chọn đặc trưng gồm nhiều tầng:

- Low Variance Filter.
- Mutual Information và kiểm tra đa cộng tuyến.
- GBM Feature Importance.
- RFECV với Random Forest.

Tập đặc trưng cuối cùng gồm 6 đặc trưng:

1. `Engagement_Score`
2. `Lead Origin`
3. `Last Activity`
4. `What is your current occupation`
5. `Lead Profile`
6. `pvps_totalvisits`

## Mô Hình Sử Dụng

Dự án thử nghiệm 5 mô hình học máy:

- Logistic Regression
- Support Vector Machine
- XGBoost
- LightGBM
- Random Forest

Hai phương pháp tối ưu siêu tham số được sử dụng:

- `GridSearchCV`: tìm kiếm toàn bộ các tổ hợp tham số trong không gian định nghĩa trước.
- `Optuna`: tối ưu tham số tự động bằng chiến lược tìm kiếm thông minh.

## Kết Quả Đánh Giá

Các mô hình được đánh giá bằng `Accuracy`, `Precision`, `Recall` và `F1 Score`.

### GridSearchCV

| Mô hình | F1 | Accuracy | Recall | Precision |
| --- | ---: | ---: | ---: | ---: |
| Logistic Regression | 0.6825 | 0.7718 | 0.6346 | 0.7446 |
| SVM | 0.7760 | 0.8134 | 0.8256 | 0.7320 |
| XGBoost | 0.7774 | 0.8283 | 0.7894 | 0.7658 |
| LightGBM | 0.7671 | 0.8192 | 0.7736 | 0.7736 |
| Random Forest | 0.7760 | 0.8277 | 0.7900 | 0.7625 |

### Optuna

| Mô hình | F1 | Accuracy | Recall | Precision |
| --- | ---: | ---: | ---: | ---: |
| Logistic Regression | 0.7600 | 0.7700 | 0.7500 | 0.7700 |
| SVM | 0.8100 | 0.8200 | 0.8000 | 0.8100 |
| XGBoost | 0.8133 | 0.8244 | 0.8095 | 0.8185 |
| LightGBM | 0.8203 | 0.8290 | 0.8198 | 0.8208 |
| Random Forest | 0.8202 | 0.8296 | 0.8185 | 0.8222 |

Mô hình tối ưu bằng Optuna cho kết quả tốt hơn GridSearchCV. Trong đó, **LightGBM** đạt F1 Score cao nhất (**0.8203**), còn **Random Forest** đạt Accuracy cao nhất (**0.8296**).

## Cấu Trúc Thư Mục

```text
.
├── Raw Data/
├── Cleaned Data/
├── EDA/
├── Process Outliers/
├── Feature Engineering/
├── Feature Selection /
├── Models/
│   ├── GridSearch/
│   └── Optuna/
├── Demo/
├── CS114Q22_Group6_Report.pdf
└── CS114Q22_Group6_Slides.pdf
```

## Hướng Phát Triển

- Làm giàu dữ liệu lead bằng thêm thông tin hành vi và lịch sử tương tác.
- Thử nghiệm thêm các mô hình nâng cao hoặc ensemble nhiều mô hình.
- Đóng gói mô hình thành hệ thống dự đoán thực tế để hỗ trợ đội ngũ sales ưu tiên lead.
