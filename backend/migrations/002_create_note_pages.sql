-- Migration 002: Create note_pages table and migrate sticky_notes to page-based
-- This migration:
--   1. Creates the note_pages table
--   2. Migrates existing note content into page 1 of note_pages
--   3. Adds page_id to sticky_notes
--   4. Migrates existing sticky notes to point to page 1 of their note
--   5. Drops the old note_id from sticky_notes

BEGIN;

-- ─── 1. CREATE NOTE_PAGES TABLE ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.note_pages (
    id          SERIAL PRIMARY KEY,
    note_id     INTEGER NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_note_pages_note_id ON public.note_pages(note_id);
CREATE INDEX IF NOT EXISTS idx_note_pages_note_page ON public.note_pages(note_id, page_number);

-- ─── 2. MIGRATE EXISTING NOTE CONTENT INTO PAGES ───────────────

INSERT INTO public.note_pages (note_id, page_number, content, created_at, updated_at)
SELECT id, 1, COALESCE(content, ''), created_at, updated_at
FROM public.notes
ON CONFLICT DO NOTHING;

-- ─── 3. ADD PAGE_ID TO STICKY_NOTES ────────────────────────────

ALTER TABLE public.sticky_notes
    ADD COLUMN IF NOT EXISTS page_id INTEGER;

-- ─── 4. MIGRATE EXISTING STICKY NOTES TO PAGE 1 ────────────────

UPDATE public.sticky_notes sn
SET page_id = np.id
FROM public.note_pages np
WHERE sn.note_id = np.note_id
  AND np.page_number = 1
  AND sn.page_id IS NULL;

-- ─── 5. MAKE PAGE_ID NOT NULL AND ADD FOREIGN KEY ──────────────

ALTER TABLE public.sticky_notes
    ALTER COLUMN page_id SET NOT NULL;

ALTER TABLE public.sticky_notes
    ADD CONSTRAINT sticky_notes_page_id_fkey
    FOREIGN KEY (page_id) REFERENCES public.note_pages(id) ON DELETE CASCADE;

-- ─── 6. DROP OLD NOTE_ID FROM STICKY_NOTES ─────────────────────

ALTER TABLE public.sticky_notes
    DROP CONSTRAINT IF EXISTS sticky_notes_note_id_fkey;

ALTER TABLE public.sticky_notes
    DROP COLUMN IF EXISTS note_id;

-- ─── 7. UPDATE INDEXES ─────────────────────────────────────────

DROP INDEX IF EXISTS idx_sticky_notes_note_id;

CREATE INDEX IF NOT EXISTS idx_sticky_notes_page_id ON public.sticky_notes(page_id);

COMMIT;
