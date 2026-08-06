import { Router, Request, Response } from 'express';
import { parseMetaError } from '../utils/errorHandler';
import {
  validateToken,
  fetchPages,
  fetchInstagramAccount,
  fetchInstagramProfile,
  fetchInstagramMedia,
  fetchInstagramInsights,
} from '../utils/metaApi';

const router = Router();

// ── Validate Token ─────────────────────────────────────
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ code: 'MISSING_TOKEN', message: 'Access token is required.' });
      return;
    }
    const user = await validateToken(accessToken);
    res.json({ success: true, user });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── Fetch Pages ────────────────────────────────────────
router.post('/pages', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ code: 'MISSING_TOKEN', message: 'Access token is required.' });
      return;
    }
    const pages = await fetchPages(accessToken);
    res.json({ success: true, pages: pages.data });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── Fetch Instagram Account ───────────────────────────
router.post('/instagram-account', async (req: Request, res: Response) => {
  try {
    const { accessToken, pageId } = req.body;
    if (!accessToken || !pageId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'Access token and page ID are required.' });
      return;
    }
    const account = await fetchInstagramAccount(pageId, accessToken);
    res.json({ success: true, account });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── Fetch Instagram Profile ───────────────────────────
router.post('/instagram-profile', async (req: Request, res: Response) => {
  try {
    const { accessToken, igUserId } = req.body;
    if (!accessToken || !igUserId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' });
      return;
    }
    const profile = await fetchInstagramProfile(igUserId, accessToken);
    res.json({ success: true, profile });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── Fetch Instagram Media ─────────────────────────────
router.post('/instagram-media', async (req: Request, res: Response) => {
  try {
    const { accessToken, igUserId } = req.body;
    if (!accessToken || !igUserId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' });
      return;
    }
    const media = await fetchInstagramMedia(igUserId, accessToken);
    res.json({ success: true, media: media.data });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── Fetch Instagram Insights ──────────────────────────
router.post('/instagram-insights', async (req: Request, res: Response) => {
  try {
    const { accessToken, igUserId } = req.body;
    if (!accessToken || !igUserId) {
      res.status(400).json({ code: 'MISSING_PARAMS', message: 'Access token and Instagram user ID are required.' });
      return;
    }
    const insights = await fetchInstagramInsights(igUserId, accessToken);
    res.json({ success: true, insights: insights.data });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

// ── All-in-One Connect ────────────────────────────────
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ code: 'MISSING_TOKEN', message: 'Access token is required.' });
      return;
    }

    // Step 1: Validate token
    const user = await validateToken(accessToken);

    // Step 2: Fetch pages
    const pagesResponse = await fetchPages(accessToken);
    if (!pagesResponse.data || pagesResponse.data.length === 0) {
      res.status(404).json({
        code: 'NO_PAGES',
        message: 'No Facebook Pages found. Your account must manage at least one Facebook Page connected to an Instagram Business Account.',
      });
      return;
    }

    // Step 3: Find a page with Instagram Business Account
    let igUserId: string | null = null;
    let connectedPage = pagesResponse.data[0];

    for (const page of pagesResponse.data) {
      const accountResponse = await fetchInstagramAccount(page.id, accessToken);
      if (accountResponse.instagram_business_account) {
        igUserId = accountResponse.instagram_business_account.id;
        connectedPage = page;
        break;
      }
    }

    if (!igUserId) {
      res.status(404).json({
        code: 'NO_INSTAGRAM_ACCOUNT',
        message: 'No Instagram Business Account linked to any of your Facebook Pages. Please connect an Instagram Business or Creator account to your Facebook Page first.',
      });
      return;
    }

    // Step 4: Fetch Instagram Profile
    const profile = await fetchInstagramProfile(igUserId, accessToken);

    // Step 5: Fetch Instagram Media
    const mediaResponse = await fetchInstagramMedia(igUserId, accessToken);

    // Step 6: Fetch Instagram Insights
    const insightsResponse = await fetchInstagramInsights(igUserId, accessToken);

    // Return unified response
    res.json({
      success: true,
      data: {
        user,
        page: {
          id: connectedPage.id,
          name: connectedPage.name,
          category: connectedPage.category,
        },
        profile,
        media: mediaResponse.data,
        insights: insightsResponse.data,
      },
    });
  } catch (error) {
    const appError = parseMetaError(error);
    res.status(appError.status).json(appError);
  }
});

export default router;
