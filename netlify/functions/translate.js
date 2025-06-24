const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Google AI (Gemini) のAPIキーを環境変数から取得
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
  // POSTリクエスト以外は受け付けない
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // フロントエンドから送られてきた翻訳対象のコメント（{id, text}の配列）を取得
    const commentsToTranslate = JSON.parse(event.body);

    if (!commentsToTranslate || commentsToTranslate.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: '翻訳対象のテキストがありません。' }) };
    }

    // Gemini APIに一括でリクエストを送る準備
    const requests = commentsToTranslate.map(comment => {
      const prompt = `以下のユーザーコメントを自然な日本語に翻訳してください。翻訳結果だけを返してください。\n\n---\n${comment.text}\n---\n`;
      return fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }).then(res => res.json());
    });

    const responses = await Promise.all(requests);

    // 翻訳結果を、元のIDと紐付けて返す
    const translatedTexts = responses.map((res, index) => {
      const originalId = commentsToTranslate[index].id;
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '翻訳に失敗しました。';
      return { id: originalId, text: text.trim() };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(translatedTexts),
    };

  } catch (error) {
    console.error('Translation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};