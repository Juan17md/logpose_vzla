import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "logpose:chat",
});

export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "logpose:auth",
});