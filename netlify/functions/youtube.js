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

  try {
    // ★★★ partに"statistics"を追加 ★★★
    const VIDEO_API_URL = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + videoId + '&key=' + API_KEY;
    const videoResponse = await fetch(VIDEO_API_URL);
    const videoData = await videoResponse.json();

    if (!videoResponse.ok) {
      const errorMessage = videoData.error?.message || '動画情報の取得に失敗しました。';
      return { statusCode: videoResponse.status, body: JSON.stringify({ message: errorMessage }) };
    }

    const videoItem = videoData.items?.[0];
    const videoTitle = videoItem?.snippet?.title || '動画タイトル不明';
    // ★★★ 統計情報から総コメント数を取得 ★★★
    const totalCommentCount = videoItem?.statistics?.commentCount || 0;

    // --- コメント全件取得処理 (変更なし) ---
    let allComments = [];
    let nextPageToken = '';

    do {
      const pageTokenQuery = nextPageToken ? '&pageToken=' + nextPageToken : '';
      const COMMENTS_API_URL = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=' + videoId + '&order=' + order + '&maxResults=100' + pageTokenQuery + '&key=' + API_KEY;

      const commentsResponse = await fetch(COMMENTS_API_URL);
      const commentsData = await commentsResponse.json();

      if (!commentsResponse.ok) {
        throw new Error(commentsData.error?.message || 'コメントの取得に失敗しました。');
      }

      const mappedComments = commentsData.items.map(item => {
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

      allComments = allComments.concat(mappedComments);
      nextPageToken = commentsData.nextPageToken;

    } while (nextPageToken);

    // ★★★ フロントに返すデータに totalCommentCount と fetchedCommentCount を追加 ★★★
    const responseData = {
      videoTitle: videoTitle,
      totalCommentCount: totalCommentCount,       // APIが報告する総コメント数
      fetchedCommentCount: allComments.length,  // 実際に取得できたコメント数
      comments: allComments
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
