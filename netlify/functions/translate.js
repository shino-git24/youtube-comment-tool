exports.handler = async (event) => {
  // ダミー関数が呼ばれたことをログに出力
  console.log("--- DUMMY translate.js function handler started ---");

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const commentsToTranslate = JSON.parse(event.body);

    if (!commentsToTranslate || commentsToTranslate.length === 0) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    // ★★★ AIに通信せず、ダミーの翻訳結果を生成 ★★★
    const dummyTranslatedTexts = commentsToTranslate.map(comment => {
      return {
        id: comment.id,
        text: `【ダミー翻訳】${comment.text.substring(0, 20)}...`
      };
    });

    // ダミーデータを返す
    return {
      statusCode: 200,
      body: JSON.stringify(dummyTranslatedTexts)
    };

  } catch (error) {
    console.error('DUMMY function Error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'ダミー関数でエラーが発生しました。' }),
    };
  }
};
