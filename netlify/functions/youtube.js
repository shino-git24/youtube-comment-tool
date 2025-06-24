const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const { videoId, order } = event.queryStringParameters;

  if (!videoId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'ビデオIDが指定されていません。' }),
    };
  }

  // 2つのAPI URLを定義
  const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' + videoId + '&key=' + API_KEY;
  const COMMENTS_API_URL = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' + videoId + '&order=' + order + '&maxResults=100&key=' + API_KEY;

  try {
    // ★★★ 動画情報とコメント情報を同時に（並行して）取得 ★★★
    const [videoResponse, commentsResponse] = await Promise.all([
      fetch(VIDEO_API_URL),
      fetch(COMMENTS_API_URL)
    ]);

    const videoData = await videoResponse.json();
    const commentsData = await commentsResponse.json();

    // どちらかのAPIでエラーがあれば、エラーレスポンスを返す
    if (!videoResponse.ok || !commentsResponse.ok) {
      const errorMessage = videoData.error?.message || commentsData.error?.message || 'YouTube APIからのデータ取得に失敗しました。';
      return { statusCode: videoResponse.status || commentsResponse.status, body: JSON.stringify({ message: errorMessage }) };
    }

    // 動画タイトルを取得（動画が見つからない場合はデフォルトのタイトルを設定）
    const videoTitle = videoData.items?.[0]?.snippet?.title || '動画タイトル不明';

    const comments = commentsData.items.map(item => {
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

    // ★★★ フロントエンドに返すデータに videoTitle を追加 ★★★
    const responseData = {
      videoTitle: videoTitle,
      comments: comments
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseData),
    };

  } catch (error) {
    console.error('Server Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'サーバーで予期せぬエラーが発生しました: ' + error.message }),
    };
  }
};
