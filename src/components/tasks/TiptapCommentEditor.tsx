'use client'

import { useEditor, EditorContent, ReactRenderer, type Editor } from '@tiptap/react'
import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import type { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

// ─── Shared extension config for rendering (no suggestion needed for read-only) ─

const RENDER_EXTENSIONS = [
  StarterKit,
  Mention.configure({
    HTMLAttributes: { class: 'mention' },
    renderHTML({ node }) { return ['span', { class: 'mention' }, `@${node.attrs.label}`] },
  }),
]

// ─── Mention suggestion list ──────────────────────────────────────────────────

interface MentionListProps {
  items: Profile[]
  command: (item: { id: string; label: string }) => void
}

interface MentionListHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList(
  { items, command },
  ref
) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) command({ id: item.id, label: item.full_name ?? item.email })
    },
    [items, command]
  )

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }: { event: KeyboardEvent }) {
      if (event.key === 'ArrowUp') { setSelectedIndex((i) => (i + items.length - 1) % items.length); return true }
      if (event.key === 'ArrowDown') { setSelectedIndex((i) => (i + 1) % items.length); return true }
      if (event.key === 'Enter') { selectItem(selectedIndex); return true }
      return false
    },
  }))

  useEffect(() => setSelectedIndex(0), [items])

  if (!items.length) return null

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#e5e2e1] py-1 min-w-[180px] overflow-hidden">
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={cn(
            'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors',
            index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-[#1c1b1b] hover:bg-[#f6f3f2]'
          )}
        >
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            {(item.full_name ?? item.email ?? '?')[0].toUpperCase()}
          </div>
          {item.full_name ?? item.email}
        </button>
      ))}
    </div>
  )
})

// ─── Shared suggestion renderer (avoids stale closure via ref) ───────────────

function buildMentionSuggestion(usersRef: React.MutableRefObject<Profile[]>) {
  return {
    items: ({ query }: { query: string }) => {
      const q = query.toLowerCase()
      return usersRef.current
        .filter((u) => (u.full_name ?? u.email ?? '').toLowerCase().includes(q))
        .slice(0, 8)
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle, MentionListProps>
      let popup: HTMLDivElement

      return {
        onStart(props: SuggestionProps) {
          component = new ReactRenderer(MentionList, {
            props: props as unknown as MentionListProps,
            editor: props.editor,
          })
          popup = document.createElement('div')
          popup.style.cssText = 'position:fixed;z-index:9999'
          document.body.appendChild(popup)
          popup.appendChild(component.element)
          updatePosition(props, popup)
        },
        onUpdate(props: SuggestionProps) {
          component.updateProps(props as unknown as MentionListProps)
          updatePosition(props, popup)
        },
        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') { popup.remove(); return true }
          return component.ref?.onKeyDown(props) ?? false
        },
        onExit() {
          popup?.remove()
          component?.destroy()
        },
      }
    },
  }
}

// ─── Tiptap read-only renderer ────────────────────────────────────────────────

export function CommentRenderer({ content }: { content: string }) {
  let html: string
  try {
    html = generateHTML(JSON.parse(content), RENDER_EXTENSIONS)
  } catch {
    html = content
  }
  return (
    <div
      className="tiptap-content text-sm text-[#434655] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ─── Tiptap inline editor (single-line, Enter to submit, supports @mentions) ──

interface TiptapInlineEditorProps {
  users: Profile[]
  onSubmit: (content: string) => void
  placeholder?: string
}

export function TiptapInlineEditor({ users, onSubmit, placeholder = 'Add item… (@ to mention)' }: TiptapInlineEditorProps) {
  const usersRef = useRef(users)
  useEffect(() => { usersRef.current = users }, [users])

  const submitRef = useRef(onSubmit)
  useEffect(() => { submitRef.current = onSubmit }, [onSubmit])

  const editorRef = useRef<Editor | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderHTML({ node }) { return ['span', { class: 'mention' }, `@${node.attrs.label}`] },
        suggestion: buildMentionSuggestion(usersRef),
      }),
    ],
    editorProps: {
      attributes: { class: 'outline-none text-sm text-[#1c1b1b] min-w-0 py-0.5' },
      handleKeyDown(_, event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          const ed = editorRef.current
          if (!ed || ed.isEmpty) return false
          submitRef.current(JSON.stringify(ed.getJSON()))
          ed.commands.clearContent()
          return true
        }
        return false
      },
    },
    onUpdate({ editor: ed }) { setIsEmpty(ed.isEmpty) },
    immediatelyRender: false,
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  return (
    <div className="flex-1 relative">
      <EditorContent editor={editor} />
      {isEmpty && (
        <div className="pointer-events-none absolute text-sm text-[#737687] top-0 left-0">
          {placeholder}
        </div>
      )}
    </div>
  )
}

// ─── Tiptap comment editor ────────────────────────────────────────────────────

interface TiptapCommentEditorProps {
  users: Profile[]
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
}

export default function TiptapCommentEditor({ users, onSubmit, placeholder = 'Add a comment… (@ to mention)' }: TiptapCommentEditorProps) {
  const [submitting, setSubmitting] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  // Fix stale closure: users may be [] on first mount; ref always holds latest
  const usersRef = useRef(users)
  useEffect(() => { usersRef.current = users }, [users])

  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderHTML({ node }) { return ['span', { class: 'mention' }, `@${node.attrs.label}`] },
        suggestion: buildMentionSuggestion(usersRef),
      }),
    ],
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[36px] max-h-[120px] overflow-y-auto text-sm text-[#1c1b1b] px-3 py-2',
      },
      handleKeyDown(_, event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          handleSubmit()
          return true
        }
        return false
      },
    },
    onUpdate({ editor: ed }) { setIsEmpty(ed.isEmpty) },
    immediatelyRender: false,
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  async function handleSubmit() {
    const ed = editorRef.current
    if (!ed || submitting || ed.isEmpty) return
    setSubmitting(true)
    try {
      await onSubmit(JSON.stringify(ed.getJSON()))
      ed.commands.clearContent()
      setIsEmpty(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 bg-[#f6f3f2] rounded-xl border border-transparent focus-within:border-blue-300 transition-colors relative">
        <EditorContent editor={editor} />
        {isEmpty && (
          <div className="pointer-events-none absolute text-sm text-[#737687] px-3 py-2 top-0 left-0">
            {placeholder}
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
      >
        {submitting ? '…' : 'Send'}
      </button>
    </div>
  )
}

function updatePosition(props: { clientRect?: (() => DOMRect | null) | null }, popup: HTMLDivElement) {
  const rect = props.clientRect?.()
  if (!rect) return
  popup.style.left = `${rect.left}px`
  popup.style.top = `${rect.bottom + 4}px`
}
