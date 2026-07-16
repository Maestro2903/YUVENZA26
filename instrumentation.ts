/**
 * Vercel tracing + production error instrumentation (Next.js loads this file
 * automatically - no next.config changes needed).
 *
 * - register(): OpenTelemetry via @vercel/otel. Vercel auto-collects
 *   infrastructure and fetch spans; view them with Session Tracing (Vercel
 *   toolbar -> Tracing) or `vercel curl --trace <path>` + `vercel traces get`.
 *   Available on all plans (1M spans/month per team).
 *
 * - onRequestError(): Next.js server-error hook. Emits ONE structured JSON
 *   line per uncaught request error so production issues are queryable in
 *   Vercel runtime logs, e.g.:
 *     vercel logs --environment production --query '"yuvenza.request-error"' --since 1h
 */
import { registerOTel } from "@vercel/otel";
import type { Instrumentation } from "next";

export function register() {
  registerOTel({ serviceName: "yuvenza" });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      tag: "yuvenza.request-error",
      message: err.message,
      digest: (err as { digest?: string }).digest,
      name: err.name,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      // Stack first lines only - runtime logs truncate long messages.
      stack: err.stack?.split("\n").slice(0, 6).join(" | "),
    })
  );
};
