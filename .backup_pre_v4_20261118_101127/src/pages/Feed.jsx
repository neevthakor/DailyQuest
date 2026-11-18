import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { postsService } from '../services/postsService';
import { POST_VISIBILITIES } from '../lib/premiumConfig';

function PostCard({ post, currentUserId, onLikeToggle, onDelete, onOpenComments }) {
  return (
    <div className="card mb-16">
      <div className="inline-edit-row mb-16">
        <div style={{ fontWeight: 600 }}>{post.username || 'Player'}</div>
        <div className="duel-sub">{new Date(post.createdAt).toLocaleDateString()}</div>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', marginBottom: '12px' }}>{post.content}</div>
      <div className="inline-edit-row">
        <button className="btn btn-secondary" onClick={() => onLikeToggle(post)}>
          {post.likedByMe ? '♥' : '♡'} {post.likeCount}
        </button>
        <button className="btn btn-secondary" onClick={() => onOpenComments(post)}>
          💬 {post.commentCount}
        </button>
        {post.userId === currentUserId && (
          <button className="btn btn-danger" onClick={() => onDelete(post)}>Delete</button>
        )}
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [scope, setScope] = useState('public');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [activePostId, setActivePostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await postsService.fetchFeed({ scope }));
    } catch (e) {
      setError(e.message || 'Could not load the feed.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePost(e) {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await postsService.createPost(user.id, { content, visibility });
      setContent('');
      load();
    } catch (e) {
      setError(e.message || 'Could not publish the post.');
    }
  }

  async function toggleLike(post) {
    try {
      if (post.likedByMe) {
        await postsService.unlikePost(user.id, post.id);
      } else {
        await postsService.likePost(user.id, post.id);
      }
      setPosts((prev) => prev.map((p) => (p.id === post.id
        ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
        : p)));
    } catch (e) {
      setError(e.message || 'Could not update your like.');
    }
  }

  async function remove(post) {
    try {
      await postsService.deletePost(user.id, post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      setError(e.message || 'Could not delete the post.');
    }
  }

  async function openComments(post) {
    setActivePostId(post.id);
    try {
      setComments(await postsService.fetchComments(post.id));
    } catch (e) {
      setError(e.message || 'Could not load comments.');
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !activePostId) return;
    try {
      await postsService.addComment(user.id, activePostId, commentText);
      setCommentText('');
      setComments(await postsService.fetchComments(activePostId));
      setPosts((prev) => prev.map((p) => (p.id === activePostId ? { ...p, commentCount: p.commentCount + 1 } : p)));
    } catch (e) {
      setError(e.message || 'Could not add your comment.');
    }
  }

  return (
    <div>
      <div className="page-title">Progress Feed</div>
      <div className="page-subtitle">Share your day — never your private tasks or goals</div>

      <form className="card mb-16" onSubmit={handlePost}>
        <textarea
          className="input-field mb-16"
          rows={3}
          placeholder={'Day 24 🔥\nCompleted 5/5 quests today...'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="inline-edit-row mb-16">
          <select className="input-field" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            {POST_VISIBILITIES.filter((v) => v !== 'group').map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Post</button>
        </div>
      </form>

      <div className="leaderboard-tabs mb-16">
        {['public', 'mine'].map((s) => (
          <button key={s} className={`leaderboard-tab ${scope === s ? 'active' : ''}`} onClick={() => setScope(s)}>
            {s === 'public' ? 'Community' : 'My Posts'}
          </button>
        ))}
      </div>

      {error && <div className="form-error mb-16">{error}</div>}
      {loading && <div className="page-subtitle">Loading the feed...</div>}
      {!loading && posts.length === 0 && <div className="empty-state">No posts yet — be the first to share.</div>}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={user?.id}
          onLikeToggle={toggleLike}
          onDelete={remove}
          onOpenComments={openComments}
        />
      ))}

      {activePostId && (
        <div className="modal-overlay" onClick={() => setActivePostId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Comments</div>
            <div className="modal-body">
              {comments.length === 0 && <div className="empty-state">No comments yet.</div>}
              {comments.map((c) => (
                <div key={c.id} className="mb-16">
                  <div style={{ fontWeight: 600 }}>{c.username}</div>
                  <div>{c.content}</div>
                </div>
              ))}
              <form onSubmit={submitComment} className="inline-edit-row">
                <input
                  className="input-field"
                  placeholder="Add a comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">Send</button>
              </form>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setActivePostId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
