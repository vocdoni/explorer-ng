// Runtime configuration hook.
//
// In Docker deployments this file is REGENERATED at container start by
// docker/entrypoint.sh, which injects VOCONE_API_URL / VOCONE_REFRESH_MS from
// the container environment. That is why runtime config takes precedence over
// build-time env in src/contexts/ApiContext.tsx.
//
// For local development it must stay empty: defining values here would pin the
// app to a hardcoded endpoint and silently override .env.
window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {}
