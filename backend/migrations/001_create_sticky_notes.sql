-- Migration 001: Create sticky_notes table
-- Sticky Notes are small pieces of supplementary information
-- associated with a specific main note.

CREATE TABLE IF NOT EXISTS public.sticky_notes (
    id          SERIAL PRIMARY KEY,
    note_id     INTEGER NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup of sticky notes by note_id
CREATE INDEX IF NOT EXISTS idx_sticky_notes_note_id ON public.sticky_notes(note_id);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_sticky_notes_created_at ON public.sticky_notes(created_at);
