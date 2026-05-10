/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
}
