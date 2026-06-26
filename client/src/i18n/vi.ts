export const vi = {
  meta: {
    title: "MonopolyBattle — Học Thuyết Độc Quyền",
    description: "Trò chơi mô phỏng tương tác thực tế về độc quyền",
  },
  stats: {
    money: "Tài chính",
    moneyUnit: "tỷ VNĐ",
    marketShare: "Thị phần",
    technology: "Công nghệ",
    reputation: "Uy tín",
    monopolyRisk: "Rủi ro độc quyền",
    score: "Điểm số",
  },
  game: {
    timeLeft: "Còn lại: {seconds} giây",
    round: "Vòng {round}",
    phase: {
      lobby: "Phòng chờ",
      countdown: "Đếm ngược",
      decision: "Đưa ra quyết định",
      processing: "Đang xử lý kết quả",
      event: "Sự kiện thị trường",
      narration: "Bình luận từ AI",
      quiz: "Trắc nghiệm kiến thức",
      results: "Bảng xếp hạng vòng",
      finished: "Kết thúc trò chơi",
    },
  },
  errors: {
    invalidInput: "Dữ liệu nhập vào không hợp lệ.",
    serverError: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
  },
} as const;
