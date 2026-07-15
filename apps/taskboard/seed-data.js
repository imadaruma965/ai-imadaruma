// 尊徳渡しタスク（原文＋レックス請求追加）
// フランクリン／7つの習慣: urgency×importance ＋ horizon(day|week|month|someday)

window.TASKBOARD_SEED = {
  source: "user-original-plus-rex-billing",
  note: "原文55＋レックス2〜4月・福銀自動振替。カテゴリ色分け対応。",
  tasks: [
    // —— フレスト ——
    { title: "【フレスト】請求案内（毎月3日送信）", category: "fres", horizon: "month", urgency: "high", importance: "high", tags: ["recurring"], notes: "毎月3日" },
    { title: "【フレスト】福銀引き落とし設定（毎月10日送信）", category: "fres", horizon: "month", urgency: "high", importance: "high", tags: ["recurring"], notes: "毎月10日" },
    { title: "【フレスト】支払い漏れがないか請求書チェック", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】発注漏れがないかチェック", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】カクウチハルト選手、発注", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】鹿屋市の補助金確認", category: "fres", horizon: "month", urgency: "low", importance: "high", tags: [], notes: "原文「鹿屋市時」" },
    { title: "【フレスト】バモスカップ宿泊確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】送迎車確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】夏休みスケジュール案内", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】壱岐合宿日程確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】壱岐合宿出欠確認", category: "fres", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【フレスト】今後の方針発表", category: "fres", horizon: "month", urgency: "low", importance: "high", tags: [] },

    // —— レックス（請求まわり追加含む）——
    { title: "【レックス】請求案内（毎月10日送信）", category: "lex", horizon: "month", urgency: "high", importance: "high", tags: ["recurring"], notes: "毎月10日" },
    { title: "【レックス】福銀引き落とし設定（毎月10日送信）", category: "lex", horizon: "month", urgency: "high", importance: "high", tags: ["recurring"], notes: "毎月10日" },
    { title: "【レックス】の支払い", category: "lex", horizon: "week", urgency: "high", importance: "high", tags: [] },
    { title: "【レックス】2月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"], notes: "請求確定・案内" },
    { title: "【レックス】3月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"] },
    { title: "【レックス】4月分", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay"] },
    { title: "【レックス】福銀・自動振替設定", category: "lex", horizon: "day", urgency: "high", importance: "high", tags: ["pay", "adm"] },

    // —— デザイン ——
    { title: "【デザイン】製作依頼ジェークリーム", category: "design", horizon: "week", urgency: "low", importance: "high", tags: [] },

    // —— sound ——
    { title: "【sound】ブリッジ納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "【sound】りも納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "【sound】しゅうた君納品仕上げ（demo）", category: "sound", horizon: "day", urgency: "high", importance: "high", tags: ["dl"] },
    { title: "【sound】レックスソング作成", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "【sound】サウンドビジネスモデルの構築", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "【sound】40万ロードマップ作成", category: "sound", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "【sound】ペルソナ再作成", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【sound】営業リスト出し", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【sound】インスタグラム投稿", category: "media", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "【sound】DM営業", category: "sound", horizon: "week", urgency: "low", importance: "high", tags: [] },

    // —— DS / 発信 / 執筆 ——
    { title: "【DS】クラウドに入れるベースファイル項目だし", category: "ds", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【執筆】Kindle電子書籍執筆（月1回）", category: "write", horizon: "month", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】リンクトイン投稿（全体）", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【発信】月曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】火曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】水曜・LinkedInニュースレター", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】木曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】金曜・LinkedInカルーセル", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】日曜・LinkedInニュースレター", category: "media", horizon: "week", urgency: "low", importance: "high", tags: ["recurring"] },
    { title: "【発信】X毎日投稿", category: "media", horizon: "day", urgency: "low", importance: "low", tags: ["recurring"] },
    { title: "【発信】NL音声化→ラジオ／Podcast／YouTube", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【発信】LIカルーセルをYouTube解説動画に", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【発信】LINE公式の文章投稿", category: "media", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【DS】オンライン動画制作", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "【DS】自動化システム構築（UTAGE）", category: "ds", horizon: "someday", urgency: "low", importance: "low", tags: [], notes: "やらない戦と要突合" },
    { title: "【DS】公式サイト構築", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },
    { title: "【DS】Lステップ", category: "ds", horizon: "someday", urgency: "low", importance: "low", tags: [], notes: "やらない戦と要突合" },
    { title: "【DS】公式LINEプレゼントツール作成", category: "ds", horizon: "month", urgency: "low", importance: "high", tags: [] },

    // —— 投資 ——
    { title: "【投資】WSJチェック", category: "invest", horizon: "day", urgency: "low", importance: "low", tags: [] },
    { title: "【投資】銘柄スクリーニング", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "【投資】ファンダメンタル分析", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "【投資】テクニカル分析", category: "invest", horizon: "week", urgency: "low", importance: "low", tags: [] },
    { title: "【投資】売買成立", category: "invest", horizon: "week", urgency: "low", importance: "high", tags: [] },
    { title: "【投資】個別株投資勉強", category: "invest", horizon: "month", urgency: "low", importance: "low", tags: [] },

    // —— 個人 ——
    { title: "【個人】マニュライフ生命の振込（三井住友）1万円", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "【個人】paypay銀行に振込み1万円入れる", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "【個人】朝と夜の習慣徹底（性格改善）", category: "personal", horizon: "day", urgency: "low", importance: "high", tags: [] },
    { title: "【個人】BNI認証電話確認依頼2名", category: "personal", horizon: "day", urgency: "high", importance: "high", tags: [] },
    { title: "【個人】読書", category: "personal", horizon: "week", urgency: "low", importance: "low", tags: [] }
  ]
};
