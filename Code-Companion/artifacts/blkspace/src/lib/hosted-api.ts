import { createHttpAuthHeader } from "@/lib/auth";

export async function hostedPost(
  url: string,
  input: unknown,
): Promise<Response> {
  const body = JSON.stringify(input);
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: createHttpAuthHeader(url, "POST", body),
    },
    body,
  });
}
