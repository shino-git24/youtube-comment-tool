const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  // Netlifyの環境変数からAPIキーを取得
  const API_KEY = process.env.YOUTUBE_API_KEY;

  // フロントエンドからのリクエスト情報（URLの?以降）を取得
  const { videoId, order } = event.queryStringParameters;

  if (!videoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'ビデオIDが指定されていません。' }),
    };
  }

  const YOUTUBE_API_URL = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=<span class="math-inline">\{videoId\}&order\=</span>{order}&maxResults=100&key=${API_KEY}`;

  try {
    const response = await fetch(YOUTUBE_API_URL);
    const data = await response.json();

    if (!response.ok) {
      // APIからエラーが返された場合、その内容をフロントエンドに伝える
      const errorMessage = data.error?.message || 'YouTube APIからのデータ取得に失敗しました。';
      console.error('YouTube API Error:', errorMessage);
      return { statusCode: response.status, body: JSON.stringify({ message: errorMessage }) };
    }

    // GASの時と同じデータ形式に変換して、フロントエンドがそのまま使えるようにする
    const comments = data.items.map(item => {
      const comment = item.snippet.topLevelComment.snippet;
      return {
        id: item.snippet.topLevelComment.id,
        author: comment.authorDisplayName,
        authorProfileImageUrl: comment.authorProfileImageUrl,
        publishedAt: new Date(comment.publishedAt).toLocaleString('ja-JP'),
        text: comment.textDisplay,
        likeCount: comment.likeCount,
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(comments),
    };

  } catch (error) {
    console.error('Server Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーで予期せぬエラーが発生しました: ' + error.message }),
    };
  }
};