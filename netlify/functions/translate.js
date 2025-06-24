const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const commentsToTranslate = JSON.parse(event.body);

    if (!commentsToTranslate || commentsToTranslate.length === 0) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const allTranslatedTexts = [];
    const CHUNK_SIZE = 20; // AIに一度に渡すかたまりのサイズ

    // ★★★ サーバー内部で、受け取った全コメントをチャンクに分けて処理 ★★★
    for (let i = 0; i < commentsToTranslate.length; i += CHUNK_SIZE) {
      const chunk = commentsToTranslate.slice(i, i + CHUNK_SIZE);

      const prompt = `以下のJSON配列に含まれる各オブジェクトの'text'の値を、必ず自然な日本語に翻訳してください。応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。\n\n入力JSON:\n${JSON.stringify(chunk)}\n\n出力JSON:\n`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        }
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
          console.error("Gemini API Error (chunk " + i + "):", await response.text());
          throw new Error(`AI翻訳でエラーが発生しました (HTTP Status: ${response.status})`);
      }

      const responseData = await response.json();

      if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
        const jsonString = responseData.candidates[0].content.parts[0].text;
        const translatedObjects = JSON.parse(jsonString);
        allTranslatedTexts.push(...translatedObjects);
      } else {
        throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
      }
    }

    // 全てのチャンクの処理が終わったら、まとめて返す
    return {
      statusCode: 200,
      body: JSON.stringify(allTranslatedTexts)
    };

  } catch (error) {
    console.error('Translation Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
