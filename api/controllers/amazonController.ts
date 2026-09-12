import { Request, Response } from "express";
import axios from "axios";
import bigquery from "../config/db";

/**
 * The page the seller lands back on once the callback is done.
 *
 * The callback is opened by Amazon, not by our SPA, so a
 * redirect is the only way to report the outcome back to the
 * user. This is the public Amazon connect route in the
 * frontend router.
 */
const FRONTEND_RETURN_PATH = "/amazon/login";

/**
 * ============================================================
 * Build the frontend return URL
 * ============================================================
 *
 * FRONTEND_URL is stored with a trailing slash, so it is
 * trimmed here to avoid a double slash in the redirect.
 */
function frontendReturnUrl(params: string | string[][] | Record<string, string> | URLSearchParams | undefined) {
  const base = String(process.env.FRONTEND_URL || "")
    .trim()
    .replace(/\/+$/, "");

  const query = new URLSearchParams(params).toString();

  return `${base}${FRONTEND_RETURN_PATH}?${query}`;
}

interface ErrorResponseOptions {
  status: number;
  reason: string;
  error: string;
  details?: any;
}

/**
 * ============================================================
 * Respond to a failed callback
 * ============================================================
 *
 * Amazon opens the callback in the seller's browser, so a GET
 * has to redirect back to the app. A POST is an API call and
 * still gets JSON.
 */
function respondWithError(
  req: Request,
  res: Response,
  { status, reason, error, details }: ErrorResponseOptions
) {
  if (req.method === "POST") {
    return res.status(status).json({
      success: false,
      error,
      details: details || undefined,
    });
  }

  if (!String(process.env.FRONTEND_URL || "").trim()) {
    console.error(
      "[amazon/callback] FRONTEND_URL is not configured, cannot redirect"
    );

    return res.status(status).json({
      success: false,
      error,
      details: details || undefined,
    });
  }

  return res.redirect(
    frontendReturnUrl({
      amazon: "error",
      reason,
    })
  );
}

/**
 * ============================================================
 * Parse Amazon OAuth state
 * ============================================================
 *
 * Seller:
 *   eqrev@2026fhr:seller
 *
 * Vendor:
 *   eqrev@2026fhr:vendor
 */
function parseOAuthState(state) {
  if (!state) {
    return {
      prefixState: "",
      accountIdentifier: "",
    };
  }

  const raw = String(state).trim();

  const lastColonIndex = raw.lastIndexOf(":");

  if (lastColonIndex === -1) {
    return {
      prefixState: raw,
      accountIdentifier: "",
    };
  }

  const prefixState = raw
    .substring(0, lastColonIndex)
    .trim();

  const accountIdentifier = raw
    .substring(lastColonIndex + 1)
    .trim()
    .toLowerCase();

  return {
    prefixState,
    accountIdentifier,
  };
}

/**
 * ============================================================
 * Validate OAuth state
 * ============================================================
 *
 * Both Seller and Vendor currently use:
 *
 * AMAZON_STATE=eqrev@2026fhr
 */
function validateOAuthState(
  prefixState,
  accountIdentifier
) {
  const expectedState = String(
    process.env.AMAZON_STATE || ""
  ).trim();

  if (!expectedState) {
    console.error(
      "[amazon/callback] AMAZON_STATE is not configured"
    );

    return false;
  }

  if (
    accountIdentifier !== "seller" &&
    accountIdentifier !== "vendor"
  ) {
    return false;
  }

  return prefixState === expectedState;
}

/**
 * ============================================================
 * Get selected Amazon SP-API application ID
 * ============================================================
 *
 * IMPORTANT:
 *
 * This is the value that will be stored in BigQuery
 * as `client_id`.
 *
 * Seller:
 *   AMAZON_SELLER_APP_ID
 *
 * Vendor:
 *   AMAZON_VENDOR_APP_ID
 *
 * The env var name is returned alongside the value so a
 * misconfiguration names the exact variable that is missing.
 */
function getSelectedApplicationId(accountIdentifier) {
  if (
    accountIdentifier !== "seller" &&
    accountIdentifier !== "vendor"
  ) {
    return {
      applicationId: "",
      envVarName: "",
    };
  }

  const envVarName =
    accountIdentifier === "vendor"
      ? "AMAZON_VENDOR_APP_ID"
      : "AMAZON_SELLER_APP_ID";

  return {
    applicationId: String(
      process.env[envVarName] || ""
    ).trim(),

    envVarName,
  };
}

/**
 * ============================================================
 * Get common Amazon LWA credentials
 * ============================================================
 *
 * These are NOT the same as the SP-API application IDs above.
 *
 * These credentials are used only for:
 *
 * spapi_oauth_code -> refresh_token
 */
function getLwaCredentials() {
  return {
    clientId: String(
      process.env.AMAZON_CLIENT_ID || ""
    ).trim(),

    clientSecret: String(
      process.env.AMAZON_CLIENT_SECRET || ""
    ).trim(),

    redirectUri: String(
      process.env.AMAZON_REDIRECT_URI || ""
    ).trim(),
  };
}

/**
 * ============================================================
 * Exchange Amazon authorization code for tokens
 * ============================================================
 */
async function exchangeAmazonCode({
  authorizationCode,
  clientId,
  clientSecret,
  redirectUri,
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString();

  const response = await axios.post(
    "https://api.amazon.com/auth/o2/token",
    body,
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded;charset=UTF-8",
      },

      timeout: 30000,
    }
  );

  return response.data;
}

/**
 * ============================================================
 * Save Amazon authorization in BigQuery
 * ============================================================
 *
 * BigQuery columns:
 *
 * refresh_token
 * client_id
 * account_identifier
 * selling_partner_id
 * created_at
 *
 * client_id = selected SP-API application ID
 *
 * Example:
 *
 * Seller:
 *   amzn1.sp.solution.cfa5c707...
 *
 * Vendor:
 *   amzn1.sp.solution.dc6747e9...
 *
 * created_at is generated by BigQuery.
 *
 * Existing account:
 *   refresh_token + client_id are updated
 *
 * New account:
 *   new row is inserted
 */
async function saveAmazonToken({
  refreshToken,
  clientId,
  accountIdentifier,
  sellingPartnerId,
}) {
  const projectId = String(
    process.env.BIGQUERY_PROJECT_ID || ""
  ).trim();

  if (!projectId) {
    throw new Error(
      "BIGQUERY_PROJECT_ID is not configured"
    );
  }

  if (!refreshToken) {
    throw new Error(
      "refreshToken is required"
    );
  }

  if (!clientId) {
    throw new Error(
      "clientId is required"
    );
  }

  if (!accountIdentifier) {
    throw new Error(
      "accountIdentifier is required"
    );
  }

  if (!sellingPartnerId) {
    throw new Error(
      "sellingPartnerId is required"
    );
  }

  /**
   * The legacy rows in this table carry a NULL
   * selling_partner_id (and sometimes a NULL
   * account_identifier). `=` is NULL-unsafe in BigQuery, so a
   * plain comparison never matches those rows and every
   * re-authorization would append a duplicate instead of
   * updating. IFNULL on the target side keeps the match
   * deterministic.
   */
  const query = `
    MERGE \`${projectId}.accounts.amazon_seller_tokens\` AS target

    USING (
      SELECT
        @refresh_token AS refresh_token,
        @client_id AS client_id,
        @account_identifier AS account_identifier,
        @selling_partner_id AS selling_partner_id,
        CURRENT_TIMESTAMP() AS created_at
    ) AS source

    ON IFNULL(target.selling_partner_id, '') = source.selling_partner_id
       AND IFNULL(target.account_identifier, '') = source.account_identifier

    WHEN MATCHED THEN
      UPDATE SET
        refresh_token = source.refresh_token,
        client_id = source.client_id,
        created_at = source.created_at

    WHEN NOT MATCHED THEN
      INSERT (
        refresh_token,
        client_id,
        account_identifier,
        selling_partner_id,
        created_at
      )
      VALUES (
        source.refresh_token,
        source.client_id,
        source.account_identifier,
        source.selling_partner_id,
        source.created_at
      )
  `;

  await bigquery.query({
    query,

    params: {
      refresh_token: String(refreshToken),
      client_id: String(clientId),
      account_identifier: String(accountIdentifier),
      selling_partner_id: String(sellingPartnerId),
    },

    types: {
      refresh_token: "STRING",
      client_id: "STRING",
      account_identifier: "STRING",
      selling_partner_id: "STRING",
    },
  });
}

/**
 * ============================================================
 * Amazon OAuth callback
 * ============================================================
 *
 * Amazon calls:
 *
 * GET /amazon/callback
 *
 * Example:
 *
 * /amazon/callback
 *   ?spapi_oauth_code=XXXXX
 *   &selling_partner_id=AXXXXXXXXX
 *   &state=eqrev%402026fhr%3Aseller
 */
export const handleAmazonCallback = async (req: Request, res: Response) => {
  try {
    /**
     * --------------------------------------------------------
     * Read callback parameters
     * --------------------------------------------------------
     */
    const payload = {
      ...(req.query || {}),
      ...(req.body || {}),
    };

    const state = payload.state
      ? String(payload.state).trim()
      : "";

    const sellingPartnerId = payload.selling_partner_id
      ? String(payload.selling_partner_id).trim()
      : "";

    const spapiOAuthCode = payload.spapi_oauth_code
      ? String(payload.spapi_oauth_code).trim()
      : "";

    /**
     * --------------------------------------------------------
     * Consent declined / rejected by Amazon
     * --------------------------------------------------------
     *
     * Amazon redirects back with `error` instead of
     * `spapi_oauth_code`. Surfacing that verbatim is far more
     * useful than the generic "Missing spapi_oauth_code".
     */
    if (payload.error) {
      const amazonError = String(payload.error).trim();

      const amazonErrorDescription = payload.error_description
        ? String(payload.error_description).trim()
        : "";

      console.error(
        "[amazon/callback] Authorization rejected by Amazon:",
        {
          error: amazonError,
          description: amazonErrorDescription,
        }
      );

      return respondWithError(req, res, {
        status: 400,
        reason: amazonError,
        error: amazonError,
        details: amazonErrorDescription,
      });
    }

    /**
     * --------------------------------------------------------
     * Validate required Amazon parameters
     * --------------------------------------------------------
     */
    if (!state) {
      return respondWithError(req, res, {
        status: 400,
        reason: "missing_state",
        error: "Missing Amazon OAuth state",
      });
    }

    if (!sellingPartnerId) {
      return respondWithError(req, res, {
        status: 400,
        reason: "missing_selling_partner_id",
        error: "Missing selling_partner_id",
      });
    }

    if (!spapiOAuthCode) {
      return respondWithError(req, res, {
        status: 400,
        reason: "missing_oauth_code",
        error: "Missing spapi_oauth_code",
      });
    }

    /**
     * --------------------------------------------------------
     * Parse state
     * --------------------------------------------------------
     */
    const {
      prefixState,
      accountIdentifier,
    } = parseOAuthState(state);

    console.log(
      "[amazon/callback] OAuth request:",
      {
        accountIdentifier,
        sellingPartnerId,
        prefixState,
      }
    );

    /**
     * --------------------------------------------------------
     * Validate state BEFORE token exchange
     * --------------------------------------------------------
     */
    const isValidState = validateOAuthState(
      prefixState,
      accountIdentifier
    );

    if (!isValidState) {
      console.error(
        "[amazon/callback] Invalid OAuth state:",
        {
          receivedState: state,
          prefixState,
          accountIdentifier,
        }
      );

      return respondWithError(req, res, {
        status: 400,
        reason: "invalid_state",
        error: "Invalid Amazon OAuth state",
      });
    }

    /**
     * --------------------------------------------------------
     * Get selected SP-API application ID
     * --------------------------------------------------------
     *
     * THIS is the client_id that will be stored in DB.
     */
    const {
      applicationId: selectedApplicationId,
      envVarName: applicationEnvVar,
    } = getSelectedApplicationId(accountIdentifier);

    if (!selectedApplicationId) {
      console.error(
        `[amazon/callback] No SP-API application ID configured for ${accountIdentifier}. Set ${applicationEnvVar} in the backend environment.`
      );

      return respondWithError(req, res, {
        status: 500,
        reason: "app_not_configured",
        error:
          `Amazon ${accountIdentifier} application ID is not configured`,
        details: `Set ${applicationEnvVar} in the backend environment`,
      });
    }

    /**
     * --------------------------------------------------------
     * Get LWA credentials
     * --------------------------------------------------------
     *
     * Used only to exchange the Amazon authorization code.
     */
    const {
      clientId: lwaClientId,
      clientSecret: lwaClientSecret,
      redirectUri,
    } = getLwaCredentials();

    if (!lwaClientId) {
      return respondWithError(req, res, {
        status: 500,
        reason: "lwa_not_configured",
        error: "Amazon LWA client ID is not configured",
      });
    }

    if (!lwaClientSecret) {
      return respondWithError(req, res, {
        status: 500,
        reason: "lwa_not_configured",
        error: "Amazon LWA client secret is not configured",
      });
    }

    if (!redirectUri) {
      return respondWithError(req, res, {
        status: 500,
        reason: "redirect_uri_not_configured",
        error: "Amazon redirect URI is not configured",
      });
    }

    console.log(
      "[amazon/callback] Configuration:",
      {
        accountIdentifier,
        selectedApplicationId,
        sellingPartnerId,
        redirectUri,
      }
    );

    /**
     * --------------------------------------------------------
     * Exchange authorization code
     * --------------------------------------------------------
     */
    console.log(
      `[amazon/callback] Exchanging authorization code for ${accountIdentifier}`
    );

    const tokens = await exchangeAmazonCode({
      authorizationCode: spapiOAuthCode,

      // LWA credentials are used for token exchange.
      clientId: lwaClientId,
      clientSecret: lwaClientSecret,

      redirectUri,
    });

    /**
     * --------------------------------------------------------
     * Get refresh token returned by Amazon
     * --------------------------------------------------------
     */
    const refreshToken = tokens?.refresh_token;

    if (!refreshToken) {
      console.error(
        "[amazon/callback] Amazon did not return refresh_token"
      );

      return respondWithError(req, res, {
        status: 500,
        reason: "no_refresh_token",
        error: "Amazon did not return a refresh token",
      });
    }

    /**
     * --------------------------------------------------------
     * Save everything to BigQuery
     * --------------------------------------------------------
     *
     * client_id:
     *   selected SP-API application ID
     *
     * refresh_token:
     *   returned by Amazon
     *
     * account_identifier:
     *   seller / vendor
     *
     * selling_partner_id:
     *   returned by Amazon for selected account
     *
     * created_at:
     *   generated by BigQuery
     */
    try {
      await saveAmazonToken({
        refreshToken,

        // IMPORTANT:
        // This is the selected Seller/Vendor SP-API application ID.
        clientId: selectedApplicationId,

        accountIdentifier,

        // IMPORTANT:
        // This is the Amazon account selected by the user.
        sellingPartnerId,
      });
    } catch (storageError) {
      // The token exchange already succeeded at this point, so
      // reporting this as an exchange failure would send anyone
      // debugging it to the wrong place.
      console.error(
        "[amazon/callback] Failed to store Amazon token:",
        storageError.message
      );

      return respondWithError(req, res, {
        status: 500,
        reason: "storage_failed",
        error: "Failed to store Amazon token",
        details: storageError.message,
      });
    }

    console.log(
      "[amazon/callback] Amazon token stored successfully:",
      {
        accountIdentifier,
        selectedApplicationId,
        sellingPartnerId,
      }
    );

    /**
     * --------------------------------------------------------
     * Response for POST
     * --------------------------------------------------------
     */
    if (req.method === "POST") {
      return res.status(200).json({
        success: true,
        message:
          "Amazon authorization successful and token stored",

        data: {
          client_id: selectedApplicationId,
          account_identifier: accountIdentifier,
          selling_partner_id: sellingPartnerId,
        },
      });
    }

    /**
     * --------------------------------------------------------
     * Response for Amazon browser callback
     * --------------------------------------------------------
     *
     * Amazon opened this in the seller's browser, so send them
     * back to the EQ-REV connect page with the outcome.
     */
    return res.redirect(
      frontendReturnUrl({
        amazon: "success",
        account_type: accountIdentifier,
        selling_partner_id: sellingPartnerId,
      })
    );
  } catch (error) {
    console.error(
      "[amazon/callback] Amazon OAuth failed:",
      error.response?.data || error.message
    );

    return respondWithError(req, res, {
      status: 500,
      reason: "exchange_failed",
      error: "Amazon authorization failed",
      details:
        error.response?.data || error.message,
    });
  }
};
