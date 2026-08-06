import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';

interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface AppError {
  status: number;
  code: string;
  message: string;
  details?: string;
}

export function parseMetaError(error: unknown): AppError {
  if (error instanceof AxiosError) {
    // Network errors
    if (!error.response) {
      return {
        status: 503,
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to Meta servers. Please check your internet connection and try again.',
      };
    }

    const data = error.response.data as MetaApiError;

    if (data?.error) {
      const { code, error_subcode, message } = data.error;

      // Expired or invalid token
      if (code === 190) {
        if (error_subcode === 463) {
          return {
            status: 401,
            code: 'TOKEN_EXPIRED',
            message: 'Your access token has expired. Please generate a new one from the Meta Developer Portal.',
          };
        }
        if (error_subcode === 460) {
          return {
            status: 401,
            code: 'PASSWORD_CHANGED',
            message: 'Your access token was invalidated because the password was changed. Please generate a new token.',
          };
        }
        return {
          status: 401,
          code: 'INVALID_TOKEN',
          message: 'Invalid access token. Please check your token and try again.',
          details: message,
        };
      }

      // Missing permissions
      if (code === 10 || code === 200) {
        return {
          status: 403,
          code: 'MISSING_PERMISSION',
          message: 'Missing required permissions. Ensure your token has pages_show_list, instagram_basic, and instagram_manage_insights permissions.',
          details: message,
        };
      }

      // Rate limiting
      if (code === 4 || code === 32 || code === 17) {
        return {
          status: 429,
          code: 'RATE_LIMIT',
          message: 'API rate limit reached. Please wait a moment and try again.',
          details: message,
        };
      }

      // Object doesn't exist
      if (code === 803 || code === 100) {
        return {
          status: 404,
          code: 'NOT_FOUND',
          message: 'The requested resource was not found. Please verify your account setup.',
          details: message,
        };
      }

      // Generic Meta API error
      return {
        status: error.response.status || 500,
        code: 'META_API_ERROR',
        message: message || 'An error occurred with the Meta API. Please try again.',
        details: `Error code: ${code}`,
      };
    }

    // Non-Meta API error response
    return {
      status: error.response.status || 500,
      code: 'API_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  // Unknown error
  if (error instanceof Error) {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred. Please try again.',
      details: error.message,
    };
  }

  return {
    status: 500,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  };
}

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const appError = parseMetaError(err);
  res.status(appError.status).json(appError);
}
