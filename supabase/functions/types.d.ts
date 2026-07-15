// Ambient types for Supabase edge functions so this Deno code doesn't light
// up with errors in a Node-configured editor. At runtime the real Deno
// globals and npm: specifiers are provided by the edge runtime; this file is
// excluded from the app's tsconfig along with the rest of supabase/functions.

declare const Deno: {
  serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
  env: {
    get(name: string): string | undefined;
  };
};

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:web-push@3" {
  interface PushSubscriptionPayload {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  const webpush: {
    setVapidDetails(
      subject: string,
      publicKey: string,
      privateKey: string,
    ): void;
    sendNotification(
      subscription: PushSubscriptionPayload,
      payload?: string,
    ): Promise<unknown>;
  };
  export default webpush;
}
