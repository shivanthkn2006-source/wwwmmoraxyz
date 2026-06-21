-- Cleanup: remove duplicate festival greeting messages that were repeatedly persisted to chat history.
-- Keeps the EARLIEST occurrence per user per day so the chat timeline still reflects the original moment.
DELETE FROM public.zoe_infinity_messages a
USING public.zoe_infinity_messages b
WHERE a.role = 'assistant'
  AND b.role = 'assistant'
  AND a.user_id = b.user_id
  AND a.id <> b.id
  AND DATE(a.created_at) = DATE(b.created_at)
  AND a.created_at > b.created_at
  AND (
    a.content LIKE '%Eid Mubarak%'
    OR a.content LIKE 'By the way, I''d love to remember your birthday%'
  )
  AND (
    b.content LIKE '%Eid Mubarak%'
    OR b.content LIKE 'By the way, I''d love to remember your birthday%'
  )
  AND a.content = b.content;