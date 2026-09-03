SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'zoe-search-index-hourly'),
  schedule := '*/10 * * * *'
);