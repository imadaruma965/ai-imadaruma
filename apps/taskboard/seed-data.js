// 尊徳渡しタスク（原文＋レックス請求追加）
// フランクリン／7つの習慣: urgency×importance ＋ horizon(day|week|month|someday)

window.TASKBOARD_SEED = {
  source: "user-original-plus-rex-billing",
  note: "原文55＋レックス2〜4月・福銀自動振替。カテゴリ色分け対応。",
  tasks: [
    // —— フレスト ——
    { title: "請求案内", category: "fres", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 1, scheduleKey: "fres-billing", tags: ["recurring"], notes: "毎月1日" },
    { title: "保護者案内", category: "fres", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 3, scheduleKey: "fres-guardian", tags: ["recurring"], notes: "毎月3日" },
    { title: "引き落とし日", category: "fres", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 10, scheduleKey: "fres-withdrawal", tags: ["recurring"], notes: "毎月10日" },
    { title: "支払い漏れがないか請求書チェック", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "発注漏れがないかチェック", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "カクウチハルト選手、発注", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "鹿屋市の補助金確認", category: "fres", horizon: "month", urgency: "low", importance: "high", tags: [], notes: "原文「鹿屋市時」" },
    { title: "バモスカップ宿泊確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "送迎車確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "夏休みスケジュール案内", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "壱岐合宿日程確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "壱岐合宿出欠確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "今後の方針発表", category: "fres", horizon: "month", urgency: "low", importance: "high", tags: [] },

    // —— レックス（請求まわり追加含む）——
    { title: "請求案内", category: "lex", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 1, scheduleKey: "lex-billing", tags: ["recurring"], notes: "毎月1日" },
    { title: "保護者案内", category: "lex", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 3, scheduleKey: "lex-guardian", tags: ["recurring"], notes: "毎月3日" },
    { title: "引き落とし日", category: "lex", horizon: "month", urgency: "high", importance: "high", recurrence: "monthly", recurrenceDay: 10, scheduleKey: "lex-withdrawal", tags: ["recurring"], notes: "毎月10日" },
    { title: "の支払い", category: "lex", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "2月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"], notes: "請求確定・案内" },
    { title: "3月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"] },
    { title: "4月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"] },
    { title: "福銀・自動振替設定", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay", "adm"] },

    // —— デザイン ——
    { title: "製作依頼ジェークリーム", category: "design", horizon: "week", urgency: "low", importance: "high", tags: [] },

    // —— sound ——
    { title: "ブリッジ納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "りも納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "しゅうた君納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "レックスソング作成", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "サウンドビジネスモデルの構築", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "40万ロードマップ作成", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "ペルソナ再作成", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "営業リスト出し", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "インスタグラム投稿", category: "media", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "DM営業", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },

    // —— DS / 発信 / 執筆 ——
    { title: "クラウドに入れるベースファイル項目だし", category: "ds", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "Kindle電子書籍執筆（月1回）", category: "write", horizon: "month", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "リンクトイン投稿（全体）", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "月曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "火曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "水曜・LinkedInニュースレター", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "木曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "金曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "日曜・LinkedInニュースレター", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "X毎日投稿", category: "media", horizon: "day", urgency: "low", importance: "low", tags: ["recurring"] },
    { title: "NL音声化→ラジオ／Podcast／YouTube", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "LIカルーセルをYouTube解説動画に", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "LINE公式の文章投稿", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "オンライン動画制作", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "自動化システム構築（UTAGE）", category: "ds", horizon: "someday", urgency: "low", importance: "low", tags: [], notes: "やらない戦と要突合" },
    { title: "公式サイト構築", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "Lステップ", category: "ds", horizon: "someday", urgency: "low", importance: "low", tags: [], notes: "やらない戦と要突合" },
    { title: "公式LINEプレゼントツール作成", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },

    // —— 投資 ——
    { title: "WSJチェック", category: "invest", horizon: "day", urgency: "low", importance: "low", tags: [] },
    { title: "銘柄スクリーニング", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "ファンダメンタル分析", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "テクニカル分析", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "売買成立", category: "invest", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "個別株投資勉強", category: "invest", horizon: "month", urgency: "low", importance: "low", tags: [] },

    // —— 個人 ——
    { title: "マニュライフ生命の振込（三井住友）1万円", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "paypay銀行に振込み1万円入れる", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "朝と夜の習慣徹底（性格改善）", category: "personal", horizon: "day", urgency: "low", importance: "high", tags: [] },
    { title: "BNI認証電話確認依頼2名", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "読書", category: "personal", horizon: "week", urgency: "low", importance: "low", tags: [] }
  ]
};
