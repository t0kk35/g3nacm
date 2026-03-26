import { APIError } from "./api-error-handling";
import { toast } from "sonner";

export async function clientFetch(url: string, method: string, body: any, errorMessage: string): Promise<Response> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
        body: JSON.stringify(body),
  })

  if (!response.ok) {
    try {
      const err:APIError = await response.json();
      toast.error(`${errorMessage}. Error Code: ${err.errorCode} Error Message: ${err.message}`)
    } catch (e) {
      throw new Error(`${errorMessage}. Most likely connection problem`) 
    }
  }
  return response
}