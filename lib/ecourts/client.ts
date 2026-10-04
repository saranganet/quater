import {
  ECourtsCaseDetailResponse,
  ECourtsRefreshResponse,
} from "./types";

export class ECourtsAPIError extends Error {
  statusCode: number;
  errorCode: string;
  details?: unknown;

  constructor(message: string, statusCode: number, errorCode: string, details?: unknown) {
    super(message);
    this.name = "ECourtsAPIError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export interface ECourtsClientConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class ECourtsClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config?: ECourtsClientConfig) {
    this.apiKey = (config?.apiKey || process.env.ECOURTS_API_KEY || "").trim();
    this.baseUrl = (config?.baseUrl || "https://webapi.ecourtsindia.com").replace(/\/$/, "");
    this.timeoutMs = config?.timeoutMs || 25000;
    this.maxRetries = config?.maxRetries ?? 3;
  }

  /**
   * Helper to sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Makes an authenticated HTTP request with retry handling, 429 backoff, and timeouts
   */
  private async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST";
      body?: unknown;
      retryCount?: number;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, retryCount = 0 } = options;

    if (!this.apiKey) {
      // If no API key configured, provide a clear instructional error
      throw new ECourtsAPIError(
        "ECOURTS_API_KEY environment variable is missing. Please set your eCourts Partner API key in .env or configure ECOURTS_API_KEY.",
        401,
        "MISSING_API_KEY"
      );
    }

    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 429 Too Many Requests / Rate Limits
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 5;
        const delayMs = Math.min(Math.max(retryAfterSeconds, 2) * 1000, 30000);

        if (retryCount < this.maxRetries) {
          console.warn(`[eCourts] 429 Rate limited. Retrying after ${delayMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
          await this.sleep(delayMs);
          return this.request<T>(endpoint, { method, body, retryCount: retryCount + 1 });
        } else {
          throw new ECourtsAPIError(
            `eCourts rate limit exceeded. Please wait ${retryAfterSeconds} seconds before retrying.`,
            429,
            "RATE_LIMIT_EXCEEDED"
          );
        }
      }

      // Handle other non-2xx statuses
      if (!response.ok) {
        let errJson: any = null;
        try {
          errJson = await response.json();
        } catch {
          // Non-JSON response
        }

        const errorCode = errJson?.error?.code || `HTTP_${response.status}`;
        const errorMsg =
          errJson?.error?.message ||
          (response.status === 404
            ? "Case not found in eCourts registry"
            : response.status === 401
            ? "Invalid or expired eCourts API key"
            : response.status === 402
            ? "Insufficient eCourts API credits or active subscription required"
            : response.status === 400
            ? "Invalid CNR format or invalid request parameter"
            : response.status >= 500
            ? "eCourts upstream server error. The judicial portal may be temporarily unavailable."
            : `eCourts API error: ${response.statusText}`);

        // Retry on 5xx server errors with exponential backoff
        if (response.status >= 500 && retryCount < this.maxRetries) {
          const backoffMs = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
          console.warn(`[eCourts] ${response.status} Server error. Backing off for ${backoffMs}ms`);
          await this.sleep(backoffMs);
          return this.request<T>(endpoint, { method, body, retryCount: retryCount + 1 });
        }

        throw new ECourtsAPIError(errorMsg, response.status, errorCode, errJson?.error?.details);
      }

      const json = (await response.json()) as T;
      return json;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof ECourtsAPIError) {
        throw err;
      }

      if ((err as Error)?.name === "AbortError") {
        throw new ECourtsAPIError(
          `Request to eCourts timed out after ${this.timeoutMs / 1000}s.`,
          408,
          "REQUEST_TIMEOUT"
        );
      }

      throw new ECourtsAPIError(
        `Network error connecting to eCourts: ${(err as Error)?.message || "Unknown error"}`,
        500,
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Retrieves complete case details for a given CNR
   * GET /api/partner/case/{cnr}
   */
  async getCase(cnr: string): Promise<ECourtsCaseDetailResponse> {
    const cleanCnr = cnr.trim().toUpperCase();
    return this.request<ECourtsCaseDetailResponse>(`/api/partner/case/${encodeURIComponent(cleanCnr)}`, {
      method: "GET",
    });
  }

  /**
   * Triggers an asynchronous fresh scrape from official eCourts source
   * POST /api/partner/case/{cnr}/refresh
   */
  async refreshCase(cnr: string): Promise<ECourtsRefreshResponse> {
    const cleanCnr = cnr.trim().toUpperCase();
    return this.request<ECourtsRefreshResponse>(`/api/partner/case/${encodeURIComponent(cleanCnr)}/refresh`, {
      method: "POST",
    });
  }

  /**
   * Polls GET /api/partner/case/{cnr} after triggering a refresh.
   * Handles delay, exponential backoff, and maximum wait time.
   */
  async pollCaseRefresh(
    cnr: string,
    options: {
      initialDelayMs?: number;
      maxWaitMs?: number;
      intervalMs?: number;
      previousHash?: string;
    } = {}
  ): Promise<ECourtsCaseDetailResponse> {
    const {
      initialDelayMs = 5000,
      maxWaitMs = 30000,
      intervalMs = 4000,
    } = options;

    // Initial wait before polling (per eCourts docs recommendation: 5-10 seconds)
    await this.sleep(initialDelayMs);

    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitMs) {
      attempt++;
      try {
        const caseDetail = await this.getCase(cnr);
        if (caseDetail?.data?.courtCaseData) {
          return caseDetail;
        }
      } catch (err: unknown) {
        // If 404 on initial polls, case may still be syncing
        if (err instanceof ECourtsAPIError && err.statusCode === 404 && attempt < 3) {
          // wait and continue polling
        } else if (err instanceof ECourtsAPIError && err.statusCode === 429) {
          await this.sleep(intervalMs * 1.5);
          continue;
        } else {
          throw err;
        }
      }

      // Backoff interval
      const delay = Math.min(intervalMs + attempt * 1000, 10000);
      await this.sleep(delay);
    }

    // Fallback: make one last attempt
    return this.getCase(cnr);
  }
}

/**
 * Shared singleton instance configured from environment
 */
export const ecourtsClient = new ECourtsClient();
