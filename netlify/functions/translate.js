// ★★★ ライブラリの読み込みをすべて削除！ ★★★

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
    const CHUNK_SIZE = 5;

    for (let i = 0; i < commentsToTranslate.length; i += CHUNK_SIZE) {
      const chunk = commentsToTranslate.slice(i, i + CHUNK_SIZE);

      // ★★★ プロンプトの堅牢性を向上 ★★★
      // 指示と入力データを明確に分離し、予期せぬ挙動を減らします。
      const prompt = `あなたは優秀な翻訳アシスタントです。以下のJSON配列に含まれる各オブジェクトの'text'の値を、自然な日本語に翻訳してください。
応答は、元の'id'と翻訳後の'text'を含むJSON配列の文字列だけにしてください。他の説明文やコードブロックのマーカー(\`\`\`)は一切含めないでください。

[入力データ]
${JSON.stringify(chunk, null, 2)}

[出力JSON]
`;

      // ★★★ デバッグ用に送信内容をログ出力 ★★★
      // エラーが発生した際に、どのデータが原因だったかNetlifyのログで確認できます。
      console.log('--- Sending data to Gemini API ---');
      console.log(prompt);
      console.log('------------------------------------');


      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        }
      };

      // ★★★ 標準のfetchを使用 ★★★
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // ★★★ APIからのエラーレスポンスを詳しくログ出力 ★★★
      if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini API returned an error:', JSON.stringify(errorData, null, 2));
          throw new Error(`AI翻訳でエラーが発生しました (HTTP Status: ${response.status})`);
      }

      const responseData = await response.json();

      if (responseData.candidates && responseData.candidates[0].content.parts[0].text) {
        const jsonString = responseData.candidates[0].content.parts[0].text;
        const translatedObjects = JSON.parse(jsonString);
        allTranslatedTexts.push(...translatedObjects);
      } else {
        // ★★★ APIからの正常な応答もログに出力して確認 ★★★
        console.warn('Unexpected API response format:', JSON.stringify(responseData, null, 2));
        throw new Error("AI翻訳に失敗しました。APIからの応答形式が正しくありません。");
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(allTranslatedTexts)
    };

  } catch (error) {
    console.error('Handler Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: '翻訳処理中にサーバーでエラーが発生しました。' + error.message }),
    };
  }
};
