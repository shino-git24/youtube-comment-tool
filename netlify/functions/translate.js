const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

// スリープ（待機）させるための関数
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const allCommentsToTranslate = JSON.parse(event.body);

    if (!allCommentsToTranslate || allCommentsToTranslate.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: '翻訳対象のテキストがありません。' }) };
    }

    const allTranslatedTexts = [];
    const CHUNK_SIZE = 20; // 一度にAPIに投げる数

    // ★★★ 受け取った全コメントを、サーバー内部で小分けに処理 ★★★
    for (let i = 0; i < allCommentsToTranslate.length; i += CHUNK_SIZE) {
      const chunk = allCommentsToTranslate.slice(i, i + CHUNK_SIZE);

      const requests = chunk.map(comment => {
        const prompt = `以下のユーザーコメントを自然な日本語に翻訳してください。翻訳結果だけを返してください。\n\n---\n${comment.text}\n---\n`;
        return fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }).then(res => res.json());
      });

      const responses = await Promise.all(requests);

      const translatedChunk = responses.map((res, index) => {
        const originalId = chunk[index].id;
        const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '翻訳に失敗しました。';
        return { id: originalId, text: text.trim() };
      });

      allTranslatedTexts.push(...translatedChunk);

      // ★★★ APIのレートリミットを避けるために、少し待機する ★★★
      if (i + CHUNK_SIZE < allCommentsToTranslate.length) {
        await sleep(1000); // 1秒待機
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(allTranslatedTexts),
    };

  } catch (error) {
    console.error('Translation Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
