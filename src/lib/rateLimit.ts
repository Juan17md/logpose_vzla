import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _chatRateLimit: Ratelimit | null = null;
let _authRateLimit: Ratelimit | null = null;
let _namiDailyLimit: Ratelimit | null = null;

function crearRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export function obtenerChatRateLimit(): Ratelimit {
  if (!_chatRateLimit) {
    _chatRateLimit = new Ratelimit({
      redis: crearRedis(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      analytics: true,
      prefix: "logpose:chat",
    });
  }
  return _chatRateLimit;
}

export function obtenerAuthRateLimit(): Ratelimit {
  if (!_authRateLimit) {
    _authRateLimit = new Ratelimit({
      redis: crearRedis(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
      prefix: "logpose:auth",
    });
  }
  return _authRateLimit;
}

export function obtenerNamiDailyLimit(): Ratelimit {
  if (!_namiDailyLimit) {
    _namiDailyLimit = new Ratelimit({
      redis: crearRedis(),
      limiter: Ratelimit.slidingWindow(15, "1 d"),
      analytics: true,
      prefix: "logpose:nami:daily",
    });
  }
  return _namiDailyLimit;
}