import { useEffect, useRef, useState } from 'react';
import { SuperDoc } from 'superdoc';
import 'superdoc/style.css';
import { CommentsSidebarController, type SidebarComment, formatCommentDate } from './CommentsSidebarController';

type DocumentMode = 'editing' | 'suggesting' | 'viewing';
type Status = 'Loading sample document' | 'Ready' | 'No document loaded';

const SAMPLE_DOCUMENT = '/docs/default.docx';
const CURRENT_USER = { name: 'SuperDoc User', email: 'user@example.com' };

export default function App() {
  const [file, setFile] = useState<File | string>(SAMPLE_DOCUMENT);
  const [mode, setMode] = useState<DocumentMode>('suggesting');
  const [status, setStatus] = useState<Status>('Loading sample document');
  const [comments, setComments] = useState<SidebarComment[]>([]);
  const [activeCommentIds, setActiveCommentIds] = useState<string[]>([]);
  const [activeTrackText, setActiveTrackText] = useState('');
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const superdocRef = useRef<any>(null);
  const controllerRef = useRef<CommentsSidebarController | null>(null);

  // Initialize controller once
  useEffect(() => {
    controllerRef.current = new CommentsSidebarController({
      user: CURRENT_USER,
      onCommentsChange: setComments,
      onActiveCommentIdsChange: setActiveCommentIds,
      onActiveTrackTextChange: setActiveTrackText,
    });

    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Initialize SuperDoc
  useEffect(() => {
    if (!containerRef.current) return;

    superdocRef.current?.destroy();
    controllerRef.current?.destroy();
    setStatus(file ? 'Loading sample document' : 'No document loaded');
    setComments([]);
    setActiveCommentIds([]);
    setActiveTrackText('');

    superdocRef.current = new SuperDoc({
      selector: containerRef.current,
      document: file || undefined,
      documentMode: mode,
      role: 'editor',
      user: CURRENT_USER,
      modules: {
        toolbar: true,
        comments: {
          displayMode: 'inline',
          allowResolve: true,
        },
        contentControls: {
          chrome: 'none',
        },
        trackChanges: {
          visible: true,
          mode: 'review',
          enabled: true,
        },
      },
      comments: {
        visible: true,
      },
      trackChanges: {
        visible: true,
      },
      layoutEngineOptions: {
        trackedChanges: {
          mode: 'review',
          enabled: true,
        },
      },
      onReady: () => {
        setStatus('Ready');
        superdocRef.current?.setTrackedChangesPreferences?.({ mode: 'review', enabled: true });

        // Initialize the controller with SuperDoc instance
        if (controllerRef.current && containerRef.current) {
          controllerRef.current.init(superdocRef.current, containerRef.current);
        }
      },
      onCommentsUpdate: (event: any) => {
        controllerRef.current?.handleSuperdocCommentsUpdate(event);
        if (event?.type) {
          setStatus('Ready');
        }
      },
    });

    (window as any).__superdocDemo = superdocRef.current;

    return () => {
      superdocRef.current?.destroy();
      superdocRef.current = null;
    };
  }, [file]);

  const changeMode = (nextMode: DocumentMode) => {
    setMode(nextMode);
    superdocRef.current?.setDocumentMode(nextMode);
  };

  const addComment = () => {
    const editor = superdocRef.current?.activeEditor;
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from === to) {
      window.alert('Select text in the document first.');
      return;
    }

    editor.commands.addComment('Please review this section.');
    controllerRef.current?.scheduleRefreshComments();
  };

  const acceptAll = () => {
    superdocRef.current?.activeEditor?.commands.acceptAllTrackedChanges();
    controllerRef.current?.scheduleRefreshComments();
  };

  const rejectAll = () => {
    superdocRef.current?.activeEditor?.commands.rejectAllTrackedChanges();
    controllerRef.current?.scheduleRefreshComments();
  };

  const exportDocx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await superdocRef.current?.export({ exportedName: 'superdoc-review-demo' });
    } finally {
      setExporting(false);
    }
  };

  const focusComment = (comment: SidebarComment) => {
    controllerRef.current?.focusCommentInEditor(comment);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <h1>SuperDoc Review UI Demo</h1>
          <span>{status}</span>
        </div>

        <label className="file-picker">
          <input
            type="file"
            accept=".docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? SAMPLE_DOCUMENT)}
          />
          Upload DOCX
        </label>

        <div className="segmented" aria-label="Document mode">
          {(['editing', 'suggesting', 'viewing'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={mode === option ? 'active' : ''}
              onClick={() => changeMode(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button className="button" type="button" onClick={addComment}>
          Add Comment
        </button>
        <button className="button positive" type="button" onClick={acceptAll}>
          Accept All
        </button>
        <button className="button danger" type="button" onClick={rejectAll}>
          Reject All
        </button>
        <button className="button secondary" type="button" onClick={exportDocx} disabled={exporting}>
          {exporting ? <span className="spinner" /> : 'Export'}
        </button>
      </header>

      <main className="workspace">
        <section className="config-panel" aria-label="Runtime configuration">
          <div>
            <span>SuperDoc</span>
            <strong>1.42.0</strong>
          </div>
          <div>
            <span>comments.displayMode</span>
            <strong>inline</strong>
          </div>
          <div>
            <span>tracked changes</span>
            <strong>inline compact popovers</strong>
          </div>
          <div>
            <span>comments sidebar</span>
            <strong>{comments.length} standalone comments</strong>
          </div>
          <div>
            <span>overlap click behavior</span>
            <strong>focus inline popover + comment</strong>
          </div>
          <div>
            <span>contentControls.chrome</span>
            <strong>none</strong>
          </div>
          <div>
            <span>documentMode</span>
            <strong>{mode}</strong>
          </div>
        </section>

        <section ref={containerRef} className="editor-host" aria-label="SuperDoc editor" />

        <aside className="comments-panel" aria-label="Comments sidebar">
          <div className="comments-panel__header">
            <div>
              <h2>Comments</h2>
              <span>Tracked changes stay inline</span>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => controllerRef.current?.refreshComments()}
              aria-label="Refresh comments"
            >
              ↻
            </button>
          </div>

          {activeTrackText && (
            <div className="focus-note">
              <strong>Inline change selected</strong>
              <span>{activeTrackText}</span>
            </div>
          )}

          <div className="comments-list">
            {comments.length === 0 && <div className="empty-comments">No standalone comments found.</div>}
            {comments.map((comment, index) => {
              const isActive = activeCommentIds.includes(comment.id);
              return (
                <article
                  className={`comment-card${isActive ? ' is-active' : ''}`}
                  data-sidebar-comment-id={comment.id}
                  key={comment.id || `comment-${index}`}
                  onClick={() => focusComment(comment)}
                >
                  <div className="comment-avatar">{comment.author.slice(0, 1).toUpperCase()}</div>
                  <div className="comment-content">
                    <div className="comment-meta">
                      <strong>{comment.author}</strong>
                      {comment.id.startsWith('imported-') && <span>Imported</span>}
                      {comment.createdTime && <time>{formatCommentDate(comment.createdTime)}</time>}
                    </div>
                    {comment.anchoredText && <p className="comment-anchor">{comment.anchoredText}</p>}
                    {comment.text ? (
                      <p>{comment.text}</p>
                    ) : (
                      <p>
                        <em>{comment.id.startsWith('imported-') ? 'No comment text' : 'New comment'}</em>
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
