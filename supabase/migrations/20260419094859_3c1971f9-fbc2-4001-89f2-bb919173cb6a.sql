-- Remove the persisted idle alert messages that have been re-loading on every session.
-- These were ephemeral check-in prompts that should never have been persisted.
DELETE FROM public.zoe_infinity_messages
WHERE role = 'assistant'
  AND (
    content LIKE 'Hey%are you okay%'
    OR content LIKE '%went quiet for a bit%'
    OR content LIKE 'Just checking in%'
    OR content LIKE '%still with me%'
  );