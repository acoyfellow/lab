-- Stories table for trace narratives
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  status TEXT DEFAULT 'in-progress', -- in-progress, completed, failed, approved
  visibility TEXT DEFAULT 'private', -- private, team, public
  tags TEXT -- JSON array
);

-- Story chapters linking traces to stories
CREATE TABLE IF NOT EXISTS story_chapters (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  trace_id TEXT NOT NULL,
  title TEXT,
  summary TEXT, -- LLM-generated
  decision_point TEXT, -- JSON { question, options, chosen, reasoning }
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- Indexes for story queries
CREATE INDEX IF NOT EXISTS idx_story_chapters_story ON story_chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
CREATE INDEX IF NOT EXISTS idx_stories_created_by ON stories(created_by);
CREATE INDEX IF NOT EXISTS idx_story_chapters_trace ON story_chapters(trace_id);
