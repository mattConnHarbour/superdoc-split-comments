/**
 * CommentsSidebarController
 * Bi-directional sync between SuperDoc editor comments and a sidebar panel.
 */

export type SidebarComment = {
  id: string;
  author: string;
  createdTime: string;
  text: string;
  anchoredText: string;
  status: string;
  raw: any;
};

export type CommentsSidebarControllerOptions = {
  user: { name: string };
  onCommentsChange: (comments: SidebarComment[]) => void;
  onActiveCommentIdsChange: (ids: string[]) => void;
  onActiveTrackTextChange: (text: string) => void;
};

export class CommentsSidebarController {
  private textCache = new Map<string, string>();
  private anchorCache = new Map<string, string>();
  private comments: SidebarComment[] = [];
  private superdoc: any = null;
  private container: HTMLElement | null = null;
  private refreshTimer?: number;
  private user: { name: string };
  private onCommentsChange: (comments: SidebarComment[]) => void;
  private onActiveCommentIdsChange: (ids: string[]) => void;
  private onActiveTrackTextChange: (text: string) => void;

  constructor(options: CommentsSidebarControllerOptions) {
    this.user = options.user;
    this.onCommentsChange = options.onCommentsChange;
    this.onActiveCommentIdsChange = options.onActiveCommentIdsChange;
    this.onActiveTrackTextChange = options.onActiveTrackTextChange;
  }

  init(superdoc: any, container: HTMLElement) {
    this.superdoc = superdoc;
    this.container = container;
    superdoc?.activeEditor?.on?.('commentsUpdate', this.onEditorCommentSelected);
    this.scheduleRefreshComments();
  }

  destroy() {
    clearTimeout(this.refreshTimer);
    this.textCache.clear();
    this.anchorCache.clear();
    this.comments = [];
    this.superdoc = null;
    this.container = null;
  }

  // Called from SuperDoc's onCommentsUpdate config
  handleSuperdocCommentsUpdate = (e: any) => {
    if (e?.type === 'add' || e?.type === 'update') {
      const id = e?.comment?.commentId;
      if (id && e?.comment?.commentText) this.textCache.set(id, this.stripHtml(e.comment.commentText));
      if (id && (e?.comment?.selectedText || e?.comment?.anchoredText)) {
        this.anchorCache.set(id, e.comment.selectedText || e.comment.anchoredText);
      }
    }
    if (e?.type) this.scheduleRefreshComments();
  };

  refreshComments = () => {
    const items = this.superdoc?.activeEditor?.doc?.comments?.list?.({ includeResolved: true })?.items || [];
    this.comments = items.map((i: any) => this.toSidebarComment(i)).filter((c: any) => c && c.status !== 'resolved');
    this.onCommentsChange(this.comments);
  };

  scheduleRefreshComments = () => {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(this.refreshComments, 150);
  };

  // Sidebar → Editor
  focusCommentInEditor = (comment: SidebarComment) => {
    this.onActiveTrackTextChange('');
    this.onActiveCommentIdsChange([comment.id]);
    this.clearEditorHighlights();

    const sd = this.superdoc;
    if (!sd) return;

    try {
      sd.scrollToComment?.(comment.id, { behavior: 'smooth', block: 'center' });
      sd.activeEditor?.commands?.setActiveComment?.({ commentId: comment.id });
    } catch (e) {
      console.warn('scrollToComment failed:', e);
    }
  };

  // Editor → Sidebar (event handler)
  private onEditorCommentSelected = (data: any) => {
    if (data?.type !== 'selected' || !data?.activeCommentId) return;
    const match = this.comments.find((c) => c.id === data.activeCommentId);
    if (!match) return;
    this.onActiveTrackTextChange('');
    this.onActiveCommentIdsChange([match.id]);
    this.scrollSidebar(match.id);
  };

  private clearEditorHighlights() {
    this.container?.querySelectorAll('.sd-sidebar-anchor-focus').forEach((el) => {
      el.classList.remove('sd-sidebar-anchor-focus');
    });
  }

  private scrollSidebar(id: string) {
    requestAnimationFrame(() => {
      document.querySelector(`[data-sidebar-comment-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  private stripHtml(html: string): string {
    const t = document.createElement('template');
    t.innerHTML = html;
    return (t.content.textContent || html).replace(/\s+/g, ' ').trim();
  }

  private toSidebarComment(item: any): SidebarComment | null {
    const id = item?.id || item?.commentId || item?.importedId || item?.address?.commentId || '';
    if (!id || id === 'pending') return null;

    const status = item?.status || (item?.resolvedTime ? 'resolved' : 'active');
    if (status === 'deleted') return null;

    // Filter out tracked changes unless they have an explicit comment attached
    if (item?.trackedChange) {
      const hasExplicitComment = item?.commentText || item?.comment?.text || item?.comment?.body || this.textCache.has(id);
      if (!hasExplicitComment) return null;
    }

    return {
      id,
      author: item?.creatorName || item?.creator?.name || item?.user?.name || item?.importedAuthor?.name || item?.author || (id.startsWith('imported-') ? 'Unknown' : this.user.name),
      createdTime: item?.createdTime || item?.importedCreatedTime || '',
      text: this.getCommentText(item, id),
      anchoredText: this.getAnchoredText(item, id),
      status,
      raw: item,
    };
  }

  private getCommentText(item: any, id: string): string {
    if (this.textCache.has(id)) return this.textCache.get(id)!;
    const raw = item?.text || item?.commentText || item?.content || item?.body || item?.message || item?.comment?.text || item?.comment?.body || '';
    return typeof raw === 'string' ? this.stripHtml(raw) : '';
  }

  private getAnchoredText(item: any, id: string): string {
    if (this.anchorCache.has(id)) return this.anchorCache.get(id)!;
    const raw = item?.anchoredText || item?.selectedText || item?.trackedChangeText || '';
    return typeof raw === 'string' ? this.stripHtml(raw) : '';
  }
}

export const formatCommentDate = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
