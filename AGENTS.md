# Architecture rules

- Zoe's LOL uses Pollinations as its only image-generation provider, because provider consistency and cost control are product requirements.
- Scheduled and member-submitted jokes share `humor_drops`, reactions, comments, and feed rendering, because one content model prevents divergent behavior.
- Ambient joke speech is owned by one global Deepgram announcement host, because card mounts must not duplicate or prematurely mark announcements.